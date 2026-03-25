// commands/setwork.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

const cfg = loadConfig();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwork')
    .setDescription('ตั้งค่าช่วงเงิน & คูลดาวน์สำหรับคำสั่ง /work')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('min')
        .setDescription('เงินได้ต่ำสุด')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('max')
        .setDescription('เงินได้สูงสุด')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('คูลดาวน์ (วัน)')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('hours')
        .setDescription('คูลดาวน์ (ชั่วโมง)')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('คูลดาวน์ (นาที)')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('คูลดาวน์ (วินาที)')
        .setRequired(true)),
  
  async execute(interaction) {
    const min     = interaction.options.getInteger('min');
    const max     = interaction.options.getInteger('max');
    const days    = interaction.options.getInteger('days');
    const hours   = interaction.options.getInteger('hours');
    const minutes = interaction.options.getInteger('minutes');
    const seconds = interaction.options.getInteger('seconds');

    const cooldown = days * 86400 + hours * 3600 + minutes * 60 + seconds;

    cfg.workMin      = min;
    cfg.workMax      = max;
    cfg.workDays     = days;
    cfg.workHours    = hours;
    cfg.workMinutes  = minutes;
    cfg.workSeconds  = seconds;
    cfg.workCooldown = cooldown;

    saveConfig(cfg);

    await interaction.reply(`✅ ตั้งค่า /work ใหม่เรียบร้อย:
• เงินได้: ${min.toLocaleString()} – ${max.toLocaleString()} บาท (THB)
• คูลดาวน์: ${days} วัน ${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที (${cooldown.toLocaleString()} วินาที)`);

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '⚙️ ตั้งค่าระบบงาน (Set Work)',
      `**แอดมิน:** <@${interaction.user.id}>\n**ช่วงเงินใหม่:** ${min.toLocaleString()} - ${max.toLocaleString()} บาท\n**คูลดาวน์ใหม่:** ${cooldown.toLocaleString()} วินาที`,
      'Yellow',
      false
    );
  }
};
