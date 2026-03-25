const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const salariesPath = path.join(__dirname, '..', 'data', 'role_salaries.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list_role_salaries')
    .setDescription('📋 (Admin) ตรวจสอบรายการเงินเดือนทั้งหมดที่คุณตั้งค่าไว้')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!fs.existsSync(salariesPath)) {
      return interaction.reply({ content: '💨 ยังไม่มีข้อมูลเงินเดือนในระบบครับ!', ephemeral: true });
    }

    const roleSalaries = JSON.parse(fs.readFileSync(salariesPath, 'utf8'));

    if (roleSalaries.length === 0) {
      return interaction.reply({ content: '💨 ยังไม่มีข้อมูลเงินเดือนในระบบครับ!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('💰 รายการเงินเดือนตามยศ (Role Salary List)')
      .setColor('Blue')
      .setDescription('นี่คือรายการยศทั้งหมดที่คุณได้ตั้งค่าเงินเดือนไว้ในดิสคอร์ดนี้ครับ')
      .setTimestamp();

    roleSalaries.forEach((rs, index) => {
      embed.addFields({ 
        name: `#${index + 1} ${rs.roleName}`, 
        value: `🔴 **ยศ:** <@&${rs.roleId}>\n💎 **เงินเดือน:** ${rs.salary.toLocaleString()} บาท (THB)`, 
        inline: false 
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};
