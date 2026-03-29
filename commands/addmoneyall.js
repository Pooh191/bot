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
    const users = loadUsers();
    let count = 0;

    for (const id in users) {
      if (id !== 'undefined' && users[id] && typeof users[id] === 'object') {
        users[id].balance = (users[id].balance || 0) + amount;
        count++;
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

    await interaction.editReply({ content: `✅ ดำเนินการแจกเงิน **${amount.toLocaleString()} บาท (THB)** ให้ประชากรทั้งหมด **${count} คน** เรียบร้อยแล้ว!` });
  }
};
