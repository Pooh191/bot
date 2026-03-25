const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUsers, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loan')
    .setDescription('🏦 กู้เงินจากธนาคารแห่งประเทศไทย')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('ระบุจำนวนเงินที่ต้องการกู้')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const amount = interaction.options.getInteger('amount');
    const config = loadConfig();

    if (amount <= 0) return interaction.reply({ content: '❌ กรุณาระบุจำนวนเงินที่มากกว่า 0 ครับ', ephemeral: true });

    // Limit Check: Max loan per level (Ex: 50,000 * Level)
    const limitPerLevel = config.loanLimitPerLevel || 50000;
    const maxLoan = (user.level || 1) * limitPerLevel;
    const currentDebt = (user.loanPrincipal || 0) + (user.loanInterest || 0);

    if (currentDebt + amount > maxLoan) {
      return interaction.reply({ 
        content: `❌ วงเงินกู้ของคุณไม่พอ! (กู้ได้สูงสุดรวมทั้งหมด **${maxLoan.toLocaleString()} บาท**)\n- ปัจจุบันมีหนี้อยู่: **${currentDebt.toLocaleString()} บาท**\n- ขอกู้เพิ่ม: **${amount.toLocaleString()} บาท**\n- รวมเป็น: **${(currentDebt + amount).toLocaleString()} บาท** ซึ่งเกินวงเงินของคุณครับ`, 
        ephemeral: true 
      });
    }

    // Process Loan (Stacking logic)
    const contractFeeRate = 0.01; 
    const contractFee = Math.floor(amount * contractFeeRate);

    user.balance = (user.balance || 0) + amount;
    user.loanPrincipal = (user.loanPrincipal || 0) + amount;
    user.loanInterest = (user.loanInterest || 0) + contractFee;
    saveUsers(users);

    const embed = new EmbedBuilder()
      .setTitle('🏦 อนุมัติเงินกู้ธนาคารแห่งประเทศไทย')
      .setColor('Green')
      .setDescription(`ยินดีด้วย! ธนาคารแห่งประเทศไทยได้อนุมัติเงินกู้ให้คุณเรียบร้อยแล้ว\n(อัตราดอกเบี้ย 24% ต่อปี แบบลดต้นลดดอก)`)
      .addFields(
        { name: '💰 เงินกู้ที่ได้รับ:', value: `**${amount.toLocaleString()}** บาท`, inline: true },
        { name: '📝 ค่าธรรมเนียมสัญญา (1%):', value: `**${contractFee.toLocaleString()}** บาท`, inline: true },
        { name: '📊 ยอดรวมที่ต้องชำระ:', value: `**${(amount + contractFee).toLocaleString()}** บาท`, inline: true }
      )
      .setFooter({ text: 'ดอกเบี้ยจะถูกคิดทุกวันเวลาเที่ยงคืนนะครับ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const totalDebt = amount + contractFee;
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '🏦 กู้เงินธนาคาร (Bank Loan)',
      `**ผู้กู้:** <@${userId}>\n**ยอดที่ได้รับ:** ${amount.toLocaleString()} บาท\n**ต้องคืน:** ${totalDebt.toLocaleString()} บาท`,
      'Orange',
      true
    );
  }
};
