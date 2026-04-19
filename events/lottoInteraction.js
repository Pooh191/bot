const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags 
} = require('discord.js');
const { getNextDrawDate } = require('../utils/lottoUtils');
const { getUser, saveUsers } = require('../utils/economyUtils');
const LottoTicket = require('../models/LottoTicket');
const LottoDraw = require('../models/LottoDraw');
const { syncLottoToSheet } = require('../utils/googleSheets');
const moment = require('moment-timezone');
const { REWARDS } = require('../utils/lottoUtils');

module.exports = async (interaction, client) => {
  try {
    // === Modal Submit: ประกาศผลรางวัล (Admin) ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('lotto_draw_modal_')) {
      const drawDate = interaction.customId.replace('lotto_draw_modal_', '');
      const rawResults = interaction.fields.getTextInputValue('draw_results');

      const results = {};
      const lines = rawResults.split('\n');
      lines.forEach(line => {
        const [prizeName, numsStr] = line.split(':');
        if (prizeName && numsStr) {
          const name = prizeName.trim();
          const nums = numsStr.split(/[\s,]+/).map(n => n.trim()).filter(n => n.length > 0);
          results[name] = nums;
        }
      });

      // Save results
      const draw = await LottoDraw.findOneAndUpdate(
        { drawDate },
        { results, announced: true, announcedBy: interaction.user.id },
        { upsert: true, new: true }
      );

      // Sync to Sheet
      await syncLottoToSheet('results', { drawDate, results });

      const embed = new EmbedBuilder()
        .setTitle(`📢 ประกาศผลรางวัลสลากกินแบ่งรัฐบาล งวดวันที่ ${drawDate}`)
        .setColor('Gold')
        .setTimestamp();

      for (const [award, nums] of Object.entries(results)) {
        embed.addFields({ name: award, value: `\`${nums.join('`, `')}\``, inline: true });
      }

      await interaction.reply({ content: '✅ ประกาศผลรางวัลเรียบร้อยแล้ว!', embeds: [embed] });

      // Notify and potentially issue official document?
      // User said: "ให้คณะรัฐมนตรีออกเป็นเอกสารการออกรางวัลทั้งหมด"
      // We can send to a specific channel.
      const notifyChannelId = process.env.LOTTO_ANNOUNCE_CHANNEL_ID;
      const channel = client.channels.cache.get(notifyChannelId);
      if (channel) {
        await channel.send({ content: '@everyone', embeds: [embed] });
      }

      return true;
    }    // === Modal Submit: ระบุเลขสลาก ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('lotto_modal_')) {
      const amount = parseInt(interaction.customId.split('_')[2]);
      const rawNumbers = interaction.fields.getTextInputValue('lotto_numbers');
      
      // ล้างข้อมูลเลข (แยกด้วยเว้นวรรค, คอมม่า, หรือเอนเทอร์)
      const numbers = rawNumbers.split(/[\s,\n]+/).filter(n => n.length === 4 && /^\d+$/.test(n));

      if (numbers.length !== amount) {
        return interaction.reply({ 
          content: `❌ คุณระบุเลขไม่ครบตามจำนวนใบที่เลือก (${amount} ใบ) หรือเลขไม่เป็น 4 หลัก! กรุณาลองใหม่อีกครั้ง`, 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      const totalCost = amount * 80;
      const nextDraw = getNextDrawDate().format('YYYY-MM-DD');

      const embed = new EmbedBuilder()
        .setTitle('🛒 สรุปรายการซื้อสลากกินแบ่ง')
        .setColor('Blue')
        .addFields(
          { name: '📅 งวดประจำวันที่', value: nextDraw, inline: true },
          { name: '🎫 จำนวนสลาก', value: `${amount} ใบ`, inline: true },
          { name: '💰 รวมยอดชำระ', value: `${totalCost.toLocaleString()} บาท`, inline: true },
          { name: '🔢 เลขที่เลือก', value: `\`${numbers.join('`, `')}\`` }
        )
        .setFooter({ text: 'กรุณากดปุ่มยืนยันเพื่อชำระเงิน' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`lotto_confirm_${amount}_${numbers.join('-')}`)
          .setLabel('ยืนยันชำระเงิน')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('lotto_cancel')
          .setLabel('ยกเลิก')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
      return true;
    }

    // === Button: ยืนยันการชำระเงิน ===
    if (interaction.isButton() && interaction.customId.startsWith('lotto_confirm_')) {
      const parts = interaction.customId.split('_');
      const amount = parseInt(parts[2]);
      const numbers = parts[3].split('-');
      const totalCost = amount * 80;

      const { users, user } = getUser(interaction.user.id);
      if (user.balance < totalCost) {
        return interaction.update({ content: '❌ ยอดเงินของคุณไม่เพียงพอแล้ว!', embeds: [], components: [] });
      }

      const nextDraw = getNextDrawDate().format('YYYY-MM-DD');

      // หักเงิน
      user.balance -= totalCost;
      saveUsers(users);

      // บันทึกตั๋ว
      const ticket = new LottoTicket({
        userId: interaction.user.id,
        drawDate: nextDraw,
        numbers: numbers
      });
      await ticket.save();

      // Sync to Google Sheets
      await syncLottoToSheet('purchases', {
        userId: interaction.user.id,
        username: interaction.user.tag,
        numbers: numbers
      });

      await interaction.update({ 
        content: `✅ ชำระเงินสำเร็จ! คุณซื้อสลากจำนวน ${amount} ใบ เรียบร้อยแล้ว\nตรวจสอบเลขของคุณได้ในงวดวันที่ **${nextDraw}**`, 
        embeds: [], 
        components: [] 
      });
      
      // Log
      const { sendEconomyLog } = require('../utils/logger');
      await sendEconomyLog(client, '🎫 ซื้อสลากกินแบ่งรัฐบาล', `**ผู้ซื้อ:** <@${interaction.user.id}>\n**จำนวน:** ${amount} ใบ\n**เลขสลาก:** ${numbers.join(', ')}\n**ยอดเงิน:** ${totalCost.toLocaleString()} บาท`, 'Gold', false);

      return true;
    }

    if (interaction.isButton() && interaction.customId === 'lotto_cancel') {
      await interaction.update({ content: '🚫 ยกเลิกรายการซื้อสลากเรียบร้อยแล้ว', embeds: [], components: [] });
      return true;
    }

    return false;
  } catch (err) {
    console.error('Lotto Interaction Error:', err);
    return false;
  }
};
