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
      sub.setName('reset')
        .setDescription('คืนค่าระบบหวยทั้งหมด (ล้างสลาก/ผลรางวัล/รีเซ็ตโควต้า)')),

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
      } else if (interaction.options.getSubcommand() === 'reset') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // 1. Clear DB
        await LottoTicket.deleteMany({});
        await LottoDraw.deleteMany({});

        // 2. Reset User Stats
        const { loadUsers, saveUsers } = require('../utils/economyUtils');
        const users = loadUsers();
        let count = 0;
        for (const id in users) {
          const u = users[id];
          if (u) {
            u.lottoSpent = 0;
            u.lottoLimit = 10;
            count++;
          }
        }
        saveUsers(users);

        const embed = new EmbedBuilder()
          .setTitle('🧨 รีเซ็ตระบบหวยสำเร็จ')
          .setDescription(`- ลบรายชื่อสลากและข้อมูลผลรางวัลทั้งหมด\n- คืนโควต้าและล้างยอดเสียให้ผู้ใช้ทั้งหมด **${count}** ราย`)
          .setColor('DarkRed')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        const { sendEconomyLog } = require('../utils/logger');
        await sendEconomyLog(
          interaction.client, 
          '🧨 รีเซ็ตระบบหวย (Reset Lotto System)', 
          `**แอดมินล้างกระดาน:** <@${interaction.user.id}>\nล้างข้อมูลสลากและรีเซ็ตทุกคนเป็น 10 ใบ เรียบร้อยแล้ว (${count} ยูสเซอร์)`, 
          'DarkRed', 
          false
        );
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
