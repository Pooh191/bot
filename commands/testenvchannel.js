const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../data/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testenvchannel')
    .setDescription('ทดสอบการส่งข้อความไปยังช่องแจ้งเตือนที่ตั้งค่าไว้ (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // โหลดค่าห้องจาก config
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const channelId = config.notifyChannelId;

      if (!channelId) {
        return await interaction.reply('⚠️ ยังไม่ได้ตั้งค่าห้องแจ้งเตือน');
      }

      // พยายามดึงข้อมูลช่องจาก Discord
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return await interaction.reply('⚠️ ไม่พบช่องที่ตั้งค่าไว้หรือช่องไม่รองรับข้อความ');
      }

      // ส่งข้อความทดสอบไปยังช่อง
      await channel.send('✅ ระบบทดสอบส่งข้อความจากคำสั่ง /testenvchannel สำเร็จ!');
      await interaction.reply(`✅ ส่งข้อความทดสอบไปยังช่อง <#${channelId}> เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', err);
      await interaction.reply('❌ เกิดข้อผิดพลาดในการทดสอบ');
    }
  }
};
