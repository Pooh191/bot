const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole_salary')
    .setDescription('🛡️ (Admin) ตั้งค่าเงินเดือนให้แต่ละยศ')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('เลือกยศที่ต้องการตั้งค่าเงินกินเปล่า')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('salary')
        .setDescription('ระบุจำนวนเงินที่จะได้รับ')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const salary = interaction.options.getInteger('salary');

    let roleSalaries = getCache('role_salaries') || [];

    const index = roleSalaries.findIndex(rs => rs.roleId === role.id);
    if (index !== -1) {
      roleSalaries[index].salary = salary;
      roleSalaries[index].roleName = role.name;
    } else {
      roleSalaries.push({
        roleId: role.id,
        roleName: role.name,
        salary: salary
      });
    }

    // Sort by salary DESC (to ensure highest salary is picked first later)
    roleSalaries.sort((a, b) => b.salary - a.salary);

    setCacheAndSave('role_salaries', roleSalaries, true);

    await interaction.reply({ 
      content: `✅ ตั้งค่าเงินเดือนให้ยศ **${role.name}** เป็น **${salary.toLocaleString()} บาท** เรียบร้อยแล้วครับ!` 
    });
  }
};
