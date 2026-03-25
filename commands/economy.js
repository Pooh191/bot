// commands/economy.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadResources, saveResources } = require('../utils/economyUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('ตั้งค่าทรัพยากรของจังหวัด (แอดมินเท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('กำหนดทรัพยากรของจังหวัด')
        .addStringOption(opt =>
          opt.setName('province')
            .setDescription('เลือกจังหวัด')
            .setRequired(true)
            .addChoices(
              { name: 'CMI | เชียงใหม่', value: 'CMI' },
              { name: 'CRI | เชียงราย', value: 'CRI' },
              { name: 'LPN | ลำพูน', value: 'LPN' },
              { name: 'NMA | นครราชสีมา', value: 'NMA' },
              { name: 'KKN | ขอนแก่น', value: 'KKN' },
              { name: 'UDN | อุดรธานี', value: 'UDN' },
              { name: 'BKK | กรุงเทพมหานคร', value: 'BKK' },
              { name: 'AYA | พระนครศรีอยุธยา', value: 'AYA' },
              { name: 'NBI | นนทบุรี', value: 'NBI' },
              { name: 'PKT | ภูเก็ต', value: 'PKT' },
              { name: 'SKA | สงขลา', value: 'SKA' },
              { name: 'SNI | สุราษฎร์ธานี', value: 'SNI' }
              
            )
        )
        .addIntegerOption(opt =>
          opt.setName('แร่')
            .setDescription('คะแนนแร่ (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('หิน')
            .setDescription('คะแนนหิน (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('ดิน')
            .setDescription('คะแนนดิน (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('ต้นไม้')
            .setDescription('คะแนนต้นไม้ (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('น้ำ')
            .setDescription('คะแนนทรัพยากรน้ำ (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('ออกซิเจน')
            .setDescription('คะแนนออกซิเจน (0-100)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('คาร์บอน')
            .setDescription('คะแนนคาร์บอนไดออกไซด์ (0-100)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // subcommand
    const province = interaction.options.getString('province');
    const clamp = name => Math.min(interaction.options.getInteger(name), 100);

    const data = {
      mineral: clamp('แร่'),
      rock: clamp('หิน'),
      soil: clamp('ดิน'),
      tree: clamp('ต้นไม้'),
      water: clamp('น้ำ'),
      oxygen: clamp('ออกซิเจน'),
      co2: clamp('คาร์บอน')
    };

    // ตรวจสอบ O2 + CO2 ไม่เกิน 100
    if (data.oxygen + data.co2 > 100) {
      return interaction.reply({ 
        content: '❌ ค่ารวมออกซิเจนและคาร์บอนไดออกไซด์ต้องไม่เกิน 100', 
        ephemeral: true 
      });
    }

    const resources = loadResources();
    resources[province] = data;
    saveResources(resources);

    await interaction.reply(`✅ ตั้งค่าทรัพยากรจังหวัด **${province}** เรียบร้อยแล้ว`);

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client,
      '💎 ตั้งค่าทรัพยากรจังหวัด (Economy Set)',
      `**แอดมิน:** <@${interaction.user.id}>\n**จังหวัด:** ${province}\n**ทรัพยากรใหม่:** แร่(${data.mineral}), หิน(${data.rock}), ดิน(${data.soil}), ไม้(${data.tree}), น้ำ(${data.water}), O2(${data.oxygen}), CO2(${data.co2})`,
      'Yellow',
      false
    );
  }
};
