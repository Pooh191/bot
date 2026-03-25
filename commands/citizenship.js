const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType
} = require('discord.js');
const { saveConfig } = require('../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('citizenship')
    .setDescription('ระบบจัดการสัญชาติอาร์ลิงตัน')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('ตั้งค่าห้องสำหรับระบบสัญชาติ')
        .addChannelOption(option =>
          option.setName('verify_channel')
            .setDescription('ห้องตรวจสอบคำขอ (Verify)')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('success_channel')
            .setDescription('ห้องประกาศรับสัญชาติสำเร็จ (Success)')
            .setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.editReply({ 
        content: '⚠️ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้'
      });
    }

    const verifyChannel = interaction.options.getChannel('verify_channel');
    const successChannel = interaction.options.getChannel('success_channel');

    if (verifyChannel.type !== ChannelType.GuildText || successChannel.type !== ChannelType.GuildText) {
      return interaction.editReply({
        content: '❌ ต้องเลือกห้องข้อความเท่านั้น'
      });
    }

    try {
      await saveConfig({
        verifyChannel: verifyChannel.id,
        successChannel: successChannel.id
      });

      const verifyEmbed = new EmbedBuilder()
        .setTitle('วิธีการขอสัญชาติ')
        .setDescription(`
1. กรอกข้อมูลในแบบฟอร์มขอสัญชาติ
2. รอการตรวจสอบจากเจ้าหน้าที่
3. ประกาศผลในห้อง ${successChannel}
        `)
        .setFooter({ text: 'THAILAND' });

      const requestButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('citizen_request')
          .setLabel('ยื่นคำขอสัญชาติ')
          .setStyle(ButtonStyle.Primary)
      );

      await verifyChannel.send({ 
        embeds: [verifyEmbed],
        components: [requestButton] 
      });

      await interaction.editReply({
        content: `✅ ตั้งค่าระบบสัญชาติเรียบร้อยแล้ว!\n- ห้องตรวจสอบ: ${verifyChannel}\n- ห้องประกาศสำเร็จ: ${successChannel}`
      });

    } catch (error) {
      console.error('Error setting up citizenship system:', error);
      await interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ'
      });
    }
  }
};