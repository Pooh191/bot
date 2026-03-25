const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setslut')
    .setDescription('ตั้งค่าการทำงานแบบ slut')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('min')
        .setDescription('จำนวนเงินขั้นต่ำที่ได้รับ')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('max')
        .setDescription('จำนวนเงินสูงสุดที่ได้รับ')
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

    // คำนวณคูลดาวน์เป็นมิลลิวินาที
    const cooldownMs = ((days * 86400) + (hours * 3600) + (minutes * 60) + seconds) * 1000;

    const cfg = loadConfig();
    cfg.slutMin      = min;
    cfg.slutMax      = max;
    cfg.slutCooldown = cooldownMs;

    saveConfig(cfg);

    await interaction.reply({
      content: `✅ ตั้งค่า /slut เรียบร้อยแล้ว:
• ขั้นต่ำ: ${min.toLocaleString()} บาท (THB)
• สูงสุด: ${max.toLocaleString()} บาท (THB)
• คูลดาวน์: ${days}d ${hours}h ${minutes}m ${seconds}s (${cooldownMs / 1000} วินาที)`
    });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '⚙️ ตั้งค่าระบบสีเทา (Set Slut)',
      `**แอดมิน:** <@${interaction.user.id}>\n**ช่วงเงินใหม่:** ${min.toLocaleString()} - ${max.toLocaleString()} บาท\n**คูลดาวน์ใหม่:** ${cooldownMs / 1000} วินาที`,
      'Yellow',
      false
    );
  }
};
