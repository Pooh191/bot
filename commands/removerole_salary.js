const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const salariesPath = path.join(__dirname, '..', 'data', 'role_salaries.json');

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

    if (!fs.existsSync(salariesPath)) {
      return interaction.reply({ content: '❌ ยังไม่มีข้อมูลในระบบเงินเดือนครับ', ephemeral: true });
    }

    let roleSalaries = JSON.parse(fs.readFileSync(salariesPath, 'utf8'));
    const index = roleSalaries.findIndex(rs => rs.roleId === role.id);

    if (index === -1) {
      return interaction.reply({ content: '❌ ไม่พบข้อมูลยศนี้ในระบบรับเงินเดือนครับ', ephemeral: true });
    }

    roleSalaries.splice(index, 1);
    fs.writeFileSync(salariesPath, JSON.stringify(roleSalaries, null, 2));

    await interaction.reply({ content: `✅ ลบยศ **${role.name}** ออกจากระบบเรียบร้อยแล้ว!` });
  }
};
