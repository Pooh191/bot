const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const rolesInOrder = [
  'CMI | เชียงใหม่', 'CRI | เชียงราย', 'LPN | ลำพูน',
  'NMA | นครราชสีมา', 'KKN | ขอนแก่น', 'UDN | อุดรธานี',
  'BKK | กรุงเทพมหานคร', 'AYA | พระนครศรีอยุธยา', 'NBI | นนทบุรี',
  'PKT | ภูเก็ต', 'SKA | สงขลา', 'SNI | สุราษฎร์ธานี'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tradeprovince')
    .setDescription('แลกเปลี่ยนจังหวัดกับผู้ใช้อื่น')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('ผู้ใช้ที่ต้องการแลกเปลี่ยนด้วย')
        .setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const user = interaction.member;

    if (!target || target.user.bot || target.id === user.id) {
      return interaction.reply({ content: '❌ คุณไม่สามารถแลกเปลี่ยนกับตัวเองหรือบอทได้', ephemeral: true });
    }

    // หายศจังหวัดของทั้งคู่
    const userProvRole = user.roles.cache.find(r => rolesInOrder.includes(r.name));
    const targetProvRole = target.roles.cache.find(r => rolesInOrder.includes(r.name));

    if (!userProvRole) return interaction.reply({ content: '❌ คุณยังไม่มีจังหวัดที่จะแลกเปลี่ยน', ephemeral: true });
    if (!targetProvRole) return interaction.reply({ content: '❌ ผู้ใช้คนนั้นยังไม่มีจังหวัดที่จะแลกเปลี่ยน', ephemeral: true });

    if (userProvRole.id === targetProvRole.id) {
      return interaction.reply({ content: `❌ คุณทั้งคู่เป็นคนจังหวัด **${userProvRole.name}** เหมือนกันอยู่แล้ว`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('🤝 คำขอแลกเปลี่ยนจังหวัด')
      .setDescription(`<@${user.id}> ต้องการแลกจังหวัดกับคุณ!\n\n**ข้อเสนอ:**\n🏠 **${user.user.username}**: ${userProvRole.name}\n🔄 **${target.user.username}**: ${targetProvRole.name}\n\nคุณตกลงที่จะแลกเปลี่ยนหรือไม่?`)
      .setFooter({ text: 'คำขอนี้จะหมดอายุใน 60 วินาที' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_trade')
          .setLabel('ตกลง')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('decline_trade')
          .setLabel('ปฏิเสธ')
          .setStyle(ButtonStyle.Danger)
      );

    const response = await interaction.reply({
      content: `<@${target.id}> มีคำขอแลกจังหวัดจาก <@${user.id}>`,
      embeds: [embed],
      components: [row]
    });

    const filter = i => i.user.id === target.id;
    try {
      const confirmation = await response.awaitMessageComponent({ filter, time: 60000 });

      if (confirmation.customId === 'accept_trade') {
        // ดำเนินการแลกเปลี่ยน
        try {
          // สลับยศใน Discord
          await user.roles.remove(userProvRole);
          await user.roles.add(targetProvRole);
          await target.roles.remove(targetProvRole);
          await target.roles.add(userProvRole);

          // อัปเดต Database
          const UID_ROLE_FILE = path.join(__dirname, '..', 'data', 'uid_roles.json');
          let uidRoles = {};
          if (fs.existsSync(UID_ROLE_FILE)) {
            try {
              uidRoles = JSON.parse(fs.readFileSync(UID_ROLE_FILE, 'utf8'));
            } catch (e) {
              uidRoles = {};
            }
          }
          
          uidRoles[user.id] = targetProvRole.name;
          uidRoles[target.id] = userProvRole.name;
          
          fs.writeFileSync(UID_ROLE_FILE, JSON.stringify(uidRoles, null, 2), 'utf8');

          await confirmation.update({
            content: '✅ **การแลกเปลี่ยนสำเร็จ!**',
            embeds: [
              new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ แลกเปลี่ยนจังหวัดสำเร็จ')
                .setDescription(`<@${user.id}> และ <@${target.id}> ได้แลกจังหวัดกันเรียบร้อยแล้ว!\n\n📍 <@${user.id}>: **${targetProvRole.name}**\n📍 <@${target.id}>: **${userProvRole.name}**`)
            ],
            components: []
          });

          const { sendEconomyLog } = require('../utils/logger');
          await sendEconomyLog(
            interaction.client,
            '🤝 แลกเปลี่ยนจังหวัด (Province Trade)',
            `**ผู้ใช้ 1:** <@${user.id}> (**${userProvRole.name}** -> **${targetProvRole.name}**)\n**ผู้ใช้ 2:** <@${target.id}> (**${targetProvRole.name}** -> **${userProvRole.name}**)`,
            'Green',
            false
          );

        } catch (err) {
          console.error(err);
          await confirmation.update({ content: '❌ เกิดข้อผิดพลาดในการกดยศ กรุณาตรวจสอบสิทธิ์ของบอท (บอทต้องมียศสูงกว่ายศที่จะแลก)', embeds: [], components: [] });
        }
      } else {
        await confirmation.update({ content: '❌ การแลกเปลี่ยนถูกปฏิเสธ', embeds: [], components: [] });
      }
    } catch (e) {
      await interaction.editReply({ content: '⏳ คำขอหมดอายุแล้ว', embeds: [], components: [] });
    }
  }
};
