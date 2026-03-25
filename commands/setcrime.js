const { SlashCommandBuilder } = require('discord.js');
const { getConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcrime')
    .setDescription('ตั้งค่าการทำงานแบบ crime')
    .addIntegerOption(option => 
      option.setName('min')
        .setDescription('จำนวนเงินขั้นต่ำที่ได้รับจากการทำงาน')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('max')
        .setDescription('จำนวนเงินสูงสุดที่ได้รับจากการทำงาน')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('จำนวนวันคูลดาวน์')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('hours')
        .setDescription('จำนวนชั่วโมงคูลดาวน์')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('minutes')
        .setDescription('จำนวนนาทีคูลดาวน์')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('seconds')
        .setDescription('จำนวนวินาทีคูลดาวน์')
        .setRequired(true)),

  async execute(interaction) {
    const min = interaction.options.getInteger('min');
    const max = interaction.options.getInteger('max');
    const days = interaction.options.getInteger('days');
    const hours = interaction.options.getInteger('hours');
    const minutes = interaction.options.getInteger('minutes');
    const seconds = interaction.options.getInteger('seconds');

    // แปลงคูลดาวน์เป็นมิลลิวินาที
    const cooldown = ((days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60) + seconds) * 1000;

    const cfg = getConfig();
    cfg.crimeMin = min;
    cfg.crimeMax = max;
    cfg.crimeCooldown = cooldown;

    saveConfig(cfg);

    await interaction.reply({
      content: `✅ ตั้งค่าระบบ /crime เรียบร้อยแล้ว
• ขั้นต่ำ: ${min.toLocaleString()} บาท (THB)
• สูงสุด: ${max.toLocaleString()} บาท (THB)
• คูลดาวน์: ${days} วัน ${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`
    });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '⚙️ ตั้งค่าระบบอาชญากรรม (Set Crime)',
      `**แอดมิน:** <@${interaction.user.id}>\n**ช่วงเงินใหม่:** ${min.toLocaleString()} - ${max.toLocaleString()} บาท\n**คูลดาวน์ใหม่:** ${cooldown / 1000} วินาที`,
      'Yellow',
      false
    );
  }
};
