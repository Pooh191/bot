const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoneyall')
    .setDescription('แจกเงินสดให้ประชากรทุกคนในเมือง (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => 
      opt.setName('amount')
         .setDescription('จำนวนเงินที่ต้องการแจกให้ทุกคน')
         .setRequired(true)
         .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const amount = interaction.options.getInteger('amount');
    
    // ดึงสมาชิกเพื่อเช็คยศสัญชาติแบบช้าๆ
    const members = await interaction.guild.members.fetch();
    const citizenRoleName = 'THC | Thailand Citizen';

    // โหลดไฟล์ผู้ใช้แบบ Synchronous เพิ่งโหลดเสร็จก็เปลี่ยนแปลง+เซฟเลย ป้องกันหลุด
    const users = loadUsers();
    let count = 0;

    for (const id in users) {
      if (id !== 'undefined' && users[id] && typeof users[id] === 'object') {
        const member = members.get(id);
        // เช็คว่าอยู่ในเซิร์ฟเวอร์ และมียศสัญชาติไทยหรือไม่
        if (member && member.roles.cache.some(role => role.name === citizenRoleName)) {
            users[id].balance = (users[id].balance || 0) + amount;
            count++;
        }
      }
    }

    saveUsers(users);
    
    // บันทึกลง Log ถ้าต้องการ
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '💰 นโยบายแจกเงิน (AddMoneyAll)',
      `**แอดมิน:** <@${interaction.user.id}>\n**การกระทำ:** อัดฉีดเงินให้รายบุคคล\n**จำนวนเงินต่อคน:** +${amount.toLocaleString()} บาท\n**จำนวนประชากรที่ได้:** ${count} คน`,
      'Green',
      false
    );

    await interaction.editReply({ content: `✅ ดำเนินการแจกเงิน **${amount.toLocaleString()} บาท (THB)** ให้ประชากรที่มีสัญชาติไทยทั้งหมด **${count} คน** เรียบร้อยแล้ว!` });
  }
};
