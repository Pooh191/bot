const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { getNextDrawDate } = require('../utils/lottoUtils');
const { getUser, saveUsers } = require('../utils/economyUtils');
const moment = require('moment-timezone');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lotto')
    .setDescription('🎫 ซื้อสลากกินแบ่งรัฐบาล (ใบละ 80 บาท)')
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('จำนวนใบที่ต้องการซื้อ (ไม่เกิน 10 ใบ)')
        .setMinValue(1)
        .setMax(10)
        .setRequired(true)),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const pricePerTicket = 80;
    const totalCost = amount * pricePerTicket;

    const { user } = getUser(interaction.user.id);
    if (user.balance < totalCost) {
      return interaction.reply({ 
        content: `❌ คุณมีเงินไม่เพียงพอ! ต้องใช้ ${totalCost.toLocaleString()} บาท (คุณมี ${user.balance.toLocaleString()} บาท)`, 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Check Sale Time
    const now = moment().tz('Asia/Bangkok');
    const nextDraw = getNextDrawDate();
    const saleEnd = nextDraw.clone().hour(17).minute(30).second(0);

    if (now.isAfter(saleEnd)) {
      return interaction.reply({ 
        content: `❌ ปิดการขายสลากสำหรับงวดนี้แล้วสิ! กรุณารอซื้อในงวดถัดไปหลังออกรางวัลเสร็จสิ้น`, 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Show Modal to enter numbers
    const modal = new ModalBuilder()
      .setCustomId(`lotto_modal_${amount}`)
      .setTitle(`🎫 ระบุเลขสลาก (${amount} ใบ)`);

    const numberInput = new TextInputBuilder()
      .setCustomId('lotto_numbers')
      .setLabel(`ระบุเลข 4 หลัก (แยกด้วยเว้นวรรคหรือคอมม่า)`)
      .setPlaceholder('เช่น 1234 5678 0000 ...')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(amount * 4 + (amount - 1))
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(numberInput));

    await interaction.showModal(modal);
  }
};
