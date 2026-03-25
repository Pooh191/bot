const { EmbedBuilder, ChannelType } = require('discord.js');
const { CronJob } = require('cron');
const fs = require('fs');
const path = require('path');
const { loadUsers, saveUsers } = require('../utils/economyUtils');

const salariesPath = path.join(__dirname, '..', 'data', 'role_salaries.json');
let clientRef;

// ระบบการโอนเงินเดือนอัตโนมัติ
const salaryJob = new CronJob('0 0 18 * *', async () => {
  console.log('💵 Running automated salary distribution...');

  if (!fs.existsSync(salariesPath)) return;
  const roleSalaries = JSON.parse(fs.readFileSync(salariesPath, 'utf8'));
  const users = loadUsers();
  const guild = clientRef.guilds.cache.first();

  if (!guild) return console.error('❌ ไม่พบเซิร์ฟเวอร์ในการจ่ายเงินเดือน');

  let totalPaid = 0;
  let userCount = 0;

  for (const userId in users) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      let bestSalary = 0;
      roleSalaries.forEach(rs => {
        if (member.roles.cache.has(rs.roleId)) {
          if (rs.salary > bestSalary) bestSalary = rs.salary;
        }
      });

      if (bestSalary > 0) {
        users[userId].balance += bestSalary;
        totalPaid += bestSalary;
        userCount++;
      }
    } catch (e) {
      console.error(`❌ ผิดพลาดในการจ่ายเงินให้ ${userId}:`, e);
    }
  }

  saveUsers(users);
  console.log(`✅ จ่ายเงินเดือนเสร็จสิ้น: ทั้งหมด ${userCount} คน รวมเป็นเงิน ${totalPaid.toLocaleString()} บาท`);

  const { sendEconomyLog } = require('../utils/logger');
  await sendEconomyLog(clientRef, '💰 ระบบเงินเดือนอัตโนมัติ (Automated Payday)', `จ่ายเงินเดือนให้สมาชิกทั้งหมด **${userCount}** คน\n💰 รวมเป็นเงินทั้งสิ้น **${totalPaid.toLocaleString()} บาท**`, 'Gold', false);
}, null, true, 'Asia/Bangkok');

// ระบบการหักภาษี (กรมสรรพากร - เสียภาษีทุกวันที่ 1 ของเดือน)
const taxJob = new CronJob('0 0 1 * *', async () => {
  console.log('🌍 [กรมสรรพากร] กำลังเริ่มขั้นตอนการหักภาษีประจำเดือน...');
  const users = loadUsers();
  const { calculateTax } = require('../utils/economyUtils');

  let totalTaxCollected = 0;
  let detailLog = "";
  let taxpayersCount = 0;

  const guild = clientRef.guilds.cache.first();
  if (!guild) return console.error('❌ ไม่พบเซิร์ฟเวอร์ในการหักภาษี');

  for (let userId in users) {
    if (userId === 'undefined') continue;

    const user = users[userId];
    const totalWealth = (user.balance || 0) + (user.bank || 0);

    // คำนวณภาษีโดยใช้ฟังก์ชันส่วนกลาง
    const { tax } = calculateTax(totalWealth);

    if (tax > 0) {
      tax = Math.floor(tax);
      // หักเงิน (หักจากเงินสดก่อน ถ้าไม่พอค่อยหักจากธนาคาร)
      if (user.balance >= tax) {
        user.balance -= tax;
      } else {
        const remainingTax = tax - user.balance;
        user.balance = 0;
        user.bank = Math.max(0, user.bank - remainingTax);
      }

      totalTaxCollected += tax;
      taxpayersCount++;
      detailLog += `• <@${userId}>: -${tax.toLocaleString()} บาท (เหลือคงเหลือ: ${(user.balance + user.bank).toLocaleString()} บาท)\n`;

      // ส่ง DM แจ้งเตือนผู้เล่น
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const personalTaxEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💸 ประกาศแจ้งการชำระภาษีประจำเดือน')
            .setDescription(`กรมสรรพากร THAILAND ได้ทำการหักภาษีจากบัญชีของคุณเรียบร้อยแล้ว`)
            .addFields(
              { name: '📉 ภาษีที่ชำระ:', value: `**${tax.toLocaleString()}** บาท`, inline: true },
              { name: '💰 ยอดเงินคงเหลือรวม:', value: `**${(user.balance + user.bank).toLocaleString()}** บาท`, inline: true }
            )
            .setFooter({ text: 'ขอบคุณที่ร่วมเสียภาษีเพื่อพัฒนาประเทศ' })
            .setTimestamp();
          await member.send({ embeds: [personalTaxEmbed] }).catch(() => null);
        }
      } catch (err) {
        // เงียบไว้ถ้าส่ง DM ไม่ได้
      }
    }
  }

  saveUsers(users);

  const { sendEconomyLog } = require('../utils/logger');

  // แจ้งคนทั้งเซิร์ฟเวอร์
  await sendEconomyLog(clientRef, '💸 กรมสรรพากร: สรุปการจัดเก็บภาษีประจำเดือน',
    `กรมสรรพากรจัดเก็บภาษีสมาชิกได้ทั้งหมด **${taxpayersCount}** ราย\n💰 ยอดเงินภาษีรวมทั้งสิ้น **${totalTaxCollected.toLocaleString()} บาท (THB)**\n\n*หมายเหตุ: เก็บทุกวันที่ 1 ของทุกเดือน ตามอัตราสภาบันการเงินไทย*`,
    '#FF0000', false);

  // แจ้งแอดมิน (รายละเอียด)
  if (detailLog) {
    const taxChunks = detailLog.match(/[\s\S]{1,3000}/g) || [];
    for (const chunk of taxChunks) {
      await sendEconomyLog(clientRef, '📜 รายละเอียดการเสียภาษี (Admin Only)', chunk, 'Grey', false);
    }
  }

  console.log(`✅ การหักภาษีเสร็จสิ้น: เก็บได้ทั้งหมด ${totalTaxCollected.toLocaleString()} บาท`);
}, null, true, 'Asia/Bangkok');

