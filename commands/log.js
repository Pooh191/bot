const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getCache } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('ตรวจสอบประวัติธุรกรรมและการเคลื่อนไหวทางการเงินทั้งหมดในระบบ'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let logs = getCache('history_logs') || [];

    if (logs.length === 0) {
      return interaction.editReply('📭 ยังไม่มีประวัติการบันทึกข้อมูลใดๆ ในระบบ');
    }

    // Admin can see all logs, Citizens can only see public ones
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const viewableLogs = isAdmin ? logs : logs.filter(log => log.isPublic === true);

    if (viewableLogs.length === 0) {
      return interaction.editReply('📭 คุณไม่ได้รับอนุญาตให้ดูข้อมูลที่บันทึกไว้ ณ ขณะนี้ หรือยังไม่มีบันทึกกิจกรรมสาธารณะ');
    }

    const itemsToShow = viewableLogs.slice(0, 8); // Show top 8 to stay under 1024 chars
    const embed = new EmbedBuilder()
      .setTitle(isAdmin ? '🛡️ ประวัติการเคลื่อนไหว (หน้าต่างแอดมิน)' : '📜 ประวัติกิจกรรมประชาชน')
      .setColor(isAdmin ? 'Red' : 'Blue')
      .setDescription(isAdmin ? 'รายการธุรกรรมทั้งหมด (รวมเสกเงิน/ลบเงิน)' : 'รายการกิจกรรมและการทำงานของประชาชน')
      .setTimestamp();

    let textContent = '';
    for (const item of itemsToShow) {
      const timeStr = `<t:${Math.floor(item.timestamp / 1000)}:R>`;
      textContent += `**${item.title}** ${timeStr}\n${item.description}\n\n`;
    }

    if (textContent.length > 1000) {
      textContent = textContent.substring(0, 1000) + '...';
    }

    embed.addFields({ name: 'ประวัติล่าสุด', value: textContent || '-' });

    await interaction.editReply({ embeds: [embed] });
  }
};
