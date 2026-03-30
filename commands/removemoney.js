const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('ริบเงินผู้ใช้ (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => 
      opt.setName('target')
         .setDescription('เลือกผู้ใช้ที่จะริบเงิน')
         .setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('amount')
         .setDescription('จำนวนเงิน (บาท/THB) ที่จะริบ')
         .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    const { users, user } = getUser(target.id);
    user.balance = Math.max(0, (user.balance || 0) - amount);
    saveUsers(users);

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('💸 ริบเงินสำเร็จ')
      .addFields(
        { name: 'ผู้ใช้', value: target.username, inline: true },
        { name: 'ริบเงิน', value: `-${amount.toLocaleString()} บาท (THB)`, inline: true },
        { name: 'ยอดเงินปัจจุบัน', value: `${user.balance.toLocaleString()} บาท (THB)`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await sendEconomyLog(
      interaction.client, 
      'Admin ริบเงิน (Remove Money)', 
      `**แอดมิน:** <@${interaction.user.id}>\n**เป้าหมาย:** <@${target.id}>\n**จำนวน:** -${amount.toLocaleString()} บาท\n**ยอดเงินสดใหม่:** ${user.balance.toLocaleString()} บาท`, 
      'Red'
    );
  }
};
