const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoneyall')
    .setDescription('หัก/ยึดเงินสดจากประชากรทุกคนในเมือง (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => 
      opt.setName('amount')
         .setDescription('จำนวนเงินที่ต้องการหักจากทุกคน')
         .setRequired(true)
         .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const amount = interaction.options.getInteger('amount');
    
    // ดึงสมาชิกเพื่อเช็คยศแบบมี Delay (await)
    const members = await interaction.guild.members.fetch();
    const citizenRoleName = 'THC | Thailand Citizen';

    // โหลดฐานข้อมูลหลังจาก Await ป้องกันโอกาสเซฟทับตัวที่อัปเดตไปแล้ว
    const users = loadUsers();
    let count = 0;

    for (const id in users) {
      if (id !== 'undefined' && users[id] && typeof users[id] === 'object') {
        const member = members.get(id);
        // เช็คว่าอยู่ในเซิร์ฟเวอร์ และมียศสัญชาติไทยหรือไม่
        if (member && member.roles.cache.some(role => role.name === citizenRoleName)) {
            const bal = users[id].balance || 0;
            users[id].balance = Math.max(0, bal - amount); // ไม่ให้เงินติดลบจากการหัก
            count++;
        }
      }
    }

    saveUsers(users);

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '💸 นโยบายฉุกเฉิน (RemoveMoneyAll)',
      `**แอดมิน:** <@${interaction.user.id}>\n**การกระทำ:** เรียกคืน/ริบเงินรายบุคคล\n**จำนวนเงินที่เก็บต่อคน:** -${amount.toLocaleString()} บาท\n**จำนวนประชากรที่โดน:** ${count} คน`,
      'Red',
      false
    );

    await interaction.editReply({ content: `✅ ดำเนินการหักเงิน **${amount.toLocaleString()} บาท (THB)** จากประชากรที่มีสัญชาติไทยทั้งหมด **${count} คน** เรียบร้อยแล้ว! (เงินจะไม่ติดลบ)` });
  }
};
