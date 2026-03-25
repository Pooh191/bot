const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

    if (user.balance < bet) {
      return interaction.reply({ content: `❌ คุณมียอดเงินไม่พอเดิมพัน (ขาดอีก ${(bet - user.balance).toLocaleString()} บาท)`, ephemeral: true });
    }

    const outcome = Math.random() < 0.5 ? 'head' : 'tail';
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
