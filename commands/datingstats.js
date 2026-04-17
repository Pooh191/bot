const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const DatingProfile = require('../models/DatingProfile');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('datingstats')
    .setDescription('📊 (Admin) ดูสถิติและจำนวนคนเล่นระบบหาเพื่อน')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const totalProfiles = await DatingProfile.countDocuments({});
      
      const totalMatchesList = await DatingProfile.find({}, 'matches');
      let totalMatches = 0;
      totalMatchesList.forEach(p => totalMatches += p.matches.length);
      const realPairs = Math.floor(totalMatches / 2);

      const provinceStats = await DatingProfile.aggregate([
        { $group: { _id: "$province", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const topProvincesText = provinceStats.map((p, i) => `${i+1}. ${p._id} (${p.count} คน)`).join('\n') || 'ไม่มีข้อมูล';

      const allUsers = await DatingProfile.find({}).limit(20);
      const sampleUsers = allUsers.map(u => `- **${u.nickname}** (จ.${u.province})`).join('\n') || 'ไม่มีข้อมูล';

      const embed = new EmbedBuilder()
        .setColor('#ff479b')
        .setTitle('📊 ข้อมูลสถิติผู้ใช้งานระบบหาเพื่อน')
        .addFields(
          { name: '👥 ผู้ใช้งานทั้งหมด', value: `${totalProfiles} คน`, inline: true },
          { name: '💞 คู่ที่แมตช์สำเร็จ', value: `${realPairs} คู่`, inline: true },
          { name: '📍 10 จังหวัดคนเล่นเยอะสุด', value: topProvincesText, inline: false },
          { name: '📄 ตัวอย่างผู้ใช้งาน (ล่าสุด 20 คน)', value: sampleUsers, inline: false } // เผื่อแอดมินดูคนเล่น
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
  }
};
