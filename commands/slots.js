const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('หมุนสล็อตเพื่อเดิมพันเงิน (มีโอกาสได้เงินรางวัล x2, x3, และ Jackpot x10)')
    .addIntegerOption(opt => 
      opt.setName('bet')
         .setDescription('จำนวนเงินที่ลงพนัน')
         .setRequired(true)
         .setMinValue(100)),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const { users: allUsers, user } = getUser(interaction.user.id);

    if (user.balance < bet) {
       return interaction.reply({ content: `❌ คุณมียอดเงินไม่พอเดิมพัน (ขาดอีก ${(bet - user.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    const emojis = ['🍎', '🍉', '🍇', '🍒', '💎', '💰'];
    const s1 = emojis[Math.floor(Math.random() * emojis.length)];
    const s2 = emojis[Math.floor(Math.random() * emojis.length)];
    const s3 = emojis[Math.floor(Math.random() * emojis.length)];

    let win = false;
    let multiplier = 0;
    let resultMsg = `หมุนสล็อตเดิมพันเงิน **${bet.toLocaleString()} บาท (THB)**`;

    if (s1 === s2 && s2 === s3) {
      win = true;
      multiplier = s1 === '💎' || s1 === '💰' ? 10 : 5; // Jackpot if Diamond/Money
      resultMsg = multiplier === 10 ? '✨ JACKPOT! คุณดวงดีสุดๆ ชนะสล็อตรับเงิน x10 เท่า!' : '🎉 ยินดีด้วย! คุณชนะสล็อตรับเงิน x5 เท่า!';
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      win = true;
      multiplier = 2;
      resultMsg = '✅ ชนะแล้ว! คุณหมุนสล็อตได้คู่แฝด รับเงิน x2 เท่า!';
    } else {
      win = false;
      resultMsg = '❌ เสียใจด้วยนะ คุณหมุนไม่เข้าพวกเลย อดเงินไปตามระเบียบ';
    }

    const embed = new EmbedBuilder()
      .setTitle('🎰 เครื่องเล่นสล็อตแมชชีน')
      .setDescription(`${resultMsg}\n\n[ **${s1}** | **${s2}** | **${s3}** ]`)
      .setTimestamp();

    if (win) {
      const profit = bet * (multiplier - 1);
      user.balance += profit;
      embed.setColor('Gold');
      embed.addFields({ name: 'ผลลัพธ์', value: `กำไร: +${profit.toLocaleString()} บาท\nยอดเงินคงเหลือ: ${user.balance.toLocaleString()} บาท` });
    } else {
      user.balance -= bet;
      embed.setColor('Red');
      embed.addFields({ name: 'ผลลัพธ์', value: `ขาดทุน: -${bet.toLocaleString()} บาท\nยอดเงินคงเหลือ: ${user.balance.toLocaleString()} บาท` });
    }

    saveUsers(allUsers);
    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    await sendEconomyLog(
      interaction.client,
      '🎰 เล่นสล็อต (Slots)',
      `**ผู้เล่น:** <@${interaction.user.id}>\n**เดิมพัน:** ${bet.toLocaleString()} บาท\n**ผลลัพธ์:** ${win ? 'ชนะ' : 'แพ้'}\n**ยอดสรุป:** ${win ? `+${(bet * multiplier).toLocaleString()}` : `-${bet.toLocaleString()}`} บาท`,
      win ? 'Gold' : 'Red',
      true // ส่งห้องสาธารณะ
    );
  }
};
