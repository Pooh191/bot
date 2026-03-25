const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🧹 ลบข้อความในแชทจำนวนมาก (Admin เท่านั้น)')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('ระบุจำนวนข้อความที่ต้องการลบ (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // หรือ Administrator ตามใจชอบ

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      
      await interaction.reply({ 
        content: `✅ ลบข้อความเรียบร้อยแล้วจำนวน **${deleted.size}** ข้อความครับ`, 
        ephemeral: true 
      });

      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(
        interaction.client,
        '🧹 ลบข้อความ (Purge)',
        `**แอดมิน:** <@${interaction.user.id}>\n**ช่อง:** <#${interaction.channelId}>\n**จำนวนที่ลบ:** ${deleted.size} ข้อความ`,
        'Orange',
        false
      );

    } catch (error) {
      console.error(error);
      return interaction.reply({ 
        content: '❌ เกิดข้อผิดพลาดในการลบข้อความ (ข้อความที่นานกว่า 14 วันจะไม่สามารถลบแบบกลุ่มได้ครับ)', 
        ephemeral: true 
      });
    }
  }
};
