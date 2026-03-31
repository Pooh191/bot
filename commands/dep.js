// commands/dep.js
const { SlashCommandBuilder } = require('discord.js');
const { getUsers, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dep')
    .setDescription('ฝากเงินเข้าธนาคาร')
    .addIntegerOption(opt =>
      opt.setName('amount')
         .setDescription('จำนวนเงินที่ต้องการฝาก')
         .setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('amount');
    const { getUser, saveUsers } = require('../utils/economyUtils');
    const { users, user } = getUser(userId);

    // ตรวจสอบว่ายอดเงินในกระเป๋าพอฝากหรือไม่
    if (user.balance < amount) {
      return interaction.reply({ content: `❌ คุณมียอดเงินสดไม่พอฝาก (ขาดอีก ${(amount - user.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    // ทำการฝาก
    user.balance -= amount;
    user.bank     = (user.bank || 0) + amount; // แก้ไขให้ถูกต้อง

    // บันทึกข้อมูล
    saveUsers(users);

    await interaction.reply(
      `✅ คุณฝากเงิน **${amount.toLocaleString()} บาท (THB)** เข้าธนาคารเรียบร้อย\n` +
      `• กระเป๋า: ${user.balance.toLocaleString()} บาท\n` +
      `• ธนาคาร: ${user.bank.toLocaleString()} บาท`
    );

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'ทำธุรกรรมฝากเงิน (Deposit)', 
      `**ผู้ทำรายการ:** <@${userId}>\n**ฝากเข้าแบงค์:** ${amount.toLocaleString()} บาท\n**ยอดเงินสดเหลือ:** ${user.balance.toLocaleString()} บาท\n**ยอดเงินในแบงค์:** ${user.bank.toLocaleString()} บาท`, 
      'Blue',
      true
    );
  }
};
