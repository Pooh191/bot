const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser } = require('../utils/economyUtils');

const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jobs')
    .setDescription('💼 แสดงรายการอาชีพทั้งหมดที่สามารถสมัครได้'),

  async execute(interaction) {
    const { user } = getUser(interaction.user.id);
    const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));

    const embed = new EmbedBuilder()
      .setTitle('💼 รายการอาชีพในเขตการปกครองพิเศษ')
      .setColor('Green')
      .setDescription(`อาชีพปัจจุบันของคุณคือ: **${jobs.find(j => j.id === user.job)?.name || 'ว่างงาน'}**\nใช้คำสั่ง \`/joinjob [ชื่ออาชีพ]\` เพื่อสมัครงาน`)
      .setTimestamp();

    jobs.forEach(job => {
      embed.addFields({ 
        name: `${job.name} (คูณเงิน x${job.multiplier})`, 
        value: `**รายละเอียด:** ${job.description}\n**เงื่อนไข:** ต้องมีเลเวลอย่างน้อย ${job.minLevel}`, 
        inline: false 
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};
