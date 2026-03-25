const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 ดูข้อมูลโปรไฟล์ เลเวล และทรัพย์สินของคุณ')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('เลือกผู้ใช้ที่ต้องการดูโปรไฟล์ (ว่างไว้เพื่อดูของตัวเอง)')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const { user } = getUser(targetUser.id);

    const nextLevelXP = (user.level || 1) * 100;
    const xpBarLength = 10;
    const progress = Math.floor((user.xp / nextLevelXP) * xpBarLength);
    const progressBar = '🟩'.repeat(progress) + '⬜'.repeat(xpBarLength - progress);

    const p = user.loanPrincipal || 0;
    const i = user.loanInterest || 0;
    const totalDebt = p + i;

    const embed = new EmbedBuilder()
      .setTitle(`👤 โปรไฟล์ของ ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor('Blue')
      .addFields(
        { name: '📊 ระดับและประสบการณ์', value: `**เลเวล:** ${user.level || 1}\n**XP:** ${user.xp || 0} / ${nextLevelXP}\n${progressBar}`, inline: false },
        { name: '💰 สถานะการเงิน', value: `**เงินสด:** ${(user.balance || 0).toLocaleString()} บาท\n**ธนาคาร:** ${(user.bank || 0).toLocaleString()} บาท${totalDebt > 0 ? `\n**💳 ยอดกู้คงเหลือ:** ${totalDebt.toLocaleString()} บาท` : ''}`, inline: true },
        { name: '🎒 กระเป๋าสัมภาระ', value: `ไอเทมทั้งหมด: ${(user.inventory || []).length} ชิ้น\n(ใช้ \`/inventory\` เพื่อดูรายละเอียด)`, inline: true }
      )
      .setFooter({ text: 'THAILAND Economy System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
