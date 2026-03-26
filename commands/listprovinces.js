const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const rolesInOrder = [
  'CMI | เชียงใหม่', 'CRI | เชียงราย', 'LPN | ลำพูน',
  'NMA | นครราชสีมา', 'KKN | ขอนแก่น', 'UDN | อุดรธานี',
  'BKK | กรุงเทพมหานคร', 'AYA | พระนครศรีอยุธยา', 'NBI | นนทบุรี',
  'PKT | ภูเก็ต', 'SKA | สงขลา', 'SNI | สุราษฎร์ธานี'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listprovinces')
    .setDescription('สรุปรายชื่อประชาชนทั้งหมดจำแนกตามจังหวัด (เรียลไทม์)'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false }).catch(() => {});

      // ดึงข้อมูลสมาชิกทั้งหมดแบบ Real-time
      const members = await interaction.guild.members.fetch();
      const provinceGroups = {};
      let totalCount = 0;

      // เริ่มสแกนทุกคนในเซิร์ฟเวอร์
      members.forEach(member => {
        if (member.user.bot) return;

        // หายศจังหวัดที่คนคนนั้นมี
        const provinceRole = member.roles.cache.find(r => rolesInOrder.includes(r.name));
        
        if (provinceRole) {
          if (!provinceGroups[provinceRole.name]) provinceGroups[provinceRole.name] = [];
          provinceGroups[provinceRole.name].push(member.id);
          totalCount++;
        }
      });

      if (totalCount === 0) {
        if (interaction.deferred || interaction.replied) {
          return await interaction.editReply({ content: '❌ ยังไม่มีสมาชิกคนไหนกดยศจังหวัดเลยครับ' }).catch(() => {});
        }
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🏘️ ทะเบียนราษฎร์ - รายชื่อประชาชนจำแนกตามจังหวัด')
        .setDescription(`ตรวจพบประชาชนที่ลงทะเบียนแล้วทั้งหมด **${totalCount}** คน`)
        .setTimestamp();

      // เรียงลำดับจังหวัดตามที่กำหนดไว้ใน Array
      for (const roleName of rolesInOrder) {
        const uids = provinceGroups[roleName];
        if (uids && uids.length > 0) {
          // จัดรูปแบบ: หนึ่งคนต่อหนึ่งบรรทัด พร้อมจุด Bullet
          const memberListText = uids.map(id => `• <@${id}>`).join('\n');
          
          // ตรวจสอบความยาวตัวอักษรของ Discord Field (จำกัด 1024)
          const displayText = memberListText.length > 1000 ? memberListText.substring(0, 1000) + '\n...และคนอื่นๆ' : memberListText;

          embed.addFields({ 
            name: `📍 ${roleName} [ ${uids.length} คน ]`, 
            value: displayText || 'ไม่มีข้อมูล' 
          });
        }
      }

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
      }

    } catch (err) {
      console.error(err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Discord Server' }).catch(() => {});
      }
    }
  }
};
