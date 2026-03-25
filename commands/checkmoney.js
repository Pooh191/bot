// commands/checkmoney.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkmoney')
    .setDescription('ตรวจสอบยอดเงินของผู้ใช้ในระบบ')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('ผู้ใช้ที่ต้องการตรวจสอบยอดเงิน')
        .setRequired(true)),
  async execute(interaction) {
    // รับข้อมูลผู้ใช้
    const user = interaction.options.getUser('user');
    const userId = user.id;

    // โหลดข้อมูลผู้ใช้จากไฟล์ JSON
    const users = loadUsers();

    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (!users[userId]) {
      return interaction.reply({ content: `ไม่พบข้อมูลของผู้ใช้ ${user.username}`, ephemeral: true });
    }

    // ยอดเงิน
    const userData = users[userId];
    const balance = userData.balance || 0;
    const bank = userData.bank || 0; 
    const level = userData.level || 1;
    const xp = userData.xp || 0;
    const invCount = userData.inventory ? userData.inventory.length : 0;

    // สร้าง Embed
    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle(`💳 โปรไฟล์ของคุณ ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '📊 ระดับชั้น (Level)', value: `🏅 เลเวล ${level} (XP: ${xp}/${level * 100})`, inline: false },
        { name: '💵 ยอดเงินสด', value: `${balance.toLocaleString()} บาท`, inline: true },
        { name: '🏦 เงินในธนาคาร', value: `${bank.toLocaleString()} บาท`, inline: true },
        { name: '🎒 กระเป๋าเดินทาง', value: `${invCount} ชิ้น (ใช้ /inventory เพื่อดู)`, inline: true }
      )
      .setTimestamp();

    // ส่ง Embed
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
