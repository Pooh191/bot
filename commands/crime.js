// commands/crime.js
const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUsers, loadConfig } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('ทำงานเพื่อรับเงินจากการกระทำผิดกฎหมาย (เสี่ยงโดนจับได้)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);

    const cfg = loadConfig();

    const now      = Date.now();
    const last     = user.lastCrime || 0;
    const cooldown = cfg.crimeCooldown;    // <— เอา *1000 ออก

    if (now - last < cooldown) {
      const timeLeft = Math.ceil((cooldown - (now - last)) / 1000);
      return interaction.reply({ content: `⏳ กรุณารอ ${timeLeft} วินาที ก่อนที่จะ /crime อีกครั้ง.`, ephemeral: true });
    }

    const earned = Math.floor(Math.random() * (cfg.crimeMax - cfg.crimeMin + 1)) + cfg.crimeMin;
    user.balance    += earned;
    user.lastCrime   = now;                // <— เก็บลง lastCrime

    const { addXP } = require('../utils/economyUtils');
    const xpResult  = addXP(user, cfg.xpCrime || 15);

    saveUsers(users);

    await interaction.reply({
      content: `🥷 คุณได้ทำเรื่องผิดกฎหมาย (Crime) และปล้นได้เงินมา **${earned.toLocaleString()} บาท (THB)** และได้รับ **${cfg.xpCrime || 15} XP**!${xpResult.leveledUp ? `\n🎊 **ยินดีด้วย! คุณเลเวลอัปเป็นเลเวล ${xpResult.level} แล้ว!**` : ''}\nยอดคงเหลือในมือ: ${user.balance.toLocaleString()} บาท`
    });

    await sendEconomyLog(
      interaction.client, 
      'ปล้นทรัพย์ (Crime)', 
      `**ผู้ต้องสงสัย:** <@${userId}>\n**สิ่งที่ได้จากอาชญากรรม:** +${earned.toLocaleString()} บาท\n**ยอดเงินสดที่มีตอนนี้:** ${user.balance.toLocaleString()} บาท`, 
      'DarkRed',
      true
    );
  }
};
