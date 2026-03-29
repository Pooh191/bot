const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ตรวจสอบสถานะการตอบสนองความเร็วของบอท (Ping)'),
    
  async execute(interaction) {
    // ส่งข้อความไปก่อนเพื่อนำเวลามาคำนวณความหน่วง
    const sent = await interaction.reply({ content: '🏓 กำลังวัดปิง (Pinging...)', fetchReply: true });
    
    // คำนวณความหน่วงจากเวลาที่บอทตอบ กลับเทียบกับตอนที่กดใช้คำสั่ง
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    // กำหนดสีตามความเร็ว
    let statusColor = 'Green';
    if (latency > 200) statusColor = 'Yellow';
    if (latency > 500) statusColor = 'Red';

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(statusColor)
      .addFields(
        { name: '🤖 ความหน่วงบอท (Bot Delay)', value: `**${latency}** ms`, inline: true },
        { name: '🌐 การเชื่อมต่อดิสคอร์ด (API Latency)', value: `**${apiLatency}** ms`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Arlington Bot Status' });

    // แก้ไขข้อความเดิมเป็นกล่อง Embed
    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
