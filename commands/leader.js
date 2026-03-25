// commands/leader.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { loadUsers } = require('../utils/economyUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leader')
        .setDescription('แสดงอันดับเงินในเซิร์ฟเวอร์ (หน้าเรียกดูได้)'),
  async execute(interaction) {
    const users = loadUsers();
    
    // กรองเอาเฉพาะคนที่มีตัวตนอยู่ในเซิร์ฟเวอร์ และไม่ใช่ 'undefined'
    const sorted = Object.entries(users)
      .filter(([id, u]) => {
        if (id === 'undefined') return false;
        if (!u || typeof u.balance !== 'number') return false;
        // เช็คว่ายังอยู่ในเซิร์ฟเวอร์ไหม (ใช้ cache)
        return interaction.guild.members.cache.has(id);
      })
      .sort((a, b) => {
        const totalA = (a[1].balance || 0) + (a[1].bank || 0);
        const totalB = (b[1].balance || 0) + (b[1].bank || 0);
        return totalB - totalA;
      });

    if (sorted.length === 0) {
      return interaction.reply('❌ ยังไม่มีข้อมูลผู้ใช้ในระบบ หรือยังไม่มีคนรวยในที่นี้');
    }

    const pageSize = 10;
    const totalPages = Math.ceil(sorted.length / pageSize);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * pageSize;
      const chunk = sorted.slice(start, start + pageSize);
      const fields = chunk.map(([id, u], i) => {
        const rank = start + i + 1;
        const totalBal = (u.balance || 0) + (u.bank || 0);
        return { name: `#${rank}`, value: `<@${id}> — 💰 **${totalBal.toLocaleString()}** บาท`, inline: false };
      });
      
      const totalBalance = sorted.reduce((sum, [, u]) => sum + (u.balance || 0) + (u.bank || 0), 0).toLocaleString();

      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 ทำเนียบคนรวย (Leaderboard)')
        .setDescription(`หน้า ${page + 1}/${totalPages}`)
        .addFields(fields)
        .addFields({ name: '💰 ยอดรวมทั้งเซิร์ฟเวอร์', value: `**${totalBalance} บาท (THB)**` })
        .setFooter({ text: 'ข้อมูลสรุปจากฐานข้อมูลประชากรไทย' })
        .setTimestamp();
    };

        const row = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀️ ย้อนกลับ')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('▶️ ถัดไป')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1)
        );

        const message = await interaction.reply({ embeds: [generateEmbed(0)], components: [row(0)], fetchReply: true });

        const collector = message.createMessageComponentCollector({
            filter: i => ['prev', 'next'].includes(i.customId) && i.user.id === interaction.user.id,
            time: 120_000
        });

        collector.on('collect', async i => {
            currentPage += i.customId === 'next' ? 1 : -1;
            await i.update({ embeds: [generateEmbed(currentPage)], components: [row(currentPage)] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ ย้อนกลับ').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('▶️ ถัดไป').setStyle(ButtonStyle.Primary).setDisabled(true)
            );
            message.edit({ components: [disabledRow] });
        });
    }
};
