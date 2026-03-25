const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const marketPath = path.join(__dirname, '..', 'data', 'market.json');
const shopPath = path.join(__dirname, '..', 'data', 'shop.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('📋 ดูรายการหน้าตู้คอนเทนเนอร์ตลาดมืด (รายการสินค้าจากผู้เล่นอื่น)'),

  async execute(interaction) {
    const market = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
    const shopItems = JSON.parse(fs.readFileSync(shopPath, 'utf8'));

    const embed = new EmbedBuilder()
      .setTitle('📦 รายการสินค้าในตลาดมืดเมืองไทย')
      .setColor('DarkGrey')
      .setTimestamp();

    if (market.length === 0) {
      embed.setDescription('💨 ขณะนี้ยังไม่มีใครนำไอเทมมาตั้งขายในตลาดเลย!');
    } else {
      market.forEach((listing, index) => {
        const itemInfo = shopItems.find(i => i.id === listing.itemId);
        const itemName = itemInfo ? itemInfo.name : listing.itemId;
        embed.addFields({ 
          name: `${index + 1}. **${itemName}** (รหัสสั่งซื้อ: \`${listing.id}\`)`, 
          value: `👤 **ผู้ประกาศขาย:** <@${listing.sellerId}>\n💰 **ราคา:** ${listing.price.toLocaleString()} บาท\n🛒 ใช้ \`/buymarket [รหัส]\` เพื่อซื้อ`, 
          inline: false 
        });
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
