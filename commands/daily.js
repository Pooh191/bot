const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUsers, loadConfig, addXP } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🎁 รับรางวัลรายวันของคุณ (5,000 บาท)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const cfg = loadConfig();

    const now = Date.now();
    const lastDaily = user.lastDaily || 0;
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - lastDaily < cooldown) {
      const timeLeft = cooldown - (now - lastDaily);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({ 
        content: `⌛ คุณรับรางวัลรายวันไปแล้ว! กรุณารออีก **${hours} ชั่วโมง ${minutes} นาที** เพื่อรับใหม่`, 
        ephemeral: true 
      });
    }

    const reward = cfg.dailyReward || 5000;
    const xpReward = cfg.dailyXP || 100;

    user.balance += reward;
    user.lastDaily = now;
    saveUsers(users);

    const xpResult = addXP(userId, xpReward);

    await interaction.reply({
      content: `🎁 **รางวัลรายวัน!** คุณได้รับ **${reward.toLocaleString()} บาท** และ **${xpReward} XP**!${xpResult.leveledUp ? `\n🎊 **ยินดีด้วย! คุณเลเวลอัปเป็นเลเวล ${xpResult.level} แล้ว!**` : ''}`
    });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      'รางวัลรายวัน (Daily)',
      `**ผู้รับ:** <@${userId}>\n**สิ่งที่ได้:** +${reward.toLocaleString()} บาท และ ${xpReward} XP`,
      'Yellow',
      true
    );
  }
};
