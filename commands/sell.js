const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser, saveUsers } = require('../utils/economyUtils');

const marketPath = path.join(__dirname, '..', 'data', 'market.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('🏪 นำไอเทมของคุณไปตั้งขายในตลาดมืด (Market)')
    .addStringOption(option => 
      option.setName('item_id')
        .setDescription('เลือกไอเทมที่จะขาย')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('price')
        .setDescription('ระบุราคาที่ต้องการขาย')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { users, user } = getUser(userId);
    const itemId = interaction.options.getString('item_id');
    const price = interaction.options.getInteger('price');

    if (price <= 0) return interaction.reply({ content: '❌ ราคาต้องมากกว่า 0 ครับ', ephemeral: true });

    const inventory = user.inventory || [];
    const itemIndex = inventory.indexOf(itemId);

    if (itemIndex === -1) {
      return interaction.reply({ content: `❌ คุณไม่มีไอเทม **${itemId}** ในกระเป๋าครับ!`, ephemeral: true });
    }

    // Remove from inventory
    inventory.splice(itemIndex, 1);
    user.inventory = inventory;
    saveUsers(users);

    // List on market
    const market = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
    const listingId = Date.now().toString();
    
    market.push({
      id: listingId,
      sellerId: userId,
      itemId: itemId,
      price: price
    });

    fs.writeFileSync(marketPath, JSON.stringify(market, null, 2));

    await interaction.reply({ 
      content: `🏪 คุณได้นำ **${itemId}** ไปตั้งขายในตลาดแล้วที่ราคา **${price.toLocaleString()} บาท**!` 
    });
  }
};
