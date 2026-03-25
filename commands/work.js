// commands/work.js
const { SlashCommandBuilder } = require('discord.js');
const { loadUsers, saveUsers, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('ทำงานเพื่อรับเงิน'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const users = loadUsers();

    // ตรวจสอบว่าผู้ใช้มีข้อมูลหรือไม่
    if (!users[userId]) {
      users[userId] = { balance: 0, bank: 0, lastWork: 0 };
    }

    const cfg = loadConfig();
    const now = Date.now();
    const lastWork = users[userId].lastWork || 0;
    const cooldown = cfg.workCooldown * 1000; // แปลงคูลดาวน์เป็นมิลลิวินาที

    if (now - lastWork < cooldown) {
      const timeLeft = Math.ceil((cooldown - (now - lastWork)) / 1000); // คำนวณเวลาเหลือ
      return interaction.reply({ content: `⏳ กรุณารอ ${timeLeft} วินาที ก่อนที่จะทำงานอีกครั้ง.`, ephemeral: true });
    }

    const fs = require('fs');
    const path = require('path');
    const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');
    const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
    const userJob = jobs.find(j => j.id === (users[userId].job || 'none')) || jobs[0];
    const multiplier = userJob ? userJob.multiplier : 1.0;

    // คำนวณเงินที่ได้รับจากการทำงาน
    const baseMoney = Math.floor(Math.random() * (cfg.workMax - cfg.workMin + 1)) + cfg.workMin;
    const earnedMoney = Math.floor(baseMoney * multiplier);

    // เพิ่มเงินในบัญชี
    users[userId].balance += earnedMoney;

    // อัพเดตเวลา
    users[userId].lastWork = now;

    // เซฟข้อมูลผู้ใช้
    saveUsers(users);

    // แสดงยอดเงิน
    const userBankBalance = users[userId].bank;
    const userBalance = users[userId].balance;

    const { addXP } = require('../utils/economyUtils');
    const xpResult = addXP(userId, cfg.xpWork || 10);

    await interaction.reply({
      content: `💼 ในฐานะ **${userJob.name}** คุณทำงานและได้รับเงินสด **${earnedMoney.toLocaleString()} บาท (THB)** และได้รับ **${cfg.xpWork || 10} XP**!${xpResult.leveledUp ? `\n🎊 **ยินดีด้วย! คุณเลเวลอัปเป็นเลเวล ${xpResult.level} แล้ว!**` : ''}\n\nยอดเงินคงเหลือ: ${userBalance.toLocaleString()} บาท\nยอดเงินในธนาคาร: ${userBankBalance.toLocaleString()} บาท`
    });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'รายได้จากการออน (Work)', 
      `**ผู้รับ:** <@${userId}>\n**สิ่งที่ได้:** +${earnedMoney.toLocaleString()} บาท\n**ยอดเงินสดใหม่:** ${userBalance.toLocaleString()} บาท`, 
      'LightGrey',
      true
    );
  },
};
