const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('แอบขโมยเงินจากผู้อื่น (มีความเสี่ยง 50/50 โดนจับได้จะเสียค่าปรับ)')
    .addUserOption(opt => 
      opt.setName('target')
         .setDescription('เลือกเหยื่อที่ต้องการปล้น')
         .setRequired(true)),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const target = interaction.options.getUser('target');

    if (target.id === senderId) {
      return interaction.reply({ content: '❌ คุณไม่สามารถปล้นตัวเองได้ครับ', ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: '❌ คุณไม่สามารถปล้นสิ่งที่ไม่มีชีวิต (บอท) ได้ครับ', ephemeral: true });
    }

    const { users: allUsers, user: thief } = getUser(senderId);
    const { user: victim } = getUser(target.id);

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Cooldown check
    const now = Date.now();
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours
    const lastRob = thief.lastRob || 0;

    if (!isAdmin && now - lastRob < cooldown) {
      const timeLeft = cooldown - (now - lastRob);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({ content: `❌ คุณเพิ่งปล้นไปไม่นาน ตำรวจกำลังตามสืบอยู่! (รออีก **${hours} ชั่วโมง ${minutes} นาที**)` });
    }

    if (victim.balance < 500) {
      return interaction.reply({ content: `❌ เหยื่อรายนี้ยากจนเกินไป มีเงินไม่ถึง 500 บาท ปล่อยเขาไปเถอะครับ` });
    }

    // Success probability: 40% (chance of success is slightly lower than fail for balance)
    const success = Math.random() < 0.4;
    thief.lastRob = now;

    const embed = new EmbedBuilder()
      .setTitle('🥷 การลักขโมยทรัพย์สิน')
      .setTimestamp();

    if (success) {
      const stolen = Math.floor(victim.balance * (Math.random() * 0.2 + 0.05)); // 5% - 25% of victim balance
      thief.balance += stolen;
      victim.balance -= stolen;

      embed.setColor('Green');
      embed.setDescription(`คุณแอบขโมยเงินจากกระเป๋า <@${target.id}> ได้สำเร็จ!`);
      embed.addFields({ name: 'กำไรที่ได้', value: `+${stolen.toLocaleString()} บาท (THB)`, inline: true });
    } else {
      const fine = 1000; // fixed fine if caught
      thief.balance = Math.max(0, thief.balance - fine);

      embed.setColor('Red');
      embed.setDescription(`❌ **พลาดแล้ว!** ตำรวจเมืองอาร์ลิงตันจับตัวคุณไว้ได้ทันควัน ขณะกำลังล้วงกระเป๋า <@${target.id}>`);
      embed.addFields({ name: 'ค่าปรับ (罰)', value: `-${fine.toLocaleString()} บาท (THB)`, inline: true });
      embed.setFooter({ text: 'คุณถูกตำรวจพยายามจับกุมตัว (เงินหาย)' });
    }

    saveUsers(allUsers);
    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    await sendEconomyLog(
      interaction.client,
      '🥷 ฉ้อโกง/ปล้น (Rob PvP)',
      `**โจร:** <@${senderId}>\n**เหยื่อ:** <@${target.id}>\n**สถานะ:** ${success ? 'สำเร็จ ✅' : 'ล้มเหลว ❌'}\n**ยอดสรุป:** ${success ? `โจรได้เงินจากเหยื่อ` : `โจรเสียค่าปรับ`}`,
      success ? 'Green' : 'Red',
      true
    );
  }
};
