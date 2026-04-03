const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomprov')
    .setDescription('ดึงประชาชนที่ยังไม่มีจังหวัดมาสุ่มแจกให้ 12 จังหวัดอย่างเท่าเทียมกัน')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      const newRolesInOrder = [
        'CMI | เชียงใหม่', 'CRI | เชียงราย', 'LPN | ลำพูน',
        'NMA | นครราชสีมา', 'KKN | ขอนแก่น', 'UDN | อุดรธานี',
        'BKK | กรุงเทพมหานคร', 'AYA | พระนครศรีอยุธยา', 'NBI | นนทบุรี',
        'PKT | ภูเก็ต', 'SKA | สงขลา', 'SNI | สุราษฎร์ธานี'
      ];

      const rolesToAdd = newRolesInOrder.map(name => ({
        name, 
        role: interaction.guild.roles.cache.find(r => r.name === name)
      })).filter(r => r.role);

      if (rolesToAdd.length === 0) {
        return interaction.editReply('❌ ไม่พบยศของไทยในระบบใน Discord เลย รบกวนสร้างยศจังหวัดให้ครบ 12 จังหวัดก่อนครับ (เช็คชื่อให้เป๊ะด้วยน้า)');
      }

      await interaction.guild.members.fetch();
      
      const tznRoles = [
        interaction.guild.roles.cache.find(r => r.name === 'THC | Thailand Citizen'),
        interaction.guild.roles.cache.find(r => r.name === 'CIV | Arlington Citizen')
      ].filter(r => r);

      const members = interaction.guild.members.cache;
      const citizensToAssign = [];

      for (const [memberId, member] of members) {
        if (member.user.bot) continue;

        const isCitizen = tznRoles.some(tznRole => member.roles.cache.has(tznRole.id));
        const hasProvince = rolesToAdd.some(rt => member.roles.cache.has(rt.role.id));

        if (isCitizen && !hasProvince) {
          citizensToAssign.push(member);
        }
      }

      if (citizensToAssign.length === 0) {
        return interaction.editReply('✅ ไม่มีประชาชนคนไหนที่ตกหล่นจังหวัดเลย (ทุกคนมีจังหวัดกันครบแล้ว)');
      }

      // สุ่มคน
      for (let i = citizensToAssign.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [citizensToAssign[i], citizensToAssign[j]] = [citizensToAssign[j], citizensToAssign[i]];
      }

      // สุ่มรายชื่อจังหวัดด้วย เพื่อไม่ให้เรียงจาก เชียงใหม่->เชียงราย เสมอ
      for (let i = rolesToAdd.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesToAdd[i], rolesToAdd[j]] = [rolesToAdd[j], rolesToAdd[i]];
      }

      let uidRoles = getCache('uid_roles') || {};
      let currentCounter = getCache('counter')?.count || 0;

      let assignedCount = 0;
      for (let i = 0; i < citizensToAssign.length; i++) {
          const member = citizensToAssign[i];
          const provinceObj = rolesToAdd[currentCounter % rolesToAdd.length];
          
          await member.roles.add(provinceObj.role).catch(() => {});
          uidRoles[member.id] = provinceObj.name;
          
          assignedCount++;
          currentCounter++;
      }

      setCacheAndSave('uid_roles', uidRoles);
      setCacheAndSave('counter', { count: currentCounter });

      await interaction.editReply(`✅ **สุ่มแจกจังหวัดสำเร็จเรียบร้อย!**\n- ดึงประชาชนที่รอรับจังหวัดมาจำนวน ${assignedCount} คน\n- สุ่มกระจาย 12 จังหวัดให้ครบทุกภูมิภาคอัตโนมัติเรียบร้อย!\n- ตรวจเช็คประวัติลง Database สำเร็จ`);

      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(
        interaction.client, 
        '🎲 สุ่มแจกจังหวัด (Random Province)', 
        `**แอดมิน:** <@${interaction.user.id}>\n**การกระทำ:** สั่งสุ่มแจกจังหวัดให้คนใหม่ที่ยังไม่มี (${assignedCount} คน)\n**ผลลัพธ์:** แจกกระจายให้ครบ 12 จังหวัดเรียบร้อย`, 
        'Gold',
        false
      );
    } catch (e) {
      console.error(e);
      await interaction.editReply(`❌ เกิดข้อขัดข้องระหว่างสุ่ม: ${e.message}`);
    }
  }
};
