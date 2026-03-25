// commands/seteconchannel.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seteconchannel')
    .setDescription('ตั้งค่า channel สำหรับรายงานเศรษฐกิจรายวัน')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o=>o.setName('channel').setDescription('เลือกช่อง').setRequired(true)),
  async execute(interaction) {
    const ch = interaction.options.getChannel('channel');
    const cfg = loadConfig();
    cfg.econChannelId = ch.id;
    saveConfig(cfg);
    await interaction.reply(`✅ ตั้งค่า channel รายงานเป็น <#${ch.id}> เรียบร้อย`);
  }
};
