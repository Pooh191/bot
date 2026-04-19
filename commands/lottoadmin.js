const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const LottoDraw = require('../models/LottoDraw');
const { REWARDS } = require('../utils/lottoUtils');
const { syncLottoToSheet } = require('../utils/googleSheets');
const moment = require('moment-timezone');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottoadmin')
    .setDescription('🎲 (Admin) ออกรางวัลสลากกินแบ่งรัฐบาล')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
      sub.setName('draw')
        .setDescription('ระบุผลรางวัลประจำงวด')
        .addStringOption(opt => opt.setName('date').setDescription('วันที่ออกรางวัล (YYYY-MM-DD)').setRequired(true))),

  async execute(interaction) {
    try {
      if (interaction.options.getSubcommand() === 'draw') {
        const date = interaction.options.getString('date');
        
        const modal = new ModalBuilder()
          .setCustomId(`lotto_draw_modal_${date}`)
          .setTitle(`🎲 ผลรางวัลงวด ${date}`);

        const input = new TextInputBuilder()
          .setCustomId('draw_results')
          .setLabel('ระบุเลขรางวัล (รางวัลละบรรทัด)')
          .setPlaceholder('รางวัลที่ 1: 1234\nรางวัลเลขหน้า 2 ตัว: 12, 34\n...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }
    } catch (error) {
      console.error('Lotto Admin Command Error:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: `❌ เกิดข้อผิดพลาด: ${error.message}`, flags: [MessageFlags.Ephemeral] });
      }
    }
  }
};
