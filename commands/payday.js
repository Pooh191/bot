const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser, saveUsers, addXP } = require('../utils/economyUtils');

const salariesPath = path.join(__dirname, '..', 'data', 'role_salaries.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payday')
    .setDescription('💵 รับเงินเดือนตามยศ Discord ของคุณ (24 ชั่วโมงต่อครั้ง)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const member = interaction.member;

    // Cooldown check
    const now = Date.now();
    const lastPayday = user.lastPayday || 0;
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - lastPayday < cooldown) {
      const timeLeft = cooldown - (now - lastPayday);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({ 
        content: `⌛ คุณรับเงินเดือนไปแล้ว! กรุณารออีก **${hours} ชั่วโมง ${minutes} นาที** เพื่อรับรอบถัดไปนะครับ`, 
        ephemeral: true 
      });
    }

    // Role Salary check
    if (!fs.existsSync(salariesPath)) {
      return interaction.reply({ content: '❌ ระบบยังไม่ได้ตั้งค่าเงินเดือนสำหรับแต่ละยศครับกรุณาแจ้งแอดมินนะครับ', ephemeral: true });
    }

    const roleSalaries = JSON.parse(fs.readFileSync(salariesPath, 'utf8'));
    
    // Find the highest salary role the user has
    let bestSalary = 0;
    let bestRoleName = '';

    roleSalaries.forEach(rs => {
      if (member.roles.cache.has(rs.roleId)) {
        if (rs.salary > bestSalary) {
          bestSalary = rs.salary;
          bestRoleName = rs.roleName;
        }
      }
    });

    if (bestSalary === 0) {
      return interaction.reply({ 
        content: '❌ ขออภัยครับ ยศที่คุณมีตอนนี้ยังไม่มีรายการรับเงินเดือนในระบบครับ (หรือคุณอาจยังไม่มียศที่ได้รับอนุญาต)', 
        ephemeral: true 
      });
    }

    // Process reward
    const xpReward = 200; // Daily salary also gives good XP
    user.balance += bestSalary;
    user.lastPayday = now;
    
    const xpResult = addXP(user, xpReward);
    saveUsers(users);

    const embed = new EmbedBuilder()
      .setTitle('💵 Payday! วันเงินเดือนออก')
      .setColor('Gold')
      .setDescription(`🎉 ยินดีด้วยครับ! คุณได้รับเงินเดือนในฐานะ **${bestRoleName}** เรียบร้อยแล้ว`)
      .addFields(
        { name: '💰 เงินเดือนที่ได้รับ:', value: `**${bestSalary.toLocaleString()} บาท (THB)**`, inline: true },
        { name: '⭐ ประสบการณ์:', value: `+${xpReward} XP`, inline: true }
      )
      .setFooter({ text: 'ขอบคุณที่ช่วยขับเคลื่อนเมืองไทยของเราให้ก้าวหน้าครับ!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log the salary payment
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      'จ่ายเงินเดือน (Payday)',
      `**ผู้รับ:** <@${userId}>\n**ยศที่รับ:** ${bestRoleName}\n**ยอดเงิน:** +${bestSalary.toLocaleString()} บาท`,
      'Yellow',
      true
    );
  }
};
