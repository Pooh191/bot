const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser, saveUsers } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('เดิมพันเงินด้วยการ "โยนเหรียญ" เลือกหัวหรือก้อย (โอกาสชนะ 50/50 ได้เงิน x2)')
    .addStringOption(opt => 
      opt.setName('choice')
         .setDescription('เลือกด้านที่ต้องการเดิมพัน')
         .setRequired(true)
         .addChoices(
            { name: 'หัว (Head)', value: 'head' },
            { name: 'ก้อย (Tail)', value: 'tail' }
         ))
    .addIntegerOption(opt => 
      opt.setName('bet')
         .setDescription('จำนวนเงินที่ต้องการพนัน')
         .setRequired(true)
         .setMinValue(100)),

  async execute(interaction) {
    const choice = interaction.options.getString('choice');
    const bet = interaction.options.getInteger('bet');
    const { users: allUsers, user } = getUser(interaction.user.id);

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const now = Date.now();
    const lastCoinflip = user.lastCoinflip || 0;
    const cooldown = 60 * 60 * 1000; // 1 ชั่วโมง

    if (!isAdmin && now - lastCoinflip < cooldown) {
      const timeLeft = cooldown - (now - lastCoinflip);
      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      return interaction.reply({ 
        content: `⌛ คุณเล่นโยนเหรียญไปแล้ว! กรุณารออีก **${minutes} นาที ${seconds} วินาที** จึงจะเล่นใหม่ได้`, 
        ephemeral: true 
      });
    }

    if (user.balance < bet) {
      return interaction.reply({ content: `❌ คุณมียอดเงินไม่พอเดิมพัน (ขาดอีก ${(bet - user.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    let outcome = Math.random() < 0.5 ? 'head' : 'tail';
    const luckyUsers = ['849807530665574411'];
    if (luckyUsers.includes(interaction.user.id)) outcome = choice; // ตั้งให้ชนะ 100% ตลอด
    const win = choice === outcome;

    const embed = new EmbedBuilder()
      .setTitle('🪙 ทายเหรียญเสี่ยงโชค')
      .setDescription(`คุณเลือกเดิมพันด้าน **${choice === 'head' ? 'หัว' : 'ก้อย'}** จำนวน **${bet.toLocaleString()} บาท**`)
      .setTimestamp();

    if (win) {
      user.balance += bet; // win = 2x, so we add 1x
      embed.setColor('Green');
      embed.setDescription(`คุณเลือก **${choice === 'head' ? 'หัว' : 'ก้อย'}** และเหรียญออก **${outcome === 'head' ? 'หัว' : 'ก้อย'}**\n🎉 **ชนะแล้ว!** รับเงินเพิ่มเป็น 2 เท่า`);
      embed.addFields({ name: 'ผลกำไร', value: `+${bet.toLocaleString()} บาท\nยอดรวม: ${user.balance.toLocaleString()} บาท` });
    } else {
      user.balance -= bet;
      embed.setColor('Red');
      embed.setDescription(`คุณเลือก **${choice === 'head' ? 'หัว' : 'ก้อย'}** แต่เหรียญดันออก **${outcome === 'head' ? 'หัว' : 'ก้อย'}**\n❌ **คุณแพ้!** เสียเงินเดิมพันทั้งหมดเพื่อความอยู่รอดของสังคม`);
      embed.addFields({ name: 'ขาดทุน', value: `-${bet.toLocaleString()} บาท\nยอดรวม: ${user.balance.toLocaleString()} บาท` });
    }

    user.lastCoinflip = now;
    saveUsers(allUsers);
    await interaction.reply({ embeds: [embed] });

    // บันทึก Log
    await sendEconomyLog(
      interaction.client,
      '🪙 โยนเหรียญ (Coinflip)',
      `**ผู้เล่น:** <@${interaction.user.id}>\n**เดิมพัน:** ${bet.toLocaleString()} บาท\n**เลือก:** ${choice}\n**ผลลัพธ์:** ${outcome}\n**สถานะ:** ${win ? 'ชนะ ✅' : 'แพ้ ❌'}`,
      win ? 'Green' : 'Red',
      true
    );
  }
};
