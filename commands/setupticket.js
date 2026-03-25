const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const TICKET_CONFIG_FILE = path.join(__dirname, '..', 'data', 'ticket_config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupticket')
    .setDescription('🎫 (Admin) ตั้งค่าระบบส่งทิคเก็ตติดต่อแอดมิน')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('ห้องที่ต้องการให้ปุ่มเปิดทิคเก็ตอยู่')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('category')
        .setDescription('หมวดหมู่ (Category) ที่ต้องการให้สร้างห้องทิคเก็ตเอาไว้ภายใน')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('admin_role')
        .setDescription('ยศ (Role) ของแอดมินหรือเจ้าหน้าที่ที่จะมองเห็นห้องทิคเก็ตได้')
        .setRequired(true)),
        
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '⚠️ เฉพาะผู้ดูแลระบบเท่านั้น!', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const category = interaction.options.getChannel('category');
    const adminRole = interaction.options.getRole('admin_role');

    // บันทึกการตั้งค่า
    const config = {
      categoryId: category.id,
      adminRoleId: adminRole.id
    };
    fs.writeFileSync(TICKET_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

    // สร้างกล่องข้อความที่มีปุ่มให้เปิดทิคเก็ต
    const embed = new EmbedBuilder()
      .setTitle('🎫 ศูนย์ช่วยเหลือ และติดต่อเจ้าหน้าที่')
      .setDescription('หากคุณพบบัคในตัวเกม หรือต้องการร้องเรียน / สอบถามปัญหาต่างๆ\n\nโปรดกดปุ่ม **"เปิดทิคเก็ต (Open Ticket)"** ด้านล่าง\nเพื่อสร้างห้องสนทนาส่วนตัวกับทีมงานครับ')
      .setColor('#2F3136')
      .setImage('https://media.discordapp.net/attachments/1113063853315842100/1152912423854284850/banner.png') // ใส่แบนเนอร์หรือรูปสวยๆ หรือปล่อยว่างก็ได้
      .setFooter({ text: 'ระบบ Ticket เปิดให้บริการตลอด 24 ชั่วโมง' });

    const btn = new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('เปิดทิคเก็ต (Open Ticket)')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Success);
      
    const row = new ActionRowBuilder().addComponents(btn);

    await channel.send({ embeds: [embed], components: [row] });
    
    // Log setup
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      '🛠️ ตั้งค่าระบบ Ticket', 
      `**แอดมิน:** <@${interaction.user.id}>\n**ห้อง:** <#${channel.id}>\n**หมวดหมู่:** <#${category.id}>\n**ยศควบคุม:** <@&${adminRole.id}>`, 
      'Blue', 
      false
    );

    return interaction.reply({ content: `✅ ตั้งค่าระบบ Ticket เสร็จสิ้น!\nส่งปุ่มไปที่ห้อง ${channel} เรียบร้อยแล้ว`, ephemeral: true });
  }
};
