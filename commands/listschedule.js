const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getCache } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listschedule')
    .setDescription('📋 ดูรายการประกาศที่ตั้งเวลาไว้ (แอดมินเท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const schedules = getCache('scheduled_messages') || [];

    if (schedules.length === 0) {
      return interaction.reply({ content: '❌ ไม่พบรายการประกาศที่ตั้งเวลาไว้ในขณะนี้', flags: [MessageFlags.Ephemeral] });
    }

    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('📋 รายการประกาศอัตโนมัติที่รอดำเนินการ')
      .setDescription(`พบทั้งหมด **${schedules.length}** รายการในคิว\n\n${schedules.map((s, i) => {
        const timeStr = `<t:${Math.floor(s.executeAt / 1000)}:R>`;
        const dateStr = `<t:${Math.floor(s.executeAt / 1000)}:F>`;
        return `**${i + 1}.** 🕒 **${timeStr}** (${dateStr})\n📍 ช่อง: <#${s.channelId}>\n💬 ข้อความ: ${s.message.length > 50 ? s.message.substring(0, 50) + '...' : s.message}\n🆔 ID: \`${s.id}\`\n-------------------`;
      }).join('\n')}`)
      .setFooter({ text: 'หากต้องการลบรายการใดๆ กรุณาใช้ปุ่มด้านล่าง (เร็วๆ นี้)' })
      .setTimestamp();

    // เพื่อให้ใช้งานง่าย ผมจะเพิ่มปุ่ม "ลบ" ให้ตามลำดับ (สูงสุด 5 รายการแรกเพื่อให้ปุ่มไม่เยอะเกินไป)
    // สำหรับรายการที่เยอะกว่านั้น อาจต้องพิมพ์ ID ในคำสั่งลบ (แต่ในที่นี้ทำเป็นปุ่มตัวอย่าง 5 อัน)
    const row = new ActionRowBuilder();
    schedules.slice(0, 5).forEach((s, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`cancel_schedule_${s.id}`)
          .setLabel(`ลบรายการที่ ${i + 1}`)
          .setStyle(ButtonStyle.Danger)
      );
    });

    const options = { embeds: [embed] };
    if (schedules.length > 0 && row.components.length > 0) {
      options.components = [row];
    }

    await interaction.reply({ ...options, flags: [MessageFlags.Ephemeral] });
  }
};
