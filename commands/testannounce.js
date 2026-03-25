// commands/testannounce.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testannounce')
    .setDescription('🔔 ทดสอบประกาศรายงานเศรษฐกิจ (แอดมินเท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // โหลด config
    const cfg = loadConfig();
    const channelId = cfg.econChannelId;
    if (!channelId) {
      return interaction.reply({ content: '❌ ยังไม่ได้ตั้งค่า channel รายงาน กรุณาใช้ `/seteconchannel` ก่อน', ephemeral: true });
    }

    // ดึง channel
    let channel;
    try {
      channel = await interaction.client.channels.fetch(channelId);
    } catch {
      return interaction.reply({ content: '❌ ไม่สามารถเข้าถึง channel ที่ตั้งค่าไว้ได้', ephemeral: true });
    }
    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ ช่องที่ตั้งค่าไว้ไม่รองรับข้อความ', ephemeral: true });
    }

    // สร้าง embed ประกาศทดสอบ
    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('📊 ทดสอบประกาศรายงานเศรษฐกิจ')
      .setDescription('นี่เป็นการทดสอบประกาศรายงานเศรษฐกิจไปยังช่องที่ตั้งค่าไว้')
      .setTimestamp();

    // ส่ง embed ไปยัง channel
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ ส่งประกาศทดสอบเรียบร้อยแล้ว', ephemeral: true });
  }
};
