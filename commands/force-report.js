const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { runDailyUpdate } = require('../scheduler/dailyUpdate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force-report')
    .setDescription('ทดสอบส่งรายงานเศรษฐกิจอัพเดททันที (สำหรับ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    
    // Call the daily update manually
    const result = await runDailyUpdate(client);
    
    if (result && result.success) {
      await interaction.editReply('✅ ส่งรายงานเศรษฐกิจสำเร็จ! ตรวจสอบห้องประกาศได้เลยครับ');
    } else {
      await interaction.editReply(`❌ เกิดข้อผิดพลาดในการส่งรายงาน: ${result?.message || 'ไม่ทราบสาเหตุ'}`);
    }
  }
};
