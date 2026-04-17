const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatingProfile = require('../models/DatingProfile');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('datingclear')
    .setDescription('🗑️ (Admin) ลบข้อมูลโปรไฟล์หาคู่ทั้งหมด (Reset Data)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('confirm')
      .setDescription('พิมพ์ "yes" เพื่อยืนยันการลบข้อมูลทั้งหมด')
      .setRequired(true)
    ),

  async execute(interaction) {
    const confirm = interaction.options.getString('confirm');
    if (confirm !== 'yes') {
      return interaction.reply({ content: '❌ ระบบยกเลิก กรุณาพิมพ์ yes เพื่อยืนยันเท่านั้น', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await DatingProfile.deleteMany({});
      await interaction.editReply({ content: '✅ ลบข้อมูลโปรไฟล์หาคู่ที่ทดสอบค้างอยู่ **ทั้งหมด** เรียบร้อยแล้ว! (ตอนนี้ฐานข้อมูลว่างเปล่าครับ)' });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  }
};
