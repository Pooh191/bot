const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers, calculateTax } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taxpayers')
    .setDescription('📋 (Admin) ตรวจสอบรายชื่อผู้เล่นที่เข้าข่ายต้องเสียภาษี')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();
    const users = loadUsers();
    const taxpayers = [];

    // ดึงสมาชิกทั้งหมดในเซิร์ฟเวอร์เพื่อเช็คว่ายังอยู่ไหม
    const members = await interaction.guild.members.fetch();

    for (const [userId, userObj] of Object.entries(users)) {
      if (userId === 'undefined') continue;
      
      const member = members.get(userId);
      if (!member || member.user.bot) continue; // ข้ามบอทหรือคนที่ออกเซิร์ฟแล้ว

      const totalWealth = (userObj.balance || 0) + (userObj.bank || 0);

      // ใช้ฟังก์ชันส่วนกลางคำนวณภาษี
      const result = calculateTax(totalWealth);
      const taxAmt = result.hasOwnProperty('tax') ? result.tax : result; // รองรับทั้งแบบเก่าและแบบใหม่ (เผื่อมีการส่งมาเป็นตัวเลขตรงๆ)
      const taxRate = result.hasOwnProperty('rate') ? result.rate : 'ตามขั้น';

      if (taxAmt > 0) {
        taxpayers.push({
          userId: userId,
          wealth: totalWealth,
          tax: taxAmt,
          rate: taxRate
        });
      }
    }

    // เรียงลำดับคนที่ต้องจ่ายภาษีเยอะสุดไปน้อยสุด
    taxpayers.sort((a, b) => b.tax - a.tax);

    if (taxpayers.length === 0) {
      return interaction.editReply({ content: '✅ ปัจจุบันยังไม่มีผู้เล่นคนใดที่มียอดเงินถึงเกณฑ์ต้องเสียภาษีครับ' });
    }

    // สร้างทีละ 10 คนต่อ 1 หน้า (Embed จำกัดความยาว)
    const itemsPerPage = 15;
    const totalPages = Math.ceil(taxpayers.length / itemsPerPage);
    const currentPage = 1;

    let descriptionStr = `พบผู้ที่เข้าข่ายเสียภาษีทั้งหมด **${taxpayers.length}** คน\n\n`;
    
    for (let i = 0; i < Math.min(itemsPerPage, taxpayers.length); i++) {
        const p = taxpayers[i];
        descriptionStr += `**${i + 1}.** <@${p.userId}>\n`;
        descriptionStr += `┣ 💰 ทรัพย์สินรวม: **${p.wealth.toLocaleString()}** บาท\n`;
        descriptionStr += `┗ 💸 ภาษีที่ต้องจ่าย: **${typeof p.tax === 'number' ? p.tax.toLocaleString() : p.tax}** บาท (${p.rate}%)\n`;
    }

    if (taxpayers.length > itemsPerPage) {
        descriptionStr += `\n*...และผู้เล่นอื่นๆ อีก ${taxpayers.length - itemsPerPage} คน*`;
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 รายชื่อผู้เสียภาษี (Taxpayers)')
      .setDescription(descriptionStr)
      .setColor('#FF0000')
      .setFooter({ text: 'กรมสรรพากรแห่งชาติดิสคอร์ด' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
