const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-id-reset')
        .setDescription('🛠️ (Admin) รีเซ็ตข้อมูลบัตรประชาชนของสมาชิก')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('สมาชิกที่ต้องการรีเซ็ต')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const { users, user } = getUser(targetUser.id);

        if (!user.idCard) {
            return interaction.reply({ content: `❌ <@${targetUser.id}> ไม่มีข้อมูลบัตรประชาชน`, ephemeral: true });
        }

        user.idCard = null;
        saveUsers(users);

        const embed = new EmbedBuilder()
            .setTitle('✅ รีเซ็ตข้อมูลสำเร็จ')
            .setDescription(`รีเซ็ตบัตรประชาชนของ <@${targetUser.id}> เรียบร้อยแล้ว สมาชิกสามารถทำใหม่ได้ที่ \`/id-card\``)
            .setColor('Green')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
