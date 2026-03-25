// commands/setenvchannel.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setenvchannel')
    .setDescription('ตั้งค่าห้องสำหรับส่งแจ้งเตือนทรัพยากรและเศรษฐกิจ')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('เลือกห้องประกาศ')
        .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    if (!channel.isTextBased()) {
      return interaction.reply({ content: 'กรุณาเลือกช่องข้อความเท่านั้น', ephemeral: true });
    }
    const cfg = loadConfig();
    cfg.announcementChannelId = channel.id;
    saveConfig(cfg);
    return interaction.reply({ content: `✅ ตั้งค่าห้องประกาศเป็น <#${channel.id}> เรียบร้อย`, ephemeral: true });
  }
};
