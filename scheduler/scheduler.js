const { EmbedBuilder, ChannelType } = require('discord.js');
const { CronJob } = require('cron');
const { loadUsers, saveUsers } = require('../utils/economyUtils');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');
let clientRef;

// ระบบการโอนเงินเดือนอัตโนมัติ
const salaryJob = new CronJob('0 0 18 * *', async () => {
  console.log('💵 Running automated salary distribution...');

  const roleSalaries = getCache('role_salaries') || [];
  if (roleSalaries.length === 0) return;
  const guild = clientRef.guilds.cache.first();
  if (!guild) return console.error('❌ ไม่พบเซิร์ฟเวอร์ในการจ่ายเงินเดือน');

  await guild.members.fetch(); // โหลดสมาชิกทั้งหมดทีเดียว เพื่อความเร็ว และลดการดึงข้อมูลรายคนในลูป
  
  const users = loadUsers();
  let totalPaid = 0;
  let userCount = 0;

  for (const userId in users) {
    try {
      const member = guild.members.cache.get(userId);
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
  const guild = clientRef.guilds.cache.first();
  if (!guild) return console.error('❌ ไม่พบเซิร์ฟเวอร์ในการหักภาษี');

  await guild.members.fetch(); // โหลดสมาชิกทั้งหมดทีเดียวเพื่อรับทราบ Role ล่าสุด
  
  const users = loadUsers();
  const { calculateTax } = require('../utils/economyUtils');

  let totalTaxCollected = 0;
  let detailLog = "";
  let taxpayersCount = 0;
  const dmPromises = [];

  for (let userId in users) {
    if (userId === 'undefined') continue;

    const user = users[userId];
    const totalWealth = (user.balance || 0) + (user.bank || 0);

    // คำนวณภาษีโดยใช้ฟังก์ชันส่วนกลาง
      const calculated = calculateTax(totalWealth);
      let taxAmt = calculated.tax;

      if (taxAmt > 0) {
        taxAmt = Math.floor(taxAmt);
        // หักเงิน (หักจากเงินสดก่อน ถ้าไม่พอค่อยหักจากธนาคาร)
        if (user.balance >= taxAmt) {
          user.balance -= taxAmt;
        } else {
          const remainingTax = taxAmt - user.balance;
          user.balance = 0;
          user.bank = Math.max(0, user.bank - remainingTax);
        }

        totalTaxCollected += taxAmt;
        taxpayersCount++;
        detailLog += `• <@${userId}>: -${taxAmt.toLocaleString()} บาท (เหลือคงเหลือ: ${(user.balance + user.bank).toLocaleString()} บาท)\n`;

      // เตรียม DM แจ้งเตือนผู้เล่น แต่ยังไม่ส่งจนกว่าจะเซฟไฟล์เสร็จ
      try {
        const member = guild.members.cache.get(userId);
        if (member) {
          const personalTaxEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💸 ประกาศแจ้งการชำระภาษีประจำเดือน')
            .setDescription(`กรมสรรพากร THAILAND ได้ทำการหักภาษีจากบัญชีของคุณเรียบร้อยแล้ว`)
            .addFields(
              { name: '📉 ภาษีที่ชำระ:', value: `**${taxAmt.toLocaleString()}** บาท`, inline: true },
              { name: '💰 ยอดเงินคงเหลือรวม:', value: `**${(user.balance + user.bank).toLocaleString()}** บาท`, inline: true }
            )
            .setFooter({ text: 'ขอบคุณที่ร่วมเสียภาษีเพื่อพัฒนาประเทศ' })
            .setTimestamp();
          // นำคำขอติดคิวไว้ก่อน ไม่ await ทันที เพื่อป้องกัน Race Condition จากการโหลด/เซฟไฟล์
          dmPromises.push(member.send({ embeds: [personalTaxEmbed] }).catch(() => null));
        }
      } catch (err) {
        // เงียบไว้ถ้าส่ง DM ไม่ได้
      }
    }
  }

  // เซฟข้อมูลเงินลงไฟล์ทันที ป้องกันผู้ใช้ทำงานคำสั่งอื่นแทรกแซงและเกิดเงินหาย
  saveUsers(users);

  // หลังจากเซฟไฟล์เสร็จแล้ว ค่อยส่ง DM ทีเดียวแบบทำงานขนาน
  if (dmPromises.length > 0) {
    await Promise.all(dmPromises);
  }

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

  // ตรวจสอบสมาชิกในห้อง Voice ก่อนที่จะโหลดข้อมูลผู้ใช้ เพื่อลดระยะเวลาที่ข้อมูลจะค้างใน Memory (Race Condition)
  const recipients = [];
  guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).forEach(voiceChannel => {
    voiceChannel.members.filter(m => !m.user.bot && !m.voice.selfDeaf).forEach(member => {
      recipients.push(member.id);
    });
  });

  if (recipients.length === 0) return;

  const users = loadUsers();
  let paidCount = 0;
  const reward = 50; // 50 บาท ต่อชั่วโมง

  recipients.forEach(id => {
    if (users[id]) {
      users[id].balance = (users[id].balance || 0) + reward;
      paidCount++;
    }
  });

  if (paidCount > 0) {
    saveUsers(users);
    console.log(`✅ จ่ายเบี้ยเลี้ยงรายชั่วโมงให้ ${paidCount} คน`);
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(clientRef, '🔊 เบี้ยเลี้ยงรายชั่วโมง (Living Allowance)', `ระบบจ่ายเบี้ยเลี้ยงให้สมาชิกที่อยู่ในห้องเสียงทั้งหมด **${paidCount}** คน\n💰 คนละ **${reward} บาท (THB)**`, 'Blue', false);
  }
}, null, true, 'Asia/Bangkok');

const scheduleMessageJob = new CronJob('* * * * *', async () => {
  const schedules = getCache('scheduled_messages') || [];

  if (!Array.isArray(schedules) || schedules.length === 0) return;

  const now = Date.now();
  const remainingSchedules = [];
  let changed = false;

  for (const schedule of schedules) {
    if (now >= schedule.executeAt) {
      changed = true;
      try {
        const guild = clientRef.guilds.cache.get(schedule.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(schedule.channelId) || await guild.channels.fetch(schedule.channelId).catch(()=>null);
        if (!channel || !channel.isTextBased()) continue;

        let finalMessage = schedule.message;
        if (schedule.roleId) {
          finalMessage = `<@&${schedule.roleId}>\n${finalMessage}`;
        }

        // ข้อความ Discord ถูกจำกัดไว้ที่ 2000 ตัวอักษร/ครั้ง หากยาวเกิน ต้องแบ่งส่งทีละท่อน
        const chunks = finalMessage.match(/[\s\S]{1,1990}/g) || [];

        for (let i = 0; i < chunks.length; i++) {
          const options = { content: chunks[i] };
          
          // แนบรูปเข้าไปในก้อนสุดท้ายเท่านั้น
          if (i === chunks.length - 1 && schedule.imageUrl) {
            const embed = new EmbedBuilder().setImage(schedule.imageUrl).setColor('#00AAFF');
            options.embeds = [embed];
          }

          await channel.send(options);
        }
        
        console.log(`✅ [Auto-Announce] ส่งประกาศอัตโนมัติสำเร็จในห้อง #${channel.name}`);
      } catch (err) {
        console.error('❌ [Auto-Announce] ผิดพลาดในการส่งประกาศอัตโนมัติ:', err);
      }
    } else {
      remainingSchedules.push(schedule);
    }
  }

  if (changed) {
    setCacheAndSave('scheduled_messages', remainingSchedules, true);
  }
}, null, true, 'Asia/Bangkok');

// ระบบแจ้งเตือนการออกรางวัลสลากกินแบ่งรัฐบาล (ทุกวันที่ 5 และ 20 เวลา 17:30)
const lottoReminderJob = new CronJob('30 17 5,20 * *', async () => {
  const guild = clientRef.guilds.cache.first();
  if (!guild) return;

  const adminChannelId = process.env.ADMIN_LOG_CHANNEL_ID;
  const channel = guild.channels.cache.get(adminChannelId);
  
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle('📢 การแจ้งเตือนแอดมิน: ถึงเวลาปิดการขายและเตรียมออกรางวัล')
      .setColor('Orange')
      .setDescription(`ขณะนี้เวลา 17:30 น. ของวันที่กำหนดออกรางวัล\nระบบได้ทำการปิดการขายสลากกินแบ่งแล้ว\n\nกรุณาเตรียมตัวถ่ายทอดสดและใช้คำสั่ง \`/lottoadmin draw\` ในเวลา 18:30 น. เพื่อประกาศผลรางวัลครับ`)
      .setTimestamp();
    await channel.send({ content: '@everyone', embeds: [embed] });
  }
}, null, true, 'Asia/Bangkok');

const scheduleAll = (client) => {
  clientRef = client;
  taxJob.start();
  salaryJob.start();
  loanInterestJob.start();
  allowanceJob.start();
  scheduleMessageJob.start();
  lottoReminderJob.start();
};

module.exports = { scheduleAll };
