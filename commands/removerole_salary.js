const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerole_salary')
    .setDescription('🛡️ (Admin) ลบยศออกจากระบบเงินเดือน')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('เลือกยศต้องการถอนรากถอนโคนออกจากระบบเงินเดือน')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    let roleSalaries = getCache('role_salaries') || [];
    if (roleSalaries.length === 0) {
      return interaction.reply({ content: '❌ ยังไม่มีข้อมูลในระบบเงินเดือนครับ', ephemeral: true });
    }

    const index = roleSalaries.findIndex(rs => rs.roleId === role.id);

    if (index === -1) {
      return interaction.reply({ content: '❌ ไม่พบข้อมูลยศนี้ในระบบรับเงินเดือนครับ', ephemeral: true });
    }

    roleSalaries.splice(index, 1);
    setCacheAndSave('role_salaries', roleSalaries, true);

    await interaction.reply({ content: `✅ ลบยศ **${role.name}** ออกจากระบบเรียบร้อยแล้ว!` });
  }
};
