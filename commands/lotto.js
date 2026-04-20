const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lotto')
    .setDescription('🎫 ซื้อสลากกินแบ่งรัฐบาล (ใบละ 80 บาท)')
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('จำนวนใบที่ต้องการซื้อ')
        .setMinValue(1)
        .setRequired(true)),

  async execute(interaction) {
    try {
      console.log(`[LOTTO] Command used by ${interaction.user.tag}`);
      
      const { getUser } = require('../utils/economyUtils');
      const { getNextDrawDate } = require('../utils/lottoUtils');
      const moment = require('moment-timezone');

      const amount = interaction.options.getInteger('amount');
      const { user } = getUser(interaction.user.id);
      const limit = user.lottoLimit || 3;

      if (amount > limit) {
        return interaction.reply({
          content: `❌ คุณสามารถซื้อได้สูงสุดแค่ ${limit} ใบในรอบนี้! (วงเงินของคุณจะเพิ่มขึ้นเมื่อมีการซื้อครั้งต่อไป)`,
          ephemeral: true
        });
      }

      const pricePerTicket = 80;
      const totalCost = amount * pricePerTicket;

      if (user.balance < totalCost) {
        return interaction.reply({ 
          content: `❌ คุณมีเงินไม่เพียงพอ! ต้องใช้ ${totalCost.toLocaleString()} บาท (คุณมี ${user.balance.toLocaleString()} บาท)`, 
          ephemeral: true 
        });
      }

      // Check Sale Time
      const now = moment().tz('Asia/Bangkok');
      const nextDraw = getNextDrawDate();
      const saleEnd = nextDraw.clone().hour(17).minute(30).second(0);

      if (now.isAfter(saleEnd)) {
        return interaction.reply({ 
          content: `❌ ปิดการขายสลากสำหรับงวดนี้แล้วสิ! กรุณารอซื้อในงวดถัดไปหลังออกรางวัลเสร็จสิ้น`, 
          ephemeral: true 
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
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(numberInput));

      await interaction.showModal(modal);
    } catch (err) {
      console.error('❌ Lotto Command Runtime Error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: `❌ เกิดข้อผิดพลาดร้ายแรง: \`${err.message}\``, 
          ephemeral: true 
        }).catch(() => {});
      }
    }
  }
};
