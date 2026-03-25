const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listprovinces')
    .setDescription('แสดงรายชื่อประชาชนและจังหวัดทั้งหมดในเซิร์ฟเวอร์'),

  async execute(interaction) {
    const dbPath = path.join(__dirname, '..', 'data', 'uid_roles.json');
    
    if (!fs.existsSync(dbPath)) {
      return interaction.reply({ content: '❌ ยังไม่มีข้อมูลการแจกจังหวัดในระบบเลยครับ', ephemeral: true });
    }

    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const uids = Object.keys(data);

      if (uids.length === 0) {
        return interaction.reply({ content: '✅ ยังไม่มีใครได้รับจังหวัดในระบบตอนนี้ครับ', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: false });

      // รวบรวมข้อมูลสมาชิก
      const provinceGroups = {};
      let totalCount = 0;

      for (const uid of uids) {
        const province = data[uid];
        if (!provinceGroups[province]) provinceGroups[province] = [];
        
        try {
          const member = await interaction.guild.members.fetch(uid).catch(() => null);
          const name = member ? member.displayName : `(Unknown User: ${uid})`;
          provinceGroups[province].push(name);
          totalCount++;
        } catch (e) {
          provinceGroups[province].push(`(UID: ${uid})`);
          totalCount++;
        }
      }

      const sortedProvinces = Object.keys(provinceGroups).sort();
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🏘️ รายชื่อประชาชนและจังหวัด (Province List)')
        .setDescription(`สรุปรายชื่อผู้ที่ได้รับจังหวัดแล้วทั้งหมด **${totalCount}** คน`)
        .setTimestamp();

      for (const province of sortedProvinces) {
        const members = provinceGroups[province];
        const memberListText = members.join(', ');
        
        // ตัดข้อความถ้ามันยาวเกินไปสำหรับ field value (Discord จำกัด 1024 ตัวอักษร)
        const displayText = memberListText.length > 1000 ? memberListText.substring(0, 1000) + '...' : memberListText;
        
        embed.addFields({ 
          name: `📍 ${province} (${members.length} คน)`, 
          value: displayText || 'ไม่มีสมาชิก' 
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการโหลดข้อมูลครับ' });
      } else {
        await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการโหลดข้อมูลครับ', ephemeral: true });
      }
    }
  }
};
