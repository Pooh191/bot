const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setloanlimit')
    .setDescription('🏦 ตั้งค่าวงเงินกู้สูงสุดต่อหนึ่งเลเวล (Admin เท่านั้น)')
    .addIntegerOption(opt => 
      opt.setName('amount')
         .setDescription('ระบุจำนวนเงิน (บาท) ต่อ 1 เลเวล (ตัวอย่าง: 50000)')
         .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const config = loadConfig();

    config.loanLimitPerLevel = amount;
    saveConfig(config);

    await interaction.reply(`✅ อัปเดตวงเงินกู้เป็น **${amount.toLocaleString()} บาท ต่อ 1 เลเวล** เรียบร้อยแล้วครับ!`);

    await sendEconomyLog(
      interaction.client,
      '⚙️ ตั้งค่าวงเงินกู้ (Set Loan Limit)',
      `**แอดมิน:** <@${interaction.user.id}>\n**วงเงินต่อเลเวล:** ${amount.toLocaleString()} บาท`,
      'Yellow',
      false
    );
  }
};
