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
      await interaction.deferReply().catch(() => {});
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
        .setTitle('📜 ประกาศผลรางวัลสลากกินแบ่งรัฐบาล')
        .setAuthor({ name: 'กองสลากกินแบ่งรัฐบาล | กระทรวงการคลัง' })
        .setDescription(`**งวดประจำวันที่ ${drawDate}**\n*ผลการออกรางวัลอย่างเป็นทางการ*`)
        .setColor('Gold')
        .setThumbnail('https://media.discordapp.net/attachments/1113063853315842100/1152912423854284850/banner.png')
        .setTimestamp();

      // Top Prizes first
      const sortedPrizes = Object.entries(results).sort((a, b) => {
          if (a[0].includes('ที่ 1')) return -1;
          if (b[0].includes('ที่ 1')) return 1;
          return 0;
      });

      for (const [award, nums] of sortedPrizes) {
        embed.addFields({ name: `📌 ${award}`, value: `**[ ${nums.join(' ]   [ ')} ]**`, inline: false });
      }

      embed.setFooter({ text: 'คณะรัฐมนตรีได้อนุมัติเอกสารการออกรางวัลนี้แล้ว' });

      await interaction.editReply({ content: '✅ ประกาศผลรางวัลและแจ้งคณะรัฐมนตรีเรียบร้อยแล้ว!', embeds: [embed] }).catch(() => {});

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
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
      const amount = parseInt(interaction.customId.split('_')[2]);
      const rawNumbers = interaction.fields.getTextInputValue('lotto_numbers');
      
      // ล้างข้อมูลเลข: เอาเฉพาะตัวเลขทั้งหมดมาต่อกันแล้วแบ่งเป็นชุดละ 4 ตัว
      const allDigits = rawNumbers.replace(/\D/g, '');
      const numbers = [];
      for (let i = 0; i < allDigits.length; i += 4) {
        const chunk = allDigits.substring(i, i + 4);
        if (chunk.length === 4) {
          numbers.push(chunk);
        }
      }

      if (numbers.length < amount) {
        return interaction.editReply({ 
          content: `❌ คุณระบุเลขไม่ครบตามจำนวนใบที่เลือก (${amount} ใบ)! คุณกรอกมาทั้งหมด ${allDigits.length} หลัก (ต้องการ ${amount * 4} หลัก)\nกรุณาลองใหม่อีกครั้ง โดยพิมพ์เลขต่อกัน 4 หลักสำหรับแต่ละใบ เช่น \`1234 5678\``
        }).catch(() => {});
      }

      // ตัดเอาเฉพาะเท่าที่ซื้อ
      const finalNumbers = numbers.slice(0, amount);
      const totalCost = amount * 80;
      const nextDraw = getNextDrawDate().format('YYYY-MM-DD');

      const { user } = getUser(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle('🛒 สรุปรายการซื้อสลากกินแบ่ง')
        .setColor('Blue')
        .addFields(
          { name: '📅 งวดประจำวันที่', value: `\`${nextDraw}\``, inline: true },
          { name: '🎫 จำนวนสลาก', value: `\`${amount} ใบ\``, inline: true },
          { name: '💰 รวมยอดชำระ', value: `\`${totalCost.toLocaleString()} บาท\``, inline: true },
          { name: '🔢 เลขที่เลือก', value: `**${finalNumbers.join(', ')}**` },
          { name: '📉 ยอดเสียรวมทั้งหมด', value: `\`${(user.lottoSpent || 0).toLocaleString()} บาท\``, inline: true }
        )
        .setFooter({ text: 'กรุณากดปุ่มยืนยันเพื่อชำระเงิน | ระบบสลากกินแบ่งรัฐบาล' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`lotto_confirm_${amount}_${finalNumbers.join('-')}`)
          .setLabel('ยืนยันชำระเงิน')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('lotto_cancel')
          .setLabel('ยกเลิก')
          .setEmoji('✖️')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
      return true;
    }

    // === Button: ยืนยันการชำระเงิน ===
    if (interaction.isButton() && interaction.customId.startsWith('lotto_confirm_')) {
      await interaction.deferUpdate().catch(() => {}); // ป้องกัน Timeout
      const parts = interaction.customId.split('_');
      const amount = parseInt(parts[2]);
      const numbers = parts[3].split('-');
      const totalCost = amount * 80;

      const { users, user } = getUser(interaction.user.id);
      if (user.balance < totalCost) {
        return interaction.editReply({ content: '❌ ยอดเงินของคุณไม่เพียงพอแล้ว!', embeds: [], components: [] }).catch(() => {});
      }

      const nextDraw = getNextDrawDate().format('YYYY-MM-DD');

      // หักเงิน (บันทึกลง RAM และไฟล์เครื่อง)
      user.balance -= totalCost;
      user.lottoSpent = (user.lottoSpent || 0) + totalCost;
      user.lottoLimit = (user.lottoLimit !== undefined ? user.lottoLimit : 10) - amount;
      saveUsers(users);
      
      // === ตอบกลับผู้ใช้ทันทีเพื่อความเร็ว ===
      await interaction.editReply({ 
        content: `✅ ชำระเงินสำเร็จ! คุณซื้อสลากจำนวน ${amount} ใบ เรียบร้อยแล้ว\nตรวจสอบเลขของคุณได้ในงวดวันที่ **${nextDraw}**\n\n📈 งวดนี้คุณยังสามารถซื้อได้อีก **${user.lottoLimit}** ใบ!`, 
        embeds: [], 
        components: [] 
      }).catch(() => {});

      // === ทำงานเบื้องหลัง (Background Tasks) ===
      (async () => {
        try {
          // 1. บันทึกตั๋วลง MongoDB
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState === 1) {
            const ticket = new LottoTicket({
              userId: interaction.user.id,
              drawDate: nextDraw,
              numbers: numbers
            });
            await ticket.save();
          }

          // 2. Sync to Google Sheets
          await syncLottoToSheet('purchases', {
            userId: interaction.user.id,
            username: interaction.user.tag,
            numbers: numbers
          });

          // 3. Log
          const { sendEconomyLog } = require('../utils/logger');
          await sendEconomyLog(client, '🎫 ซื้อสลากกินแบ่งรัฐบาล', `**ผู้ซื้อ:** <@${interaction.user.id}>\n**จำนวน:** ${amount} ใบ\n**เลขสลาก:** ${numbers.join(', ')}\n**ยอดเงิน:** ${totalCost.toLocaleString()} บาท\n**ยอดเสียสะสม:** ${user.lottoSpent.toLocaleString()} บาท`, 'Gold', false);
        } catch (bgErr) {
          console.error('⚠️ Background Task Error (Lotto):', bgErr.message);
        }
      })();

      return true;
    }

    if (interaction.isButton() && interaction.customId === 'lotto_cancel') {
      await interaction.deferUpdate().catch(() => {});
      await interaction.editReply({ content: '🚫 ยกเลิกรายการซื้อสลากเรียบร้อยแล้ว', embeds: [], components: [] }).catch(() => {});
      return true;
    }

    return false;
  } catch (err) {
    console.error('Lotto Interaction Error:', err);
    return false;
  }
};
