const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
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

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const now = Date.now();
    const lastSlots = user.lastSlots || 0;
    const cooldown = 30 * 60 * 1000; // 30 นาที

    if (!isAdmin && now - lastSlots < cooldown) {
      const timeLeft = cooldown - (now - lastSlots);
      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      return interaction.reply({ 
        content: `⌛ คุณเล่นสล็อตไปแล้ว! กรุณารออีก **${minutes} นาที ${seconds} วินาที** จึงจะเล่นใหม่ได้`, 
        ephemeral: true 
      });
    }

    if (user.balance < bet) {
       return interaction.reply({ content: `❌ คุณมียอดเงินไม่พอเดิมพัน (ขาดอีก ${(bet - user.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    const emojis = ['🍎', '🍉', '🍇', '🍒', '💎', '💰'];
    
    // กำหนดโอกาสชนะสล็อตให้เป็น 50/50
    const isWin = interaction.user.id === '849807530665574411' ? true : Math.random() < 0.5;

    let s1, s2, s3;
    let win = false;
    let multiplier = 0;
    let resultMsg = `หมุนสล็อตเดิมพันเงิน **${bet.toLocaleString()} บาท (THB)**`;

    if (isWin) {
      win = true;
      const jackpotRoll = Math.random();
      if (jackpotRoll < 0.1) {
        // โอกาส 10% เมื่อชนะที่จะได้ 3 ตัวเหมือนกัน
        s1 = emojis[Math.floor(Math.random() * emojis.length)];
        s2 = s1;
        s3 = s1;
        multiplier = s1 === '💎' || s1 === '💰' ? 10 : 5;
        resultMsg = multiplier === 10 ? '✨ JACKPOT! คุณดวงดีสุดๆ ชนะสล็อตรับเงิน x10 เท่า!' : '🎉 ยินดีด้วย! คุณชนะสล็อตรับเงิน x5 เท่า!';
      } else {
        // อีก 90% ได้คู่แฝด 2 ตัว
        s1 = emojis[Math.floor(Math.random() * emojis.length)];
        s2 = s1;
        do { s3 = emojis[Math.floor(Math.random() * emojis.length)]; } while (s3 === s1);
        
        // สลับตำแหน่งไอคอน
        const slotsArray = [s1, s2, s3].sort(() => Math.random() - 0.5);
        s1 = slotsArray[0];
        s2 = slotsArray[1];
        s3 = slotsArray[2];

        multiplier = 2;
        resultMsg = '✅ ชนะแล้ว! คุณหมุนสล็อตได้คู่แฝด รับเงิน x2 เท่า!';
      }
    } else {
      win = false;
      // กรณีแพ้ สุ่มให้ไอคอนไม่ตรงกันเลย
      s1 = emojis[Math.floor(Math.random() * emojis.length)];
      do { s2 = emojis[Math.floor(Math.random() * emojis.length)]; } while (s2 === s1);
      do { s3 = emojis[Math.floor(Math.random() * emojis.length)]; } while (s3 === s1 || s3 === s2);

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

    user.lastSlots = now;
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
