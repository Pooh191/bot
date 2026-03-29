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
    const amount = interaction.options.getInteger('amount');
    const users = loadUsers();
    let count = 0;

    for (const id in users) {
      if (id !== 'undefined') {
        const bal = users[id].balance || 0;
        users[id].balance = Math.max(0, bal - amount); // ไม่ให้เงินติดลบจากการหัก
        count++;
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

    await interaction.reply({ content: `✅ ดำเนินการหักเงิน **${amount.toLocaleString()} บาท (THB)** จากประชากรทั้งหมด **${count} คน** เรียบร้อยแล้ว! (เงินจะไม่ติดลบ หากมีเงินไม่ถึงยอดที่หัก จะถูกหักจนเหลือ 0 บาท)` });
  }
};
