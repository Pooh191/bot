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

    // แจ้งบอทว่ากำลังประมวลผล (ป้องกัน Interaction Failed)
    await interaction.deferReply({ ephemeral: true });

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
      // ส่งไปที่ DM ของเป้าหมาย (คนถูกแลก)
      const dmMessage = await target.send({
        content: `👋 สวัสดี <@${target.id}>! มีคำขอแลกเปลี่ยนจังหวัดจาก <@${user.id}>!`,
        embeds: [embed],
        components: [row]
      }).catch(() => null);

      if (!dmMessage) {
        return interaction.editReply({ 
          content: `❌ **ไม่สามารถส่งขอทาง DM ได้** คุณ <@${target.id}> อาจจะปิดรับ DM ครับ`
        });
      }

      // แจ้งผู้ส่งในช่องพิมพ์คำสั่ง (ผู้ส่งเห็นคนเดียว)
      await interaction.editReply({ 
        content: `✅ **ส่งคำขอแลกจังหวัดไปที่แชทส่วนตัว (DM) ของ <@${target.id}> เรียบร้อยแล้ว!**`
      });

      const filter = i => i.user.id === target.id;
      const collector = dmMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        // รับทราบการกดปุ่มทันทีเพื่อป้องกัน "การตอบโต้ล้มเหลว"
        await i.deferUpdate();

        if (i.customId === 'accept_trade') {
          // ส่งข้อความแจ้งว่ากำลังทำรายการ
          await i.editReply({ content: '⏳ กำลังดำเนินการสลับจังหวัดให้คุณในเซิร์ฟเวอร์...', embeds: [], components: [] });

          try {
            const guild = interaction.guild;
            if (!guild) throw new Error('ไม่พบข้อมูลเซิร์ฟเวอร์ (Guild not found)');

            // มั่นใจว่าได้ข้อมูลสมาชิกที่อัปเดตล่าสุด
            const [guildMember, targetMember] = await Promise.all([
              guild.members.fetch(user.id).catch(() => user),
              guild.members.fetch(target.id).catch(() => target)
            ]);

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

            // แจ้ง Target (ใน DM)
            await i.editReply({
              content: `✅ **แลกเปลี่ยนสำเร็จ!** คุณเป็นคนจังหวัด **${userProvRole.name}** แล้วในเซิร์ฟเวอร์ **${guild.name}**`
            });

            // แจ้ง Proposer (ทาง DM)
            await user.send(`✅ **คุณ <@${target.id}> ได้ตกลงในการเปลี่ยนจังหวัดแล้ว!**\nขณะนี้คุณเป็นคนจังหวัด **${targetProvRole.name}** เรียบร้อยแล้ว!`).catch(() => {});

            // ส่ง Log
            const { sendEconomyLog } = require('../utils/logger');
            await sendEconomyLog(
              interaction.client,
              '🤝 แลกเปลี่ยนจังหวัดสำเร็จ (DM Trade Success)',
              `**${user.user.tag}** (${userProvRole.name}) 🔄 **${target.user.tag}** (${targetProvRole.name})`,
              'Green',
              false
            );

          } catch (err) {
            console.error('❌ Trade Error:', err);
            await i.editReply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}\n(บอทอาจมียศต่ำกว่ายศจังหวัด หรือคุณออกจากเซิร์ฟเวอร์ไปแล้ว)` });
          }
        } else {
          await i.editReply({ content: '❌ คุณปฏิเสธคำขอแลกเปลี่ยนนี้แล้ว', embeds: [], components: [] });
          await user.send(`❌ **คุณ <@${target.id}> ปฏิเสธการแลกจังหวัดกับคุณ**`).catch(() => {});
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
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ เกิดข้อผิดพลาดบางประการ', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดบางประการ' });
      }
    }
  }
};
