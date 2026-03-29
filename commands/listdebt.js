const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listdebt')
    .setDescription('📋 ดูรายชื่อประชากรที่เป็นหนี้ธนาคารทั้งหมด (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const users = loadUsers();

    // กรองหาเฉพาะคนที่มีหนี้
    let debtors = [];
    for (const [id, user] of Object.entries(users)) {
      if (id === 'undefined') continue;

      const principal = user.loanPrincipal || 0;
      const interest = user.loanInterest || 0;
      const totalDebt = principal + interest;

      if (totalDebt > 0) {
        debtors.push({
          id: id,
          principal: principal,
          interest: interest,
          total: totalDebt
        });
      }
    }

    if (debtors.length === 0) {
      return interaction.reply({ content: '✅ ปัจจุบันไม่มีประชากรคนใดเป็นหนี้ธนาคาร!' });
    }

    // เรียงจากหนี้รวม (มากไปน้อย)
    debtors.sort((a, b) => b.total - a.total);

    const embed = new EmbedBuilder()
      .setTitle('📋 บัญชีดำลูกหนี้ธนาคารแห่งประเทศไทย')
      .setColor('Orange')
      .setDescription(`ปัจจุบันกระทรวงการคลังตรวจพบลูกหนี้ทั้งหมด **${debtors.length} คน**`)
      .setTimestamp()
      .setFooter({ text: 'Thailand Bot status' });

    let debtListString = '';
    let totalAllDebts = 0;

    debtors.forEach((d, index) => {
      totalAllDebts += d.total;
      if (index < 15) { // แสดง 15 อันดับบนกระดาน (ป้องกันข้อความยาวเกินลิมิต Discord)
        debtListString += `**${index + 1}.** <@${d.id}> - ยอดรวม: **${d.total.toLocaleString()} บาท**\n`;
        debtListString += `└ *(เงินต้น ${d.principal.toLocaleString()} | ดอกเบี้ย ${d.interest.toLocaleString()})*\n\n`;
      }
    });

    if (debtors.length > 15) {
      debtListString += `*...และประชากรหน้าใหม่อีก ${debtors.length - 15} คน*\n`;
    }

    embed.addFields(
      { name: 'ผู้ถือครองหนี้สูงสุด 15 อันดับ', value: debtListString || 'ไม่มีข้อมูล', inline: false },
      { name: '🔥 หนี้สะสมรวมทั้งประเทศ', value: `🚨 **${totalAllDebts.toLocaleString()} บาท (THB)**`, inline: false }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
