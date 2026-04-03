const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetprov')
    .setDescription('ลบยศ 12 จังหวัดเดิมออกจากทุกคนในเซิร์ฟเวอร์ และล้างประวัติการคิวทั้งหมด')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const newRolesInOrder = [
      'CMI | เชียงใหม่', 'CRI | เชียงราย', 'LPN | ลำพูน',
      'NMA | นครราชสีมา', 'KKN | ขอนแก่น', 'UDN | อุดรธานี',
      'BKK | กรุงเทพมหานคร', 'AYA | พระนครศรีอยุธยา', 'NBI | นนทบุรี',
      'PKT | ภูเก็ต', 'SKA | สงขลา', 'SNI | สุราษฎร์ธานี'
    ];

    const oldRolesInOrder = [
      'DKT | จังหวัดดอกคำใต้', 'TAK | จังหวัดธนเกียรติโกศล', 'PMP | จังหวัดภูมิพัฒน์',
      'ARL | อาร์ลิงตันมหานคร', 'KS  | จังหวัดไกรสร', 'JMD | จังหวัดจีมินดง', 
      'CNG | จังหวัดชางนย็อง', 'SRR | จังหวัดสราญรมย์', 'SS | จังหวัดซอลซัง', 
      'GDF | จังหวัดโกลเดนฟอร์จ', 'MHJ | จังหวัดมุนฮย็อน'
    ];

    const allProvinceNames = [...newRolesInOrder, ...oldRolesInOrder];

    const rolesToRemove = allProvinceNames.map(name => 
      interaction.guild.roles.cache.find(r => r.name === name)
    ).filter(r => r);

    await interaction.guild.members.fetch();
    const members = interaction.guild.members.cache;
    let removedCount = 0;

    for (const [memberId, member] of members) {
      if (member.user.bot) continue;

      const hasProvRoles = member.roles.cache.filter(role => rolesToRemove.some(rt => rt.id === role.id));
      if (hasProvRoles.size > 0) {
        await member.roles.remove(hasProvRoles).catch(() => {});
        removedCount++;
      }
    }

    setCacheAndSave('uid_roles', {});
    setCacheAndSave('counter', { count: 0 });

    await interaction.editReply('✅ ล้างยศจังหวัดเก่าและใหม่ทั้งหมดเรียบร้อยแล้ว พร้อมสำหรับสุ่มใหม่!');

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      '🧹 ล้างค่าระบบสัญชาติ (Reset Provinces)', 
      `**เจ้านายสั่งการลบ:** <@${interaction.user.id}>\n**การกระทำ:** ลบล้างข้อมูลจังหวัดของชาวเมืองทุกคนพร้อมกัน (${rolesToRemove.length} จังหวัด) ระบบถูกฟอแมตแล้วจ้า`, 
      'DarkRed',
      false
    );
  }
};
