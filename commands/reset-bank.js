const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadUsers, saveUsers, getUser } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-bank')
    .setDescription('รีเซ็ตเงินในธนาคาร (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('รีเซ็ตเงินในธนาคารของรายบุคคล')
        .addUserOption(opt => opt.setName('target').setDescription('เลือกผู้ใช้ที่ต้องการรีเซ็ต').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('รีเซ็ตเงินในธนาคารของทุกคน')
        .addBooleanOption(opt => opt.setName('confirm').setDescription('ยืนยันล้างข้อมูลเงินธนาคารทุกคน (ต้องเลือกเป็น True)').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const users = loadUsers();
    let logMessage = '';

    try {
      if (subcommand === 'all') {
        const confirm = interaction.options.getBoolean('confirm');
        if (!confirm) return interaction.reply({ content: '❌ กรุณาเลือก Confirm เป็น True เพื่อยืนยันการล้างข้อมูลทุกคน', flags: [MessageFlags.Ephemeral] });

        const userCount = Object.keys(users).length;
        for (const userId in users) {
          if (users[userId]) users[userId].bank = 0;
        }
        saveUsers(users);
        logMessage = `รีเซ็ตเงินในธนาคารของผู้ใช้ทุกคน (${userCount} ราย)`;
      } else {
        const target = interaction.options.getUser('target');
        const { users: updatedUsers, user } = getUser(target.id);
        user.bank = 0;
        saveUsers(updatedUsers);
        logMessage = `รีเซ็ตเงินในธนาคารของ <@${target.id}>`;
      }

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🔄 รีเซ็ตเงินในธนาคารสำเร็จ')
        .setDescription(`ทำการ${logMessage} เรียบร้อยแล้ว`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await sendEconomyLog(
        interaction.client,
        'Admin รีเซ็ตเงินในธนาคาร',
        `**แอดมิน:** <@${interaction.user.id}>\n**การกระทำ:** ${logMessage}`,
        'DarkRed'
      );

    } catch (error) {
      console.error('Error resetting bank:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'เกิดข้อผิดพลาดในการรีเซ็ตเงินในธนาคาร', flags: [MessageFlags.Ephemeral] }).catch(() => {});
      } else {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการรีเซ็ตเงินในธนาคาร', flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }
    }
  }
};
