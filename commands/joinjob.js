const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser, saveUsers } = require('../utils/economyUtils');

const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joinjob')
    .setDescription('🤝 สมัครเข้าทำงานในอาชีพที่คุณสนใจ')
    .addStringOption(option => 
      option.setName('job_id')
        .setDescription('เลือกอาชีพที่คุณต้องการสมัคร')
        .setRequired(true)
        .addChoices(
          { name: 'ไม่มีอาชีพ (ว่างงาน)', value: 'none' },
          { name: 'แพทย์ (Doctor)', value: 'doctor' },
          { name: 'ตำรวจ (Police)', value: 'police' },
          { name: 'สถาปนิก (Architect)', value: 'architect' },
          { name: 'พนักงานส่งของ (Delivery)', value: 'delivery' }
        )),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const jobId = interaction.options.getString('job_id');
    const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
    const selectedJob = jobs.find(j => j.id === jobId);

    if (!selectedJob) {
      return interaction.reply({ content: '❌ ไม่พบข้อมูลอาชีพที่เลือกกรุณาตรวจสอบอีกครั้งครับ', ephemeral: true });
    }

    if (user.level < selectedJob.minLevel) {
      return interaction.reply({ 
        content: `❌ เลเวลของคุณไม่เพียงพอ! คุณต้องมีเลเวลอย่างน้อย **${selectedJob.minLevel}** จึงจะสามารถสมัครเป็น **${selectedJob.name}** ได้ครับ`, 
        ephemeral: true 
      });
    }

    if (user.job === jobId) {
      return interaction.reply({ content: `💼 คุณกำลังทำอาชีพ **${selectedJob.name}** อยู่แล้วครับ!`, ephemeral: true });
    }

    user.job = jobId;
    saveUsers(users);

    await interaction.reply({
      content: `🎉 **ยินดีด้วย!** คุณได้เริ่มต้นทำงานเป็น **${selectedJob.name}** เรียบร้อยแล้ว!\nตอนนี้คุณจะได้รับตัวคูณรายได้เป็น **x${selectedJob.multiplier}** จากการทำงานปกติ`
    });
  }
};
