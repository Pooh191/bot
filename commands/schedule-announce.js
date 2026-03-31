const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

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
      option.setName('message')
        .setDescription('ข้อความที่จะประกาศ (ใช้ \\n เพื่อขึ้นบรรทัดใหม่)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('datetime')
        .setDescription('ระบุเวลา (เช่น 18:30, 2026-04-01 15:30) หรือจำนวนนาที (เช่น 10m, 2h)')
        .setRequired(true))
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
    const msgContent = interaction.options.getString('message');
    let datetimeInput = interaction.options.getString('datetime').trim();
    const role = interaction.options.getRole('role');
    const imageUrl = interaction.options.getString('image_url');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ ช่องที่เลือกต้องรองรับข้อความ', ephemeral: true });
    }

    let targetTime;

    // ตรวจสอบว่าเป็นรูปแบบ 10m, 2h หรือไม่
    const relativeMatch = datetimeInput.match(/^(\d+)([mh])$/i);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      targetTime = moment().tz('Asia/Bangkok');
      if (unit === 'm') targetTime.add(value, 'minutes');
      if (unit === 'h') targetTime.add(value, 'hours');
    } else {
      // ตรวจสอบว่าเป็นรูปแบบ YYYY-MM-DD HH:mm หรือ HH:mm
      if (/^\d{1,2}:\d{2}$/.test(datetimeInput)) {
        const today = moment().tz('Asia/Bangkok').format('YYYY-MM-DD');
        datetimeInput = `${today} ${datetimeInput}`;
      }
      
      targetTime = moment.tz(datetimeInput, ['YYYY-MM-DD HH:mm', 'YYYY/MM/DD HH:mm', 'DD-MM-YYYY HH:mm', 'DD/MM/YYYY HH:mm'], 'Asia/Bangkok');
    }

    if (!targetTime || !targetTime.isValid()) {
      return interaction.reply({ 
        content: '❌ รูปแบบเวลาไม่ถูกต้อง!\nกรุณาใช้รูปแบบ `HH:mm` (เช่น 18:30) หรือ `YYYY-MM-DD HH:mm` หรือ `10m`, `2h`', 
        ephemeral: true 
      });
    }

    if (targetTime.valueOf() <= moment().valueOf()) {
      return interaction.reply({ content: '❌ ไม่สามารถตั้งเวลาในอดีตได้', ephemeral: true });
    }

    // โหลดไฟล์ประวัติ
    let schedules = [];
    if (fs.existsSync(filePath)) {
      try {
        schedules = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(schedules)) schedules = [];
      } catch(e) {
        schedules = [];
      }
    }

    const newSchedule = {
      id: Date.now().toString(),
      guildId: interaction.guildId,
      channelId: channel.id,
      message: msgContent.replace(/\\n/g, '\n'), // รองรับการขึ้นบรรทัดใหม่ด้วย \n
      roleId: role ? role.id : null,
      imageUrl: imageUrl || null,
      authorId: interaction.user.id,
      executeAt: targetTime.valueOf()
    };

    schedules.push(newSchedule);
    
    // ตรวจสอบว่า directory /data/ มีหรือไม่ (ปกติควรมีอยู่แล้ว)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(schedules, null, 2), 'utf8');

    const formattedTime = targetTime.format('DD/MM/YYYY HH:mm');

    const replyEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ ตั้งเวลาประกาศสำเร็จ')
      .setDescription(`ระบบจะส่งข้อความประกาศในเวลา **${formattedTime}**`)
      .addFields(
        { name: '📍 ไปที่ห้อง', value: `<#${channel.id}>`, inline: true },
        { name: '🏷️ ยศที่แท็ก', value: role ? `<@&${role.id}>` : 'ไม่มี', inline: true },
        { name: '🕒 เวลาที่จะส่ง', value: `<t:${Math.floor(targetTime.valueOf() / 1000)}:R>`, inline: false },
        { name: '📝 ข้อความ', value: newSchedule.message }
      );

    if (newSchedule.imageUrl) {
      replyEmbed.setImage(newSchedule.imageUrl);
    }

    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
  }
};
