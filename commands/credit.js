const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit')
    .setDescription('🏦 ตรวจสอบวงเงินกู้คงเหลือของคุณที่ธนาคารแห่งประเทศไทยอนุมัติ'),

  async execute(interaction) {
    const { user } = getUser(interaction.user.id);
    const config = loadConfig();

    // คำนวณขีดจำกัด
    const limitPerLevel = config.loanLimitPerLevel || 50000;
    const maxLoan = (user.level || 1) * limitPerLevel;
    const currentDebt = (user.loanPrincipal || 0) + (user.loanInterest || 0);
    const remainingCredit = Math.max(0, maxLoan - currentDebt);

    const embed = new EmbedBuilder()
      .setTitle('🏦 วงเงินกู้ธนาคารแห่งประเทศไทย')
      .setColor('Blue')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`ข้อมูลเครดิตการเงินของคุณในปัจจุบัน (เลเวล ${user.level || 1})`)
      .addFields(
        { name: '💰 วงเงินสูงสุดที่กู้ได้:', value: `**${maxLoan.toLocaleString()}** บาท`, inline: false },
        { name: '💳 หนี้ค้างชำระปัจจุบัน:', value: `**${currentDebt.toLocaleString()}** บาท`, inline: true },
        { name: '✨ วงเงินที่กู้เพิ่มได้อีก:', value: `**${remainingCredit.toLocaleString()}** บาท`, inline: true }
      )
      .setFooter({ text: 'เพิ่มเลเวลของคุณเพื่อเพิ่มวงเงินกู้ให้สูงขึ้น!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
