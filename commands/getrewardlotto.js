const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const LottoTicket = require('../models/LottoTicket');
const LottoDraw = require('../models/LottoDraw');
const { checkPrize } = require('../utils/lottoUtils');
const { getUser, saveUsers } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getrewardlotto')
    .setDescription('💰 ตรวจรางวัลและรับเงินจากสลากกินแบ่งรัฐบาล'),

  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Find all uncalculated tickets for the user
    // We only care about tickets where the draw has happened (announced: true)
    const announcedDraws = await LottoDraw.find({ announced: true });
    if (announcedDraws.length === 0) {
      return interaction.editReply('❌ ยังไม่มีงวดที่ประกาศผลรางวัลในขณะนี้');
    }

    const drawDates = announcedDraws.map(d => d.drawDate);
    const tickets = await LottoTicket.find({ 
      userId: interaction.user.id, 
      drawDate: { $in: drawDates },
      claimed: false 
    });

    if (tickets.length === 0) {
      return interaction.editReply('❌ คุณไม่มีสลากที่ถูกรางวัล หรือคุณได้รับรางวัลไปหมดแล้วสำหรับงวดที่ผ่านมาครับ');
    }

    let totalWinningAmount = 0;
    let details = [];

    const { users, user } = getUser(interaction.user.id);

    for (const ticket of tickets) {
      const draw = announcedDraws.find(d => d.drawDate === ticket.drawDate);
      if (!draw) continue;

      let ticketBestPrize = null;
      let winningNumber = '';

      for (const num of ticket.numbers) {
        const prize = checkPrize(num, draw.results);
        if (prize) {
          if (!ticketBestPrize || prize.amount > ticketBestPrize.amount) {
            ticketBestPrize = prize;
            winningNumber = num;
          }
        }
      }

      if (ticketBestPrize) {
        totalWinningAmount += ticketBestPrize.amount;
        details.push(`✅ งวดวันที่ ${ticket.drawDate}: เลข \`${winningNumber}\` ถูกรางวัล **${ticketBestPrize.name}** รับเงิน **${ticketBestPrize.amount.toLocaleString()} บาท**`);
        ticket.status = 'won';
      } else {
        ticket.status = 'lost';
      }
      ticket.claimed = true;
      await ticket.save();
    }

    if (totalWinningAmount > 0) {
      user.balance += totalWinningAmount;
      saveUsers(users);

      const embed = new EmbedBuilder()
        .setTitle('🎉 ยินดีด้วย! คุณถูกรางวัลสลากกินแบ่ง')
        .setColor('Gold')
        .setDescription(details.join('\n'))
        .addFields({ name: '💰 ยอดเงินรางวัลรวม', value: `${totalWinningAmount.toLocaleString()} บาท` })
        .setFooter({ text: 'ระบบได้โอนเงินเข้าบัญชีของคุณเรียบร้อยแล้ว' });

      await interaction.editReply({ embeds: [embed] });
      
      // Log
      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(interaction.client, '💰 ประกาศ: มีสมาชิกถูกสลากกินแบ่งรัฐบาล!', `**ผู้ถูกรางวัล:** <@${interaction.user.id}>\n**ยอดเงินรวม:** ${totalWinningAmount.toLocaleString()} บาท\n${details.join('\n')}`, 'Gold', true);

    } else {
      await interaction.editReply('😢 เสียใจด้วยครับ สลากที่คุณซื้อมาในงวดที่ผ่านมาไม่ถูกรางวัลใดเลย... พยายามใหม่ในงวดหน้านะ!');
    }
  }
};
