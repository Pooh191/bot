const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('โอนเงินให้ผู้ใช้คนอื่น (มีค่าธรรมเนียมภาษี 5%)')
    .addUserOption(opt => 
      opt.setName('target')
         .setDescription('เลือกผู้รับเงิน')
         .setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('amount')
         .setDescription('จำนวนเงินที่ต้องการโอน')
         .setRequired(true)
         .setMinValue(1)),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if (target.id === senderId) {
       return interaction.reply({ content: '❌ คุณไม่สามารถโอนเงินให้ตัวเองได้ครับ', ephemeral: true });
    }
    if (target.bot) {
       return interaction.reply({ content: '❌ ไม่สามารถโอนเงินให้บอทได้ครับ', ephemeral: true });
    }

    const { users: allUsers, user: sender } = getUser(senderId);
    const { user: recipient } = getUser(target.id);

    if (sender.balance < amount) {
       return interaction.reply({ content: `❌ คุณมียอดเงินในกระเป๋าไม่เพียงพอ (ขาดอีก ${(amount - sender.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    // หักภาษี 5%
    const taxRate = 0.05;
    const tax = Math.floor(amount * taxRate);
    const finalAmount = amount - tax;

    // ทำรายการ
    sender.balance -= amount;
    recipient.balance = (recipient.balance || 0) + finalAmount;

    saveUsers(allUsers);

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('💸 โอนเงินสำเร็จ')
      .setDescription(`คุณได้ทำการโอนเงินให้ <@${target.id}> เรียบร้อยแล้ว`)
      .addFields(
        { name: 'จำนวนเงินที่โอน', value: `${amount.toLocaleString()} บาท (THB)`, inline: true },
        { name: 'สุทธิที่ได้รับ (หักภาษี 5%)', value: `${finalAmount.toLocaleString()} บาท (THB)`, inline: true },
        { name: 'ยอดเงินคงเหลือของคุณ', value: `${sender.balance.toLocaleString()} บาท`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    await sendEconomyLog(
      interaction.client,
      '💸 โอนเงิน (Transfer)',
      `**ผู้ส่ง:** <@${senderId}>\n**ผู้รับ:** <@${target.id}>\n**จำนวน:** ${amount.toLocaleString()} บาท\n**ภาษี:** ${tax.toLocaleString()} บาท\n**สุทธิ:** ${finalAmount.toLocaleString()} บาท`,
      'Green',
      true // ส่งห้องสาธารณะด้วย
    );
  }
};
