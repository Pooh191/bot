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

      // 1. รวบรวมข้อมูลสมาชิกจาก Database
      const provinceGroups = {};
      let totalCount = 0;

      for (const uid of uids) {
        const province = data[uid];
        if (!provinceGroups[province]) provinceGroups[province] = [];
        
        // ใช้ Tag (@User) แทนชื่อพิมพ์ เพื่อให้คลิกดูโปรไฟล์ได้ง่าย และไม่แจ้งเตือน (เพราะอยู่ใน Embed)
        provinceGroups[province].push(`<@${uid}>`);
        totalCount++;
      }

      // 2. เรียงลำดับจังหวัดและสร้าง Embed
      const sortedProvinces = Object.keys(provinceGroups).sort();
      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🏘️ รายชื่อประชาชนจำแนกตามจังหวัด')
        .setDescription(`สรุปรายชื่อผู้ที่ได้รับจังหวัดแล้วทั้งหมด **${totalCount}** คน (เรียงตามภูมิภาค)`)
        .setTimestamp();

      for (const province of sortedProvinces) {
        const members = provinceGroups[province];
        const memberListText = members.join(', ');
        
        // ตัดข้อความถ้ามันยาวเกินไปสำหรับ field value (Discord จำกัด 1024 ตัวอักษร)
        const displayText = memberListText.length > 1000 ? memberListText.substring(0, 1000) + '...' : memberListText;
        
        embed.addFields({ 
          name: `📌 ${province} [ ${members.length} คน ]`, 
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
