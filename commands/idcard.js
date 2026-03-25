const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../utils/economyUtils');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-card')
        .setDescription('🪪 ดูบัตรประจำตัวประชาชนของคุณ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('เลือกผู้ใช้ที่ต้องการดูบัตร (ว่างไว้เพื่อดูของตัวเอง)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { user } = getUser(targetUser.id);

        // โหลดข้อมูลจังหวัดจาก uid_roles.json
        const uidRolesPath = path.join(__dirname, '..', 'data', 'uid_roles.json');
        let province = 'ไม่ระบุ';
        if (fs.existsSync(uidRolesPath)) {
            const uidRoles = JSON.parse(fs.readFileSync(uidRolesPath, 'utf8'));
            if (uidRoles[targetUser.id]) {
                province = uidRoles[targetUser.id].split(' | ')[1] || uidRoles[targetUser.id];
            }
        }

        // ถ้ายังไม่มีบัตรประชาชน
        if (!user.idCard) {
            if (targetUser.id !== interaction.user.id) {
                return interaction.reply({ content: `❌ <@${targetUser.id}> ยังไม่ได้ทำบัตรประชาชน`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🪪 คุณยังไม่ได้ทำบัตรประชาชน')
                .setDescription('กรุณากดปุ่มด้านล่างเพื่อลงทะเบียนข้อมูลบัตรประชาชนของคุณ')
                .setColor('Yellow')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('register_id_card')
                    .setLabel('ลงทะเบียนบัตรประชาชน')
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // แสดงบัตรประชาชน
        const id = user.idCard;
        // จัดรูปแบบเลขบัตรให้เว้นวรรคสวยงามแบบบัตรประชาชนไทย (1 4 5 2 1 + ส่วนที่เหลือ)
        const formattedId = id.idNumber.toString().replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})(.*)/, '$1 $2 $3 $4 $5 $6').trim();

        const embed = new EmbedBuilder()
            .setTitle('🇹🇭 บัตรประจำตัวประชาชน (Identification Card)')
            .setColor('#2b2d31') // ใช้สีเทาเข้มให้ดูเป็นทางการและกลมกลืนกับ Discord
            .setThumbnail(targetUser.displayAvatarURL({ size: 1024, format: 'png' }))
            .addFields(
                { name: 'เลขประจำตัวประชาชน (ID Number)', value: `**${formattedId}**`, inline: false },
                { name: 'ชื่อตัวและชื่อสกุล (Name - Surname)', value: `${id.nameThai}\n(${id.nameEng})`, inline: false },
                { name: 'เกิดวันที่ (Date of Birth)', value: id.birthDate, inline: true },
                { name: 'ที่อยู่ (Address)', value: province, inline: true },
                { name: 'วันออกบัตร (Date of Issue)', value: id.issueDate, inline: true },
                { name: 'วันบัตรหมดอายุ (Date of Expiry)', value: id.expiryDate, inline: true }
            )
            .setFooter({ text: 'กรมการปกครอง (Department of Provincial Administration)' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
