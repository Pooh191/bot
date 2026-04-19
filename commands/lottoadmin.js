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
const LottoTicket = require('../models/LottoTicket');
const { REWARDS, normalizeDate } = require('../utils/lottoUtils');
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
        .addStringOption(opt => opt.setName('date').setDescription('วันที่ (เช่น 20/4/2569 หรือ 20/04/2026)').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('sync')
        .setDescription('ส่งข้อมูลการซื้อสลากทั้งหมดเข้า Google Sheet ทันที (Manual Sync)')),

  async execute(interaction) {
    try {
      if (interaction.options.getSubcommand() === 'draw') {
        const rawDate = interaction.options.getString('date');
        const date = normalizeDate(rawDate);

        if (!date) {
          return interaction.reply({ content: '❌ รูปแบบวันที่ไม่ถูกต้อง! กรุณาใส่แบบ วัน/เดือน/ปี เช่น `20/4/2569` หรือ `20/04/2026`', flags: [MessageFlags.Ephemeral] });
        }
        
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
      } else if (interaction.options.getSubcommand() === 'sync') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const tickets = await LottoTicket.find({});
        if (tickets.length === 0) {
          return interaction.editReply('❌ ไม่มีข้อมูลสลากในระบบให้ส่งครับ');
        }

        for (const ticket of tickets) {
          await syncLottoToSheet('purchases', {
            userId: ticket.userId,
            username: `UID: ${ticket.userId}`,
            numbers: ticket.numbers
          });
        }

        await interaction.editReply(`✅ ทำการส่งข้อมูลสลากทั้งหมด (${tickets.length} รายการ) เข้า Google Sheet เรียบร้อยแล้วครับ!`);
      }
    } catch (error) {
      console.error('Lotto Admin Command Error:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: `❌ เกิดข้อผิดพลาด: ${error.message}`, flags: [MessageFlags.Ephemeral] });
      } else {
        await interaction.editReply(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      }
    }
  }
};
