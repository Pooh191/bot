const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removexp')
    .setDescription('📉 ลดค่าประสบการณ์ (XP) ของสมาชิก (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
      option.setName('user')
        .setDescription('เลือกผู้ใช้งาน')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('จำนวน XP ที่ต้องการหักออก')
        .setRequired(true)
        .setMinValue(1)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const { users, user } = getUser(targetUser.id);
    
    // หัก XP แต่ไม่ให้ติดลบต่ำกว่า 0
    const oldXP = user.xp || 0;
    user.xp = Math.max(0, oldXP - amount);
    
    saveUsers(users);

    const embed = new EmbedBuilder()
      .setTitle('📉 การหักค่าประสบการณ์ (Admin)')
      .setColor('Red')
      .setDescription(`แอดมิน <@${interaction.user.id}> ได้ลด **${amount} XP** จาก <@${targetUser.id}>`)
      .addFields({ name: 'ยอด XP ปัจจุบัน', value: `**${user.xp} XP** (เลเวลคงเดิม)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '📉 หักค่า XP (RemoveXP)',
      `**แอดมิน:** <@${interaction.user.id}>\n**เป้าหมาย:** <@${targetUser.id}>\n**จำนวน:** -${amount} XP\n**XP คงเหลือ:** ${user.xp}`,
      'Red',
      false
    );
  }
};