// ระบบดอกเบี้ยเงินกู้ (Loan Interest - Thai Lifestyle 24% APR)
const loanInterestJob = new CronJob('0 0 0 * * *', async () => {
  console.log('🏦 Calculating daily loan interest (24% APR)...');
  const users = loadUsers();
  const dailyRate = 0.000657; // ~24% ต่อปี (0.065% ต่อวัน)
  let totalInterest = 0;

  for (const userId in users) {
    if (users[userId].loanPrincipal > 0) {
      // ดอกเบี้ยคิดจากยอดเงินต้นคงเหลือ (Effective Rate)
      const interest = Math.ceil(users[userId].loanPrincipal * dailyRate);
      users[userId].loanInterest += interest;
      totalInterest += interest;
    }
  }

  saveUsers(users);
  console.log(`🏦 ดอกเบี้ยเงินกู้รายวันเสร็จสิ้น: รวมดอกเบี้ยใหม่ ${totalInterest.toLocaleString()} บาท`);
}, null, true, 'Asia/Bangkok');

// ระบบเบี้ยเลี้ยงรายชั่วโมง (Hourly Allowance for people in Voice Channels)
const allowanceJob = new CronJob('0 0 * * * *', async () => {
  console.log('🔊 Processing hourly allowance for VC users...');
  const guild = clientRef.guilds.cache.first();
  if (!guild) return;

  const users = loadUsers();
  let paidCount = 0;
  const reward = 50; // 50 บาท ต่อชั่วโมง

  guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).forEach(voiceChannel => {
    voiceChannel.members.filter(m => !m.user.bot && !m.voice.selfDeaf).forEach(member => {
      if (users[member.id]) {
        users[member.id].balance += reward;
        paidCount++;
      }
    });
  });

  if (paidCount > 0) {
    saveUsers(users);
    console.log(`✅ จ่ายเบี้ยเลี้ยงรายชั่วโมงให้ ${paidCount} คน`);
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(clientRef, '🔊 เบี้ยเลี้ยงรายชั่วโมง (Living Allowance)', `ระบบจ่ายเบี้ยเลี้ยงให้สมาชิกที่อยู่ในห้องเสียงทั้งหมด **${paidCount}** คน\n💰 คนละ **${reward} บาท (THB)**`, 'Blue', false);
  }
}, null, true, 'Asia/Bangkok');

const scheduleAll = (client) => {
  clientRef = client;
  taxJob.start();
  salaryJob.start();
  loanInterestJob.start();
  allowanceJob.start();
};

module.exports = { scheduleAll };
