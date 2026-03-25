const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser, saveUsers } = require('../utils/economyUtils');

const marketPath = path.join(__dirname, '..', 'data', 'market.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buymarket')
    .setDescription('🛒 ซื้อไอเทมจากผู้เล่นอื่นในตลาดมืด (Market)')
    .addStringOption(option => 
      option.setName('listing_id')
        .setDescription('ระบุรหัสสั่งซื้อของไอเทมที่ต้องการจะซื้อ')
        .setRequired(true)),

  async execute(interaction) {
    const buyUserId = interaction.user.id;
    const { users, user: buyer } = getUser(buyUserId);
    const listingId = interaction.options.getString('listing_id');

    const market = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
    const listingIndex = market.findIndex(l => l.id === listingId);

    if (listingIndex === -1) {
      return interaction.reply({ content: '❌ ไม่พบข้อมูลรายการสินค้านี้ในตลาดครับ กกรุณาตรวจสอบรหัสให้อีกครั้ง', ephemeral: true });
    }

    const listing = market[listingIndex];

    if (listing.sellerId === buyUserId) {
      return interaction.reply({ content: '❌ คุณไม่สามารถซื้อไอเทมของตัวเองได้ครับ!', ephemeral: true });
    }

    if (buyer.balance < listing.price) {
      return interaction.reply({ 
        content: `❌ เงินของคุณไม่พอครับ! คุณต้องมีเงินอย่างน้อย **${listing.price.toLocaleString()} บาท**`, 
        ephemeral: true 
      });
    }

    // Process transaction
    const { user: seller } = getUser(listing.sellerId);
    
    buyer.balance -= listing.price;
    seller.balance += listing.price;
    
    // Add item to buyer's inventory
    if (!buyer.inventory) buyer.inventory = [];
    buyer.inventory.push(listing.itemId);

    // Save users
    saveUsers(users);

    // Remove from market
    market.splice(listingIndex, 1);
    fs.writeFileSync(marketPath, JSON.stringify(market, null, 2));

    await interaction.reply({ 
      content: `🛒 คุณได้ซื้อ **${listing.itemId}** จาก <@${listing.sellerId}> ในราคา **${listing.price.toLocaleString()} บาท** เรียบร้อยแล้ว!` 
    });

    // Log the transaction
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      'ธุรกรรมตลาดมืด (Market Purchase)',
      `**ผู้ซื้อ:** <@${buyUserId}>\n**ผู้ขาย:** <@${listing.sellerId}>\n**ไอเทม:** ${listing.itemId}\n**ราคา:** ${listing.price.toLocaleString()} บาท`,
      'Yellow',
      true
    );
  }
};
