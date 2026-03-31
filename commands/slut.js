const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUsers, loadConfig } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slut')
    .setDescription('ทำงานเพื่อรับเงิน แบบ slut'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const cfg = loadConfig();

    const now       = Date.now();
    const lastSlut  = user.lastSlut || 0;
    const cooldown  = cfg.slutCooldown; // หน่วยเป็นมิลลิวินาที 

    if (now - lastSlut < cooldown) {
      const waitSec = Math.ceil((cooldown - (now - lastSlut)) / 1000);
      return interaction.reply({ content: `⏳ กรุณารอ ${waitSec} วินาที ก่อนใช้งาน /slut อีกครั้ง`, ephemeral: true });
    }

    const earned = Math.floor(Math.random() * (cfg.slutMax - cfg.slutMin + 1)) + cfg.slutMin;
    user.balance   += earned;
    user.lastSlut   = now;

    const { addXP } = require('../utils/economyUtils');
    const xpResult  = addXP(user, cfg.xpSlut || 20);

    saveUsers(users);

    await interaction.reply({
      content: `💼 คุณไปทำงานสไตล์สีเทา (Slut) และได้รับเงินสด **${earned.toLocaleString()} บาท (THB)** และได้รับ **${cfg.xpSlut || 20} XP**!${xpResult.leveledUp ? `\n🎊 **ยินดีด้วย! คุณเลเวลอัปเป็นเลเวล ${xpResult.level} แล้ว!**` : ''}\nยอดเงินคงเหลือ: ${user.balance.toLocaleString()} บาท`
    });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      'งานสีเทา (Slut)', 
      `**คนงาน:** <@${userId}>\n**สิ่งที่ได้:** +${earned.toLocaleString()} บาท\n**ยอดเงินสดใหม่:** ${user.balance.toLocaleString()} บาท`, 
      'Purple',
      true
    );
  }
};
