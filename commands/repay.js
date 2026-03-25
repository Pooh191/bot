const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repay')
    .setDescription('💰 ชำระหนี้ที่คุณกู้มาจากธนาคาร')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('ระบุจำนวนเงินที่ต้องการชำระ')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const amount = interaction.options.getInteger('amount');

    const currentInterest = user.loanInterest || 0;
    const currentPrincipal = user.loanPrincipal || 0;
    const totalDebt = currentInterest + currentPrincipal;

    if (totalDebt <= 0) {
      return interaction.reply({ content: '💳 คุณไม่มีหนี้ค้างชำระในระบบธนาคารครับ!', ephemeral: true });
    }

    if (amount <= 0) return interaction.reply({ content: '❌ ระบุจำนวนเงินที่มากกว่า 0 ครับ', ephemeral: true });

    if (user.balance < amount) {
      return interaction.reply({ 
        content: `❌ เงินสดในตัวคุณไม่พอ! คุณมีอยู่ **${user.balance.toLocaleString()} บาท** เท่านั้นครับ`, 
        ephemeral: true 
      });
    }

    // Process Repayment (Effective Rate: Pay interest first, then principal)
    let remainingToPay = Math.min(amount, totalDebt);
    const paidAmount = remainingToPay;
    
    let paidInterest = 0;
    let paidPrincipal = 0;

    // 1. Pay Interest
    if (remainingToPay > 0 && user.loanInterest > 0) {
      paidInterest = Math.min(remainingToPay, user.loanInterest);
      user.loanInterest -= paidInterest;
      remainingToPay -= paidInterest;
    }

    // 2. Pay Principal
    if (remainingToPay > 0 && user.loanPrincipal > 0) {
      paidPrincipal = Math.min(remainingToPay, user.loanPrincipal);
      user.loanPrincipal -= paidPrincipal;
      remainingToPay -= paidPrincipal;
    }

    user.balance -= paidAmount;
    saveUsers(users);

    const embed = new EmbedBuilder()
      .setTitle('💰 สลิปการชำระหนี้ (Loan Repayment Slip)')
      .setColor('Blue')
      .setDescription(`ขอบคุณสำหรับการชำระเงินกู้ครับ! ระบบได้ดำเนินการตัดยอดแบบ "ลดต้นลดดอก" ให้เรียบร้อยแล้ว`)
      .addFields(
        { name: '📉 หักดอกเบี้ย:', value: `-${paidInterest.toLocaleString()} บาท`, inline: true },
        { name: '📉 หักเงินต้น:', value: `-${paidPrincipal.toLocaleString()} บาท`, inline: true },
        { name: '💵 ยอดที่จ่ายรวม:', value: `**${paidAmount.toLocaleString()}** บาท`, inline: true },
        { name: '📝 ยอดเงินต้นคงเหลือ:', value: `**${user.loanPrincipal.toLocaleString()}** บาท`, inline: true }
      )
      .setFooter({ text: 'การจ่ายคืนเงินต้นเยอะๆ จะช่วยลดดอกเบี้ยในวันถัดไปนะครับ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const remainingDebt = (user.loanPrincipal || 0) + (user.loanInterest || 0);
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '💰 ชำระหนี้ธนาคาร (Repayment)',
      `**ผู้ชำระ:** <@${userId}>\n**ยอดที่จ่าย:** ${paidAmount.toLocaleString()} บาท\n**ยอดคงค้าง:** ${remainingDebt.toLocaleString()} บาท`,
      'Green',
      true
    );
  }
};
