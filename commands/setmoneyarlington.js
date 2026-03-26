const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmoneyarlington')
    .setDescription('ตั้งค่าเงินเริ่มต้นเมื่อผู้ใช้ใหม่เข้าเซิร์ฟเวอร์')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('amount')
         .setDescription('จำนวนเงินเริ่มต้น (DL Arlington)')
         .setRequired(true)
    ),
  async execute(interaction) {
    // รับตัวเลือก amount ที่ผู้ใช้กรอกเข้ามา
    const amount = interaction.options.getInteger('amount');

    // โหลด config.json (สร้างไฟล์ใหม่ถ้ายังไม่มี)
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // อัปเดตเงินเริ่มต้น
    config.startingBalance = amount;

    // บันทึกกลับไฟล์
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    // ตอบกลับจำนวนที่ตั้งใหม่
    await interaction.reply(`✅ ตั้งค่าเงินเริ่มต้นเป็น ${amount} DL Arlington เรียบร้อยแล้ว`);
  }
};
