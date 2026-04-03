const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstartmoney')
    .setDescription('ตั้งค่าเงินเริ่มต้นเมื่อผู้ใช้ใหม่เข้าเซิร์ฟเวอร์')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('amount')
         .setDescription('จำนวนเงินเริ่มต้น (บาท/THB)')
         .setRequired(true)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    let config = loadConfig();
    config.startingBalance = amount;
    saveConfig(config);

    await interaction.reply(`✅ ตั้งค่าเงินเริ่มต้นสำหรับประชาชนใหม่เป็น **${amount.toLocaleString()} บาท (THB)** เรียบร้อยแล้ว`);

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'ตั้งค่าเงินแจกคนใหม่ (Set Start Money)', 
      `**แอดมิน:** <@${interaction.user.id}>\n**ตั้งค่าใหม่:** สมัครใหม่จะได้คนละ ${amount.toLocaleString()} บาท`, 
      'Yellow',
      false // Add to admin log only
    );
  }
};
