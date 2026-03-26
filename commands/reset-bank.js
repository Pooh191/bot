const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadUsers, saveUsers, getUser } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-bank')
    .setDescription('รีเซ็ตเงินในธนาคารของผู้ใช้ (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('target').setDescription('เลือกผู้ใช้ที่ต้องการรีเซ็ต'))
    .addBooleanOption(opt => opt.setName('all').setDescription('รีเซ็ตเงินในธนาคารของผู้ใช้ทุกคน (ต้องเลือกเป็น True)')),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const all = interaction.options.getBoolean('all');

    if (!target && !all) {
      return interaction.reply({ content: '❌ กรุณาเลือกผู้ใช้ที่ต้องการรีเซ็ต หรือเลือก Option `all` เป็น True เพื่อรีเซ็ตทุกคน', ephemeral: true });
    }

    try {
      const users = loadUsers();
      let logMessage = '';

      if (all) {
        // Reset All
        const userCount = Object.keys(users).length;
        for (const userId in users) {
          users[userId].bank = 0;
        }
        saveUsers(users);
        logMessage = `รีเซ็ตเงินในธนาคารของผู้ใช้ทุกคน (${userCount} ราย)`;
      } else {
        // Reset Individual
        if (!users[target.id]) {
          const { users: updatedUsers, user } = getUser(target.id);
          user.bank = 0;
          saveUsers(updatedUsers);
        } else {
          users[target.id].bank = 0;
          saveUsers(users);
        }
        logMessage = `รีเซ็ตเงินในธนาคารของ <@${target.id}>`;
      }

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🔄 รีเซ็ตเงินในธนาคารสำเร็จ')
        .setDescription(`ทำการ${logMessage} เรียบร้อยแล้ว`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log to Economy Log
      await sendEconomyLog(
        interaction.client,
        'Admin รีเซ็ตเงินในธนาคาร',
        `**แอดมิน:** <@${interaction.user.id}>\n**การกระทำ:** ${logMessage}`,
        'DarkRed'
      );

    } catch (error) {
      console.error('Error resetting bank:', error);
      await interaction.reply({ content: 'เกิดข้อผิดพลาดในการรีเซ็ตเงินในธนาคาร', ephemeral: true });
    }
  }
};
