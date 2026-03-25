const { SlashCommandBuilder } = require('discord.js');
const { getConfig, setConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmoney1day')
    .setDescription('กำหนดรายได้รายวันของประชาชน')
    .addIntegerOption(o => o.setName('amount').setDescription('จำนวน บาท ต่อวัน').setRequired(true)),
  async execute(interaction) {
    const amt = interaction.options.getInteger('amount');
    const cfg = getConfig();
    cfg.dailyIncome = amt;
    setConfig(cfg);
    await interaction.reply(`✅ ตั้งค่ารายได้รายวัน: ${amt.toLocaleString()} บาท (THB)`);
  }
};