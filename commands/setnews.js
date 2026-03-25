const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnews')
    .setDescription('📢 ตั้งค่าช่องสำหรับประกาศรายงานเศรษฐกิจประจำวัน (Admin เท่านั้น)')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('เลือกช่องที่ต้องการให้บอทส่งรายงาน')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const config = loadConfig();

    config.announcementChannelId = channel.id;
    saveConfig(config);

    await interaction.reply({ 
      content: `✅ ตั้งค่าช่องประกาศรายงานเศรษฐกิจเรียบร้อยแล้ว!\n📍 **ช่อง:** ${channel}`, 
      ephemeral: true 
    });
  }
};
