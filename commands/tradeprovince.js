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
      .setTitle('🤝 คำขอแลกเปลี่ยนจังหวัด (Province Trade Request)')
      .setDescription(`<@${user.id}> จากเซิร์ฟเวอร์ **${interaction.guild.name}** ต้องการแลกจังหวัดกับคุณ!\n\n**ข้อเสนอ:**\n🏠 **เขามี:** ${userProvRole.name}\n🔄 **ของคุณ:** ${targetProvRole.name}\n\nคุณตกลงที่จะแลกเปลี่ยนหรือไม่?`)
      .setFooter({ text: 'คำขอนี้จะหมดอายุใน 60 วินาที' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_trade')
          .setLabel('ตกลง (Accept)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('decline_trade')
          .setLabel('ปฏิเสธ (Decline)')
          .setStyle(ButtonStyle.Danger)
      );

    try {
      // ส่งไปที่ DM ของเป้าหมาย
      const dmMessage = await target.send({
        content: `👋 สวัสดี <@${target.id}>! มีคำขอแลกเปลี่ยนจังหวัดใหม่จาก <@${user.id}>!`,
        embeds: [embed],
        components: [row]
      }).catch(async (err) => {
        return await interaction.reply({ 
          content: `❌ **ไม่สามารถส่งคำขอไปหา <@${target.id}> ได้** (เนื่องจากเขาปิดรับ DM จากคนแปลกหน้าหรือบอท)`, 
          ephemeral: true 
        });
      });

      if (!dmMessage) return;

      // แจ้งผู้ส่งว่าส่งสำเร็จ
      await interaction.reply({ 
        content: `✅ **ส่งคำขอแลกจังหวัดไปที่ DM ของ <@${target.id}> เรียบร้อยแล้ว!** กรุณารอเขาตอบกลับครับ`, 
        ephemeral: true 
      });

      const filter = i => i.user.id === target.id;
      const collector = dmMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'accept_trade') {
          try {
            // ดึงข้อมูลล่าสุด
            const guild = interaction.guild;
            const guildMember = await guild.members.fetch(user.id);
            const targetMember = await guild.members.fetch(target.id);

            // สลับยศใน Discord
            await guildMember.roles.remove(userProvRole);
            await guildMember.roles.add(targetProvRole);
            await targetMember.roles.remove(targetProvRole);
            await targetMember.roles.add(userProvRole);

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

            await i.update({
              content: '✅ **การแลกเปลี่ยนสำเร็จเรียบร้อย!** ยศของคุณถูกเปลี่ยนแล้วในเซิร์ฟเวอร์',
              embeds: [
                new EmbedBuilder()
                  .setColor('Green')
                  .setTitle('✅ แลกเปลี่ยนสำเร็จ')
                  .setDescription(`คุณและ <@${user.id}> ได้แลกจังหวัดกันแล้ว!\n📍 ยศใหม่ของคุณ: **${userProvRole.name}**`)
              ],
              components: []
            });

            // แจ้งเตือนผู้ส่งทาง DM ด้วย
            await user.send(`✅ <@${target.id}> ตอบรับคำขอของคุณแล้ว! จังหวัดของคุณเปลี่ยนเป็น **${targetProvRole.name}** เรียบร้อยแล้ว!`).catch(() => {});

            // ส่ง Log ไปที่ช่อง Log หลัก
            const { sendEconomyLog } = require('../utils/logger');
            await sendEconomyLog(
              interaction.client,
              '🤝 แลกเปลี่ยนจังหวัดสำเร็จ (DM Trade Success)',
              `**ผู้ใช้ 1:** <@${user.id}> (**${userProvRole.name}** -> **${targetProvRole.name}**)\n**ผู้ใช้ 2:** <@${target.id}> (**${targetProvRole.name}** -> **${userProvRole.name}**)`,
              'Green',
              false
            );

          } catch (err) {
            console.error(err);
            await i.update({ content: '❌ เกิดข้อผิดพลาดในการสลับยศ กรุณาแจ้งแอดมิน (บอทอาจไม่มีสิทธิ์กดยศของคุณ)', embeds: [], components: [] });
          }
        } else {
          await i.update({ content: '❌ คุณปฏิเสธคำขอแลกเปลี่ยนแล้ว', embeds: [], components: [] });
          await user.send(`❌ <@${target.id}> ปฏิเสธการแลกจังหวัดของคุณ`).catch(() => {});
        }
        collector.stop();
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          dmMessage.edit({ content: '⏳ คำขอแลกจังหวัดหมดอายุแล้ว', embeds: [], components: [] }).catch(() => {});
        }
      });

    } catch (e) {
      console.error(e);
      if (!interaction.replied) {
        await interaction.reply({ 
          content: `❌ เกิดข้อผิดพลาดบางประการในการส่งคำขอ`, 
          ephemeral: true 
        });
      }
    }
  }
};
