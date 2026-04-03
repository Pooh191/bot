const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

global.tempAnnounceCache = global.tempAnnounceCache || new Map();

const filePath = path.join(__dirname, '..', 'data', 'scheduled_messages.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scheduleannounce')
    .setDescription('⏳ ตั้งเวลาประกาศข้อความอัตโนมัติ (แอดมินเท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('ห้องที่ต้องการส่งประกาศ')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('ระบุเวลา (เช่น 18:30) หรือจำนวนนาที (เช่น 10m, 2h)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('ระบุวันที่ (เช่น 01/04/2026 หรือ 2026-04-01) หากไม่กรอกคือวันนี้')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('ยศที่ต้องการแท็ก (ไม่บังคับ)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image_url')
        .setDescription('URL รูปภาพที่จะแนบ (ไม่บังคับ)')
        .setRequired(false)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    let timeInput = interaction.options.getString('time').trim();
    let dateInput = interaction.options.getString('date') ? interaction.options.getString('date').trim() : null;
    const role = interaction.options.getRole('role');
    const imageUrl = interaction.options.getString('image_url');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ ช่องที่เลือกต้องรองรับข้อความ', flags: [MessageFlags.Ephemeral] });
    }

    let targetTime;

    // ตรวจสอบว่าเป็นรูปแบบ 10m, 2h หรือไม่
    const relativeMatch = !dateInput && timeInput.match(/^(\d+)([mh])$/i);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      targetTime = moment().tz('Asia/Bangkok');
      if (unit === 'm') targetTime.add(value, 'minutes');
      if (unit === 'h') targetTime.add(value, 'hours');
    } else {
      let combinedStr = '';
      if (dateInput) {
        // ถ้าระบุรูปแบบเวลามาเป็น YYYY-MM-DD HH:mm เต็มๆ แล้วในช่องเวลา ก็ใช้ช่องเดียว
        if (timeInput.includes(' ')) {
          combinedStr = timeInput;
        } else {
          combinedStr = `${dateInput} ${timeInput}`;
        }
      } else {
        if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
          const today = moment().tz('Asia/Bangkok').format('YYYY-MM-DD');
          combinedStr = `${today} ${timeInput}`;
        } else {
          combinedStr = timeInput; // สมมติว่าพิมพ์มาเต็มๆในช่อง time
        }
      }
      
      targetTime = moment.tz(combinedStr, ['YYYY-MM-DD HH:mm', 'YYYY/MM/DD HH:mm', 'DD-MM-YYYY HH:mm', 'DD/MM/YYYY HH:mm', 'D/M/YYYY HH:mm', 'M/D/YYYY HH:mm'], 'Asia/Bangkok');
    }

    if (!targetTime || !targetTime.isValid()) {
      return interaction.reply({ 
        content: '❌ รูปแบบเวลาไม่ถูกต้อง!\nกรุณาระบุ `time` เช่น 18:30 และ `date` เช่น 01/04/2026\nหรือพิมพ์แค่ `time` เป็น 10m (ไม่ต้องใส่วันที่)', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    if (targetTime.valueOf() <= moment().valueOf()) {
      return interaction.reply({ content: '❌ ไม่สามารถตั้งเวลาในอดีตได้', flags: [MessageFlags.Ephemeral] });
    }

    // Store options in global cache
    const modalId = `sa_modal_${interaction.user.id}_${Date.now()}`;
    global.tempAnnounceCache.set(modalId, {
      guildId: interaction.guildId,
      channelId: channel.id,
      roleId: role ? role.id : null,
      imageUrl: imageUrl || null,
      executeAt: targetTime.valueOf(),
      formattedTime: targetTime.format('DD/MM/YYYY HH:mm')
    });

    // Create Modal
    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle('แบบฟอร์มประกาศข้อความอัตโนมัติ');

    const messageInput = new TextInputBuilder()
      .setCustomId('announce_message')
      .setLabel('พิมพ์ข้อความ (เคาะบรรทัด/พิมพ์ยาวๆได้)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(3500);

    const row = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};
