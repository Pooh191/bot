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
    
    const { isIdCardValid } = require('../utils/economyUtils');
    const idStatus = isIdCardValid(user);
    if (!idStatus.valid) {
      const reason = idStatus.reason === 'missing_id' ? 'คุณยังไม่มีบัตรประชาชน ไม่สามารถใช้บริการธนาคารได้' : `บัตรประชาชนของคุณหมดอายุแล้วเมื่อวันที่ **${idStatus.expiry}** กรุณาต่ออายุบัตรก่อนใช้บริการธนาคาร`;
      return interaction.reply({ content: `❌ ${reason}\nใช้คำสั่ง \`/id-card\` เพื่อจัดการบัตรประชาชนของคุณ`, ephemeral: true });
    }
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