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
    const users = getUsers();

    // สร้างข้อมูลเริ่มต้นหากยังไม่มี หรือเติมค่า default ให้ครบ
    if (!users[userId]) {
      users[userId] = { balance: 0, bank: 0, lastWork: 0 };
    } else {
      users[userId].balance = Number(users[userId].balance) || 0;
      users[userId].bank    = Number(users[userId].bank) || 0;
      users[userId].lastWork = users[userId].lastWork || 0;
    }

    // ตรวจสอบว่ายอดเงินในกระเป๋าพอฝากหรือไม่
    if (users[userId].balance < amount) {
      return interaction.reply({ content: '❌ ยอดเงินไม่เพียงพอในกระเป๋า', ephemeral: true });
    }

    // ทำการฝาก
    users[userId].balance -= amount;
    users[userId].bank    += amount;

    // บันทึกข้อมูล
    saveUsers(users);

    await interaction.reply(
      `✅ คุณฝากเงิน **${amount.toLocaleString()} บาท (THB)** เข้าธนาคารเรียบร้อย\n` +
      `• กระเป๋า: ${users[userId].balance.toLocaleString()} บาท\n` +
      `• ธนาคาร: ${users[userId].bank.toLocaleString()} บาท`
    );

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'ทำธุรกรรมฝากเงิน (Deposit)', 
      `**ผู้ทำรายการ:** <@${userId}>\n**ฝากเข้าแบงค์:** ${amount.toLocaleString()} บาท\n**ยอดเงินสดเหลือ:** ${users[userId].balance.toLocaleString()} บาท\n**ยอดเงินในแบงค์:** ${users[userId].bank.toLocaleString()} บาท`, 
      'Blue',
      true
    );
  }
};
