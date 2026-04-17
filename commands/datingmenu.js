const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('datingmenu')
    .setDescription('💕 สร้างเมนูระบบหาคู่ หาเพื่อน 77 จังหวัด (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#ff479b') // สีชมพู
      .setTitle('💞 |หาเพื่อน | 77 จังหวัด')
      .setImage('https://i.imgur.com/vHItuWn.png') // ใส่รูป Gradient สีชมพูเทา หรือเปลี่ยนได้ตามต้องการ
      .setFooter({ text: `กดปุ่ม "วิธีใช้" เพื่อดูวิธีการใช้งาน • ระบบหาคู่` })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dating_register')
        .setLabel('📝 สมัคร/อัปเดต')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('dating_extra_info')
        .setLabel('✨ ข้อมูลเสริม')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('dating_my_profile')
        .setLabel('👤 โปรไฟล์ของฉัน')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dating_find_near')
        .setLabel('🧭 หาคนใกล้ฉัน')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('dating_find_all')
        .setLabel('🏙️ หาคนในจังหวัด')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('dating_liked_me')
        .setLabel('💟 คนที่ถูกใจฉัน')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('dating_help')
        .setLabel('❓ วิธีใช้')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row1, row2] });
    await interaction.reply({ content: '✅ สร้างหน้าต่างเมนูระบบหาคู่เรียบร้อยครับ', ephemeral: true });
  }
};
