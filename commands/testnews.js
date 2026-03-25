const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers, loadResources, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testnews')
    .setDescription('📋 ทดสอบการส่งรายงานสภาวะเศรษฐกิจประจำวัน (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const users = loadUsers();
      const resources = loadResources();
      const cfg = loadConfig();

      // --- เลียนแบบตรรกะจาก dailyUpdate.js ---
      let totalBank = 0;
      let totalCash = 0;
      let totalDebt = 0;
      let richestUser = { id: null, balance: -1 };
      const citizenCount = Object.keys(users).length;

      for (const [id, u] of Object.entries(users)) {
        if (id === 'undefined') continue;
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

      const total = totalCash + totalBank;
      const prevTotal = cfg.lastTotal || total;
      const pct = prevTotal === 0 ? '0.00' : ((total - prevTotal) / prevTotal * 100).toFixed(2);

      const dateStr = new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Bangkok'
      });

      const embed = new EmbedBuilder()
        .setTitle(`📈 [REPLICA] รายงานสภาวะเศรษฐกิจประจำประเทศ ${dateStr}`)
        .setColor('#FFD700')
        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/256px-Flag_of_Thailand.svg.png')
        .setDescription(`สรุปภาพรวมทางการเงินของเมืองไทย (ข้อมูลทดสอบส่งแบบทันที)`)
        .addFields(
          { name: '🏦 ปริมาณเงินหมุนเวียน (M1+M2):', value: `💰 **${total.toLocaleString()}** บาท (THB) \`[${pct}% จากเมื่อวาน]\``, inline: false },
          { name: '💰 เงินสดในมือประชาชน:', value: `💵 ${totalCash.toLocaleString()} บาท`, inline: true },
          { name: '🏦 เงินฝากในระบบธนาคาร:', value: `📝 ${totalBank.toLocaleString()} บาท`, inline: true },
          { name: '💳 หนี้สินรวมภาคประชาชน:', value: `📉 ${totalDebt.toLocaleString()} บาท`, inline: true },
          { name: '👥 จำนวนประชากรทั้งหมด:', value: `🧍 ${citizenCount.toLocaleString()} ราย`, inline: true },
          { name: '🏆 เศรษฐีอันดับ 1 ของประเทศ:', value: richestUser.id ? `👑 <@${richestUser.id}> (${richestUser.balance.toLocaleString()} บาท)` : 'N/A', inline: false }
        )
        .setFooter({ text: 'ฝ่ายวิจัยเศรษฐกิจ ธนาคารแห่งประเทศไทย', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/2000px-Flag_of_Thailand.svg.png' })
        .setTimestamp();

      // สรุปทรัพยากร
      let resourceSummary = '';
      for (const prov in resources) {
        const r = resources[prov];
        resourceSummary += `📍 **${prov}:** 🍀 O2:${r.oxygen}% | 🌪️ CO2:${r.co2}%\n`;
      }
      embed.addFields({ name: '🍀 สถานะทรัพยากร/สิ่งแวดล้อม:', value: resourceSummary || 'ไม่มีข้อมูล', inline: false });

      // ถามแอดมินว่าจะส่งไปยังห้องประกาศข่าวที่ตั้งไว้เลยไหม?
      const targetChannel = interaction.guild.channels.cache.get(cfg.announcementChannelId);

      await interaction.editReply({ 
        content: `📦 **นี่คือตัวอย่างรายงานครับ:**\n(ตรวจสอบได้จาก Embed ด้านล่าง)\n\n📍 ช่องประกาศปัจจุบันที่คุณตั้งค่าไว้คือ: ${targetChannel || '❌ ยังไม่ได้ตั้งค่า (ใช้ /setnews)'}`, 
        embeds: [embed] 
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
    }
  }
};
