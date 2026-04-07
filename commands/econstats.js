const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUsers, loadResources, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('econstats')
    .setDescription('📈 ดูรายงานสภาวะเศรษฐกิจและทรัพยากรของไทยในปัจจุบัน'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const users = loadUsers();
      const resources = loadResources();
      const cfg = loadConfig();
      const members = await interaction.guild.members.fetch();
      const citizenRoleName = 'THC | Thailand Citizen';

      let totalBank = 0;
      let totalCash = 0;
      let totalDebt = 0;
      let richestUser = { id: null, balance: -1 };

      for (const [id, u] of Object.entries(users)) {
        if (id === 'undefined') continue;

        const member = members.get(id);
        const isCitizen = member && member.roles.cache.some(role => role.name === citizenRoleName);

        if (isCitizen) {
          const cash = u.balance || 0;
          const bank = u.bank || 0;
          const debt = (u.loanPrincipal || 0) + (u.loanInterest || 0);

          totalCash += cash;
          totalBank += bank;
          totalDebt += debt;

          if (cash + bank > richestUser.balance) {
            richestUser = { id: id, balance: cash + bank };
          }
        }
      }

      const citizens = members.filter(m => !m.user.bot && m.roles.cache.some(r => r.name === citizenRoleName));
      const citizenCount = citizens.size;

      const total = totalCash + totalBank;
      const prevTotal = cfg.lastTotal || total;
      const pct = prevTotal === 0 ? '0.00' : ((total - prevTotal) / prevTotal * 100).toFixed(2);

      const dateStr = new Date().toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Bangkok'
      });

      const embed = new EmbedBuilder()
        .setTitle(`📈 รายงานสภาวะเศรษฐกิจไทย (Real-time)`)
        .setColor('#FFD700')
        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/256px-Flag_of_Thailand.svg.png')
        .setDescription(`ข้อมูลสรุปภาพรวมทางการเงินของประเทศ ประจำวันที่ ${dateStr}`)
        .addFields(
          { name: '🏦 ปริมาณเงินหมุนเวียนรวม:', value: `💰 **${total.toLocaleString()}** บาท (THB) \`[${pct}% จากรายงานล่าสุด]\``, inline: false },
          { name: '💰 เงินสดในมือประชาชน:', value: `💵 ${totalCash.toLocaleString()} บาท`, inline: true },
          { name: '🏦 เงินฝากในระบบธนาคาร:', value: `📝 ${totalBank.toLocaleString()} บาท`, inline: true },
          { name: '💳 หนี้สินรวมภาคประชาชน:', value: `📉 ${totalDebt.toLocaleString()} บาท`, inline: true },
          { name: '👥 จำนวนประชากรผู้มียศ:', value: `🧍 ${citizenCount.toLocaleString()} ราย`, inline: true },
          { name: '🏆 เศรษฐีอันดับ 1 ของประเทศ:', value: richestUser.id ? `👑 <@${richestUser.id}> (${richestUser.balance.toLocaleString()} บาท)` : 'N/A', inline: false }
        )
        .setFooter({ text: 'ฝ่ายวิจัยเศรษฐกิจ ธนาคารแห่งประเทศไทย', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/2000px-Flag_of_Thailand.svg.png' })
        .setTimestamp();

      // ส่วนของทรัพยากร
      let resourceSummary = '';
      for (const prov in resources) {
        const r = resources[prov];
        resourceSummary += `📍 **${prov}:** 🍀 O2:${r.oxygen}% | 🌪️ CO2:${r.co2}%\n`;
      }
      embed.addFields({ name: '🍀 สถานะทรัพยากร/สิ่งแวดล้อม:', value: resourceSummary || 'ไม่มีข้อมูล', inline: false });

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('❌ Error in econstats command:', err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลรายงานเศรษฐกิจ' });
    }
  }
};
