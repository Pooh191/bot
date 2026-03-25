const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadUsers, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reseteconomy')
    .setDescription('รีเซ็ตระบบเศรษฐกิจทั้งหมด (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      const users = loadUsers();

      if (typeof users !== 'object' || users === null) {
        return interaction.reply('❌ ข้อมูลผู้ใช้ไม่ถูกต้อง');
      }

      const userCount = Object.keys(users).length;
      for (const userId in users) {
        const user = users[userId];
        user.balance = 0;
        user.bank = 0;
        user.lastWork = 0;
        user.lastSlut = 0;
        user.lastCrime = 0;
      }

      saveUsers(users);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🔄 รีเซ็ตเศรษฐกิจสำเร็จ')
        .setDescription(`ระบบเศรษฐกิจทั้งหมดถูกรีเซ็ตเป็น 0 สำหรับผู้ใช้ทั้งสิ้น ${userCount} ราย เรียบร้อยแล้ว`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(
        interaction.client,
        '🔥 เผาละลายบัญชี (Reset Economy)',
        `**เจ้านายสั่งการลบ:** <@${interaction.user.id}>\n**การกระทำ:** ล้างข้อมูลเงินของทุกคนในเซิร์ฟเวอร์เหลือ 0 (ล้างทั้งหมด ${userCount} ยูสเซอร์)`,
        'DarkRed',
        false
      );

    } catch (error) {
      console.error('Error resetting economy:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการรีเซ็ตเศรษฐกิจ', ephemeral: true });
      }
    }
  }
};
