const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('🔗 สร้างลิงก์เชิญเซิร์ฟเวอร์แบบถาวร (ไม่มีวันหมดอายุ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateInstantInvite),

  async execute(interaction) {
    try {
      const invite = await interaction.channel.createInvite({
        maxAge: 0, // 0 = never expire
        maxUses: 0, // 0 = unlimited uses
        unique: true,
        reason: `Created by admin ${interaction.user.tag}`
      });

      await interaction.reply({ 
        content: `${invite.url}`, 
        ephemeral: false 
      });

      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(
        interaction.client,
        '🔗 สร้างลิงก์เชิญ (Invite Created)',
        `**แอดมิน:** <@${interaction.user.id}>\n**ลิงก์:** ${invite.url}\n(ตั้งค่า: ไม่จำกัดเวลา / ไม่จำกัดครั้ง)`,
        'Blue',
        false
      );

    } catch (error) {
      console.error(error);
      return interaction.reply({ 
        content: '❌ ไม่สามารถสร้างลิงก์เชิญได้ กรุณาตรวจสอบสิทธิ์ของบอทครับ', 
        ephemeral: true 
      });
    }
  }
};
