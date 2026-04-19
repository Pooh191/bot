const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
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
    if (interaction.options.getSubcommand() === 'draw') {
      const date = interaction.options.getString('date');
      
      const modal = new ModalBuilder()
        .setCustomId(`lotto_draw_modal_${date}`)
        .setTitle(`🎲 ผลรางวัลงวด ${date}`);

      // We need to collect numbers for each prize.
      // 1st Prize (1), 2nd (2), 3rd (5), 4th (10), 5th (20), First2 (2), Last2 (2), Mid2 (1)
      // Since Modal has 5 component limit, we might need a simplified input or multiple steps.
      // Let's use a single text area for all numbers with labels.

      const input = new TextInputBuilder()
        .setCustomId('draw_results')
        .setLabel('ระบุเลขรางวัล (รางวัลละบรรทัด พร้อมชื่อรางวัล)')
        .setPlaceholder('รางวัลที่ 1: 1234\nรางวัลเลขหน้า 2 ตัว: 12, 34\n...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    }
  }
};
