const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUsers, calculateTax } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tax')
    .setDescription('💸 ตรวจสอบยอดภาษีที่คุณจะต้องชำระในวันที่ 1 ของเดือน'),

  async execute(interaction) {
    const users = loadUsers();
    const user = users[interaction.user.id];

    if (!user) {
      return interaction.reply({ content: '❌ ไม่พบข้อมูลของคุณในระบบเศรษฐกิจ', ephemeral: true });
    }

    const totalWealth = (user.balance || 0) + (user.bank || 0);
    const { tax, rate } = calculateTax(totalWealth);

    const embed = new EmbedBuilder()
      .setTitle('📊 รายงานภาษีเงินได้บุคคลธรรมดา (THAILAND)')
      .setColor(tax > 0 ? '#FF0000' : '#00FF00')
      .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/2000px-Flag_of_Thailand.svg.png')
      .addFields(
        { name: '💰 ยอดทรัพย์สินรวมของคุณ:', value: `**${totalWealth.toLocaleString()}** บาท (THB)`, inline: false },
        { name: '📉 ภาษีคาดการณ์ (เดือนนี้):', value: `**${tax.toLocaleString()}** บาท`, inline: true },
        { name: '📊 อัตราภาษีปัจจุบัน:', value: `**${rate}%**`, inline: true },
        { name: '📅 กำหนดชำระอัตโนมัติ:', value: 'ทุกวันที่ 1 ของเดือน', inline: false }
      )
      .setDescription(tax > 0 
        ? `*หมายเหตุ: ในวันที่ 1 ระบบจะทำการหักเงินจำนวน **${tax.toLocaleString()} บาท** โดยอัตโนมัติจากกระเป๋าหรือธนาคารของคุณ*`
        : `*ยินดีด้วย! ยอดทรัพย์สินของคุณยังไม่ถึงเกณฑ์ที่ต้องเสียภาษี (ต่ำกว่า 100,000 บาท)*`
      )
      .setFooter({ text: 'กรมสรรพากร THAILAND • เพื่อการพัฒนาประเทศ' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
