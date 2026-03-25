const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy-stats')
    .setDescription('แสดงสถิติเศรษฐกิจทั้งหมด'),
  async execute(interaction) {
    // โหลดข้อมูลผู้ใช้จากไฟล์ JSON
    let users = {};
    const filePath = path.join(__dirname, '../data/users.json');

    // ตรวจสอบว่าไฟล์ผู้ใช้มีอยู่หรือไม่
    if (fs.existsSync(filePath)) {
      users = JSON.parse(fs.readFileSync(filePath));
    }

    // คำนวณยอดรวมของเงินสดและเงินในธนาคาร
    let totalCash = 0;
    let totalBank = 0;

    for (const userId in users) {
      if (users[userId].balance) {
        totalCash += users[userId].balance;  // เพิ่มยอดเงินสด
      }
      if (users[userId].bank) {
        totalBank += users[userId].bank;  // เพิ่มยอดเงินในธนาคาร
      }
    }

    // คำนวณ Total รวมทั้งหมด
    const total = totalCash + totalBank;

    // สร้าง Embed เพื่อแสดงข้อมูลในกรอบ
    const embed = new EmbedBuilder()
      .setColor('#FFD700') // ตั้งค่าสีของกรอบ (สีทอง)
      .setTitle('📊 ภาพรวมเศรษฐกิจระดับประเทศ (Economy Stats)') // ตั้งชื่อหัวข้อ
      .setDescription('ข้อมูลสถิติเศรษฐกิจและเงินสดทั้งหมดในระบบ') // คำอธิบาย
      .addFields(
        { name: 'เงินสดหมุนเวียน (Cash)', value: `${totalCash.toLocaleString()} บาท`, inline: true },
        { name: 'เงินในคลัง/ธนาคาร (Bank)', value: `${totalBank.toLocaleString()} บาท`, inline: true },
        { name: 'เงินทั้งหมดในระบบ (Net Worth)', value: `${total.toLocaleString()} บาท`, inline: true }
      )
      .setTimestamp() // เพิ่มเวลาปัจจุบัน
      .setFooter({ text: 'ข้อมูลจากระบบ' }) // ใส่ฟุตเตอร์

    // ส่งข้อมูล Embed
    return interaction.reply({ embeds: [embed] });
  }
};
