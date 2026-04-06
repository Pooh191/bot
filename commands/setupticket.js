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
    .setDescription('🎫 (Admin) ตั้งค่าระบบส่งทิคเก็ตแยกหน่วยงาน รัฐบาล/แอดมิน')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('ห้องที่ต้องการให้ปุ่มเปิดทิคเก็ตอยู่')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('admin_category')
        .setDescription('หมวดหมู่ (Category) สำหรับ Ticket ติดต่อแอดมิน')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('admin_role')
        .setDescription('ยศ (Role) ของแอดมินหรือเจ้าหน้าที่ที่จะมองเห็นห้องทิคเก็ตติดต่อแอดมิน')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('gov_category')
        .setDescription('หมวดหมู่ (Category) สำหรับ Ticket ติดต่อรัฐบาล')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('gov_role')
        .setDescription('ยศ (Role) ของสมาชิกรัฐบาลที่จะมองเห็นห้องทิคเก็ตติดต่อรัฐบาล')
        .setRequired(true)),
        
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '⚠️ เฉพาะผู้ดูแลระบบเท่านั้น!', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const adminCategory = interaction.options.getChannel('admin_category');
    const adminRole = interaction.options.getRole('admin_role');
    const govCategory = interaction.options.getChannel('gov_category');
    const govRole = interaction.options.getRole('gov_role');

    // บันทึกการตั้งค่า
    const config = {
      adminCategoryId: adminCategory.id,
      adminRoleId: adminRole.id,
      govCategoryId: govCategory.id,
      govRoleId: govRole.id
    };
    fs.writeFileSync(TICKET_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

    // สร้างกล่องข้อความที่มีปุ่มให้เลือกประเภททิคเก็ต
    const embed = new EmbedBuilder()
      .setTitle('🎫 ศูนย์ติดต่อสอบถามและช่วยเหลือประชาชน')
      .setDescription('โปรดเลือกหน่วยงานที่ต้องการติดต่อสื่อสาร\n\n🏛️ **ติดต่อรัฐบาล:** เรื่องกิจการบ้านเมือง, ร้องทุกข์ชาวบ้าน, ข้อเสนอนโยบาย, ขอพบรัฐมนตรี\n🛡️ **ติดต่อแอดมิน:** แจ้งบัคระบบ, ร้องเรียนผู้เล่นผิดกฎ, ปัญหาการเติมเงิน/เศรษฐกิจ')
      .setColor('#2F3136')
      .setImage('https://media.discordapp.net/attachments/1113063853315842100/1152912423854284850/banner.png')
      .setFooter({ text: 'ระบบ Ticket แยกหน่วยงาน พร้อมให้บริการตลอด 24 ชั่วโมง' });

    const govBtn = new ButtonBuilder()
      .setCustomId('ticket_create_gov')
      .setLabel('ติดต่อรัฐบาล')
      .setEmoji('🏛️')
      .setStyle(ButtonStyle.Primary);

    const adminBtn = new ButtonBuilder()
      .setCustomId('ticket_create_admin')
      .setLabel('ติดต่อแอดมิน')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Danger);
      
    const row = new ActionRowBuilder().addComponents(govBtn, adminBtn);

    await channel.send({ embeds: [embed], components: [row] });
    
    // Log setup
    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      '🛠️ ตั้งค่าระบบ Ticket (แยกหน่วยงาน)', 
      `**แอดมิน:** <@${interaction.user.id}>\n**ห้อง:** <#${channel.id}>\n**หมวดแอดมิน:** <#${adminCategory.id}>\n**หมวดรัฐบาล:** <#${govCategory.id}>`, 
      'Blue', 
      false
    );

    return interaction.reply({ content: `✅ ตั้งค่าระบบ Ticket แยกหน่วยงานเรียบร้อยแล้ว!\nส่งปุ่มติดต่อไปที่ห้อง ${channel} แล้วครับ`, ephemeral: true });
  }
};
