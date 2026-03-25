const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { loadUsers, calculateTax } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testtax')
    .setDescription('🔍 ทดสอบจำลองการเข้าเก็บภาษี (Admin เท่านั้น) - ไม่มีการหักเงินจริง')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const users = loadUsers();
      let totalTaxCollected = 0;
      let taxpayersCount = 0;
      let detailLog = "";

      // เรียงลำดับคนรวยสุดขึ้นก่อนใน Log รายละเอียด
      const sortedUsers = Object.entries(users)
        .filter(([id]) => id !== 'undefined')
        .sort((a, b) => {
          const totalA = (a[1].balance || 0) + (a[1].bank || 0);
          const totalB = (b[1].balance || 0) + (b[1].bank || 0);
          return totalB - totalA;
        });

      for (const [userId, user] of sortedUsers) {
        const totalWealth = (user.balance || 0) + (user.bank || 0);
        const { tax, rate } = calculateTax(totalWealth);

        if (tax > 0) {
          totalTaxCollected += tax;
          taxpayersCount++;
          detailLog += `• <@${userId}>: **${tax.toLocaleString()}** บาท (อัตรา ${rate}%)\n`;
        }
      }

      // สร้าง Embed สรุปภาพรวม
      const summaryEmbed = new EmbedBuilder()
        .setTitle('🧪 ผลการจำลองการหักภาษี (Dry Run)')
        .setColor('Yellow')
        .setDescription(`หากระบบทำงานจริงในวันที่ 1 จะมีสมาชิกที่ต้องชำระภาษีทั้งหมด **${taxpayersCount}** ราย`)
        .addFields(
          { name: '💰 ยอดภาษีคาดการณ์รวม:', value: `**${totalTaxCollected.toLocaleString()}** บาท (THB)`, inline: false },
          { name: '📊 จำนวนประชากรในระบบ:', value: `${Object.keys(users).length} ราย`, inline: true },
          { name: '📅 กำหนดรันจริง:', value: 'ทุกวันที่ 1 ของเดือน', inline: true }
        )
        .setFooter({ text: 'หมายเหตุ: นี่เป็นเพียงการจำลองเท่านั้น ไม่มีการหักเงินจริงและไม่มีการส่ง DM หาผู้เล่น' })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });

      // ส่งรายงานละเอียดเข้าห้อง Log เพื่อให้แอดมินดู
      if (detailLog) {
        const taxChunks = detailLog.match(/[\s\S]{1,3000}/g) || [];
        for (const chunk of taxChunks) {
          await sendEconomyLog(interaction.client, '📜 รายละเอียดสถิติภาษีคาดการณ์ (Simulation)', chunk, 'Grey', false);
        }
        await interaction.followUp({ content: '✅ ส่งรายละเอียดการจำลองเข้าห้อง Log เรียบร้อยแล้วครับ!', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'ℹ️ ไม่พบผู้ที่มีเกณฑ์ต้องเสียภาษีในวินาทีนี้ครับ', ephemeral: true });
      }

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลภาษี' });
    }
  }
};
