const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drew')
    .setDescription('ถอนเงินจากธนาคาร')
    .addIntegerOption(o=>o.setName('amount').setDescription('จำนวน').setRequired(true)),
  async execute(interaction) {
    const amt = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    
    if (user.bank < amt) return interaction.reply('❌ ยอดในธนาคารไม่พอ');
    user.bank -= amt; user.balance += amt;
    saveUsers(users);
    await interaction.reply(`✅ ถอนเงิน **${amt.toLocaleString()} บาท (THB)** จากบัญชีธนาคารเรียบร้อย`);

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'ทำธุรกรรมถอนเงิน (Withdraw)', 
      `**ผู้ทำรายการ:** <@${userId}>\n**ถอนจากแบงค์:** ${amt.toLocaleString()} บาท\n**ยอดเงินสดใหม่:** ${user.balance.toLocaleString()} บาท\n**ยอดเงินในแบงค์:** ${user.bank.toLocaleString()} บาท`, 
      'Blue',
      true
    );
  }
};