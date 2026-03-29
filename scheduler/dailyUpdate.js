// scheduler/dailyUpdate.js
const cron = require('node-cron');
const { loadUsers, loadResources, loadConfig, saveConfig, saveResources } = require('../utils/economyUtils');
const { EmbedBuilder } = require('discord.js');

function setupDailyUpdate(client) {
  console.log('🕙 ตั้งเวลา Daily Update 08:00 เวลาไทย (Asia/Bangkok)');

  // ทำงานทุกวันเวลา 19:47 ตามเวลาประเทศไทย
  cron.schedule('00 08 * * *', async () => {
    try {
      const users     = loadUsers();
      const resources = loadResources();
      const cfg       = loadConfig();
      const chId      = cfg.announcementChannelId;
      const channel   = chId ? await client.channels.fetch(chId) : null;

      if (!channel || !channel.isTextBased()) {
        console.warn('⚠️ ไม่พบช่องประกาศ หรือช่องไม่รองรับข้อความ');
        return;
      }

      // 1) Randomize Resources ±1–5
      for (const prov in resources) {
        for (const key of Object.keys(resources[prov])) {
          const delta = Math.floor(Math.random() * 11) - 5;
          resources[prov][key] = Math.min(100, Math.max(0, resources[prov][key] + delta));
        }
      }

      // 2) Check O₂+CO₂ and severe CO₂>30
      let o2ok = true, severe = [];
      for (const prov in resources) {
        const r = resources[prov];
        if (r.oxygen + r.co2 !== 100) o2ok = false;
        if (r.co2 > 30) severe.push(prov);
      }

      // 3) Economic Stats
      let totalBank = 0;
      let totalCash = 0;
      let totalDebt = 0;
      let richestUser = { id: null, balance: -1 };
      
      // ดึงสมาชิกเพื่อเช็ค Role สัญชาติ
      const guild = channel.guild;
      const members = await guild.members.fetch();
      const citizenRoleName = 'THC | Thailand Citizen';

      for (const [id, u] of Object.entries(users)) {
        if (id === 'undefined') continue;
        
        const member = members.get(id);
        const isCitizen = member && member.roles.cache.some(role => role.name === citizenRoleName);

        // --- แจกรายได้รายวันอัตโนมัติ (เฉพาะผู้ที่มียศสัญชาติไทย) ---
        if (isCitizen && cfg.dailyIncome > 0) {
          u.balance = (u.balance || 0) + cfg.dailyIncome;
        }

        // เฉพาะคนที่เป็น Citizen ถึงจะถูกนำมาคำนวณสถิติรวมของประเทศ (Optional: หรือจะนับทุกคนก็ได้ แต่ที่นี่เน้น Citizen ตามคำสั่ง)
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
      
      const citizenCount = members.filter(m => !m.user.bot && m.roles.cache.some(r => r.name === citizenRoleName)).size;

      const total = totalCash + totalBank;
      const prevTotal = cfg.lastTotal || total;
      const pct = prevTotal === 0 ? '0.00' : ((total - prevTotal) / prevTotal * 100).toFixed(2);
      cfg.lastTotal = total;

      // save back
      const { saveUsers } = require('../utils/economyUtils');
      saveUsers(users);
      saveConfig(cfg);
      saveResources(resources);

      // 4) Build embed
      const dateStr = new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Bangkok'
      });

      const embed = new EmbedBuilder()
        .setTitle(`📈 รายงานสภาวะเศรษฐกิจประจำประเทศ ${dateStr}`)
        .setColor('#FFD700')
        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_Thailand.svg/256px-Flag_of_Thailand.svg.png')
        .setDescription(`สรุปภาพรวมทางการเงินของเมืองไทย ประจำเช้าวันนี้เวลา 08:00 น.`)
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

      // Optional: resources status (summary)
      let resourceSummary = '';
      for (const prov in resources) {
        const r = resources[prov];
        resourceSummary += `📍 **${prov}:** 🍀 O2:${r.oxygen}% | 🌪️ CO2:${r.co2}%\n`;
      }
      embed.addFields({ name: '🍀 สถานะทรัพยากร/สิ่งแวดล้อม:', value: resourceSummary || 'ไม่มีข้อมูล', inline: false });

      if (!o2ok) {
        embed.addFields({ name: '⚠️ ประกาศแจ้งเตือน:', value: 'พบค่าออกซิเจนในบางจังหวัดมีความผิดปกติ โปรดแจ้งกรมโยธาฯ' });
      }
      for (const p of severe) {
        embed.addFields({ name: `🚨 รุนแรง: ${p}`, value: 'CO₂ > 30 คะแนน' });
      }

      await channel.send({ embeds: [embed] });
      console.log('✅ ส่ง Daily Update สำเร็จ');
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาดใน Daily Update:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Bangkok'
  });
}

module.exports = { setupDailyUpdate };
