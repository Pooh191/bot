const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
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
    .setDescription('แลกเปลี่ยนจังหวัดกับผู้ใช้อื่น (ส่งคำขอผ่าน DM)')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('เลือกพื่อนที่ต้องการแลกเปลี่ยนจังหวัดด้วย')
        .setRequired(true)),

  async execute(interaction) {
    // 1. ตอบรับทันทีเพื่อป้องกัน Timeout (3 วินาที)
    try {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    } catch (e) {
      console.error('Defer Error:', e);
      return;
    }

    const target = interaction.options.getMember('target');
    const user = interaction.member;

    // 2. ตรวจสอบเงื่อนไข
    if (!target || target.user.bot || target.id === user.id) {
      return interaction.editReply({ content: '❌ คุณไม่สามารถแลกเปลี่ยนกับตัวเองหรือบอทได้' });
    }

    // หายศจาก Cache
    const userProvRole = user.roles.cache.find(r => rolesInOrder.includes(r.name));
    const targetProvRole = target.roles.cache.find(r => rolesInOrder.includes(r.name));

    if (!userProvRole) return interaction.editReply({ content: '❌ คุณยังไม่มีจังหวัดในตอนนี้' });
    if (!targetProvRole) return interaction.editReply({ content: '❌ เพื่อนคนนี้ยังไม่มีจังหวัดในตอนนี้' });

    if (userProvRole.id === targetProvRole.id) {
      return interaction.editReply({ content: `❌ คุณทั้งคู่เป็นคนจังหวัด **${userProvRole.name}** เหมือนกันอยู่แล้ว` });
    }

    // 3. เตรียมคำขอ (ส่งให้ Target ใน DM)
    const tradeEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🤝 คำขอแลกเปลี่ยนจังหวัด')
      .setDescription(`👋 สวัสดี <@${target.id}>!\nคุณ <@${user.id}> จากเซิร์ฟเวอร์ **${interaction.guild.name}** ต้องการขอแลกแเปลี่ยนจังหวัดกับคุณ\n\n**ข้อเสนอแลกเปลี่ยน:**\n🏠 **จังหวัดของเดิมของคุณ:** \`${targetProvRole.name}\`\n🔄 **จังหวัดใหม่ที่จะได้รับ:** \`${userProvRole.name}\`\n\nกดปุ่มด้านล่างเพื่อยืนยันการแลกเปลี่ยน (หมดอายุใน 1 นาที)`)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_trade').setLabel('ตกลงยอมรับ').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_trade').setLabel('ปฏิเสธ').setStyle(ButtonStyle.Danger)
    );

    try {
      // 4. ส่งขอทาง DM
      const dm = await target.send({
        content: `📬 มีคำขอแลกจังหวัดใหม่จาก <@${user.id}>`,
        embeds: [tradeEmbed],
        components: [buttons]
      }).catch(() => null);

      if (!dm) {
        return interaction.editReply({ content: `❌ ไม่สามารถส่งข้อความหา <@${target.id}> ได้ (เขาอาจปิด DM หรือบล็อกบอท)` });
      }

      await interaction.editReply({ content: `✅ **ส่งคำขอแลกจังหวัดไปที่แชทส่วนตัว (DM) ของ <@${target.id}> แล้ว**\nกรุณารอเขากดอนุมัติครับ` });

      // 5. รอการตอบกลับ (Target ใน DM)
      const collector = dm.createMessageComponentCollector({
        filter: i => i.user.id === target.id,
        time: 60000,
        max: 1
      });

      collector.on('collect', async i => {
        try {
          await i.deferUpdate(); // รับทราบการกดปุ่มทันที
          
          if (i.customId === 'confirm_trade') {
            await i.editReply({ content: '⏳ กำลังดำเนินการสลับจังหวัดให้ในเซิร์ฟเวอร์สักครู่...', embeds: [], components: [] });

            const guild = interaction.guild;
            const [m1, m2] = await Promise.all([
              guild.members.fetch(user.id).catch(() => user),
              guild.members.fetch(target.id).catch(() => target)
            ]);

            // สลับยศ
            await m1.roles.remove(userProvRole);
            await m1.roles.add(targetProvRole);
            await m2.roles.remove(targetProvRole);
            await m2.roles.add(userProvRole);

            // เซฟ DB
            const dbPath = path.join(__dirname, '..', 'data', 'uid_roles.json');
            let db = {};
            if (fs.existsSync(dbPath)) db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            db[user.id] = targetProvRole.name;
            db[target.id] = userProvRole.name;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

            // แจ้งผล
            await i.editReply({ content: `✅ **สำเร็จ!** คุณได้แลกเป็นคนจังหวัด **${userProvRole.name}** เรียบร้อยแล้ว` });
            await user.send(`✅ **คุณ <@${target.id}> กดยอมรับการแลกเปลี่ยนแล้ว!**\nตอนนี้คุณเป็นคนจังหวัด **${targetProvRole.name}** ในเซิร์ฟเวอร์ ${guild.name}`).catch(() => {});

            // Log
            const { sendEconomyLog } = require('../utils/logger');
            sendEconomyLog(interaction.client, '🤝 สลับจังหวัดสำเร็จ (Trade)', `${user.user.tag} (${userProvRole.name}) 🔁 ${target.user.tag} (${targetProvRole.name})`, 'Green', false);

          } else {
            await i.editReply({ content: '❌ คุณปฏิเสธคำขอแลกเปลี่ยนนี้', embeds: [], components: [] });
            await user.send(`❌ **คุณ <@${target.id}> ปฏิเสธการแลกจังหวัดกับคุณ**`).catch(() => {});
          }
        } catch (err) {
          console.error('Collector Error:', err);
          await i.editReply({ content: '❌ เกิดข้อผิดพลาดบางประการ (บอทอาจมียศต่ำเกินไป)' }).catch(() => {});
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          dm.edit({ content: '⏰ คำขอหมดอายุแล้ว', embeds: [], components: [] }).catch(() => {});
        }
      });

    } catch (err) {
      console.error('Execute Error:', err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดบางอย่างในการดำเนินการ' }).catch(() => {});
    }
  }
};
