const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addXP, getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('✨ เพิ่มค่าประสบการณ์ (XP) ให้สมาชิกคนนั้นๆ (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
      option.setName('user')
        .setDescription('เลือกผู้ใช้งาน')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('จำนวน XP ที่ต้องการบวกเพิ่ม')
        .setRequired(true)
        .setMinValue(1)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // ใช้ฟังก์ชัน addXP ที่มีอยู่ ซึ่งรวมถึงการเช็คเลเวลอัปอัตโนมัติ
    const result = addXP(targetUser.id, amount);

    const embed = new EmbedBuilder()
      .setTitle('✨ การมอบค่าประสบการณ์ (Admin)')
      .setColor('Blue')
      .setDescription(`แอดมิน <@${interaction.user.id}> ได้มอบ **${amount} XP** ให้กับ <@${targetUser.id}>`)
      .setTimestamp();

    if (result.leveledUp) {
      embed.addFields({ name: '🎊 เลเวลอัป!', value: `ยินดีด้วย! ตอนนี้เขาเลเวล **${result.level}** แล้ว!` });
      embed.setColor('Gold');
    }

    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '✨ เพิ่มค่า XP (AddXP)',
      `**แอดมิน:** <@${interaction.user.id}>\n**เป้าหมาย:** <@${targetUser.id}>\n**จำนวน:** +${amount} XP\n**สถานะ:** ${result.leveledUp ? `เลเวลอัปเป็น ${result.level}` : 'บวก XP สำเร็จ'}`,
      'Aqua',
      false
    );
  }
};
