const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('ตั้งค่าการทำงานทั้งหมดของบอทในคำสั่งเดียว (ตั้งค่าได้ตลอดเวลา)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => 
      opt.setName('notify_channel')
         .setDescription('ห้องสำหรับแจ้งเตือนให้ยศชาวเมือง')
         .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(opt => 
      opt.setName('prepared_voice')
         .setDescription('ห้องสร้างเสียง (ผู้ใช้เข้าห้องนี้เพื่อสร้างห้องส่วนตัว)')
         .addChannelTypes(ChannelType.GuildVoice)
    )
    .addChannelOption(opt => 
      opt.setName('voice_category')
         .setDescription('หมวดหมู่ (Category) ที่ต้องการให้บอทสร้างห้องเสียง')
         .addChannelTypes(ChannelType.GuildCategory)
    )
    .addChannelOption(opt => 
      opt.setName('citizen_request')
         .setDescription('ห้องขอยื่นสัญชาติ (ถ้ามี)')
         .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(opt => 
      opt.setName('citizen_admin')
         .setDescription('ห้องที่แอดมินใช้อนุมัติสัญชาติ (ยศแอดมินเท่านั้นที่เห็น)')
         .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(opt => 
      opt.setName('admin_log')
         .setDescription('ห้อง Log ลับสำหรับ Admin (ส่งข้อความแจ้งเตือนเรียลไทม์)')
         .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(opt => 
      opt.setName('public_log')
         .setDescription('ห้อง Log สาธารณะสำหรับประชาชน (ส่งข้อความแจ้งเตือนเรียลไทม์)')
         .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Capture mappings from options
    const updates = {};
    const notify_channel = interaction.options.getChannel('notify_channel');
    if (notify_channel) updates['NOTIFY_CHANNEL_ID'] = notify_channel.id;

    const prepared_voice = interaction.options.getChannel('prepared_voice');
    if (prepared_voice) updates['PREPARED_VOICE_ID'] = prepared_voice.id;

    const voice_category = interaction.options.getChannel('voice_category');
    if (voice_category) updates['VOICE_CATEGORY_ID'] = voice_category.id;

    const citizen_request = interaction.options.getChannel('citizen_request');
    if (citizen_request) updates['CITIZEN_REQUEST_CHANNEL'] = citizen_request.id;

    const citizen_admin = interaction.options.getChannel('citizen_admin');
    if (citizen_admin) updates['CITIZEN_ADMIN_CHANNEL'] = citizen_admin.id;

    const admin_log = interaction.options.getChannel('admin_log');
    if (admin_log) updates['ADMIN_LOG_CHANNEL'] = admin_log.id;

    if (updates['ECONOMY_LOG_CHANNEL']) {
        // delete old one if present in the update map from earlier modifications but here we redefine
    }

    const public_log = interaction.options.getChannel('public_log');
    if (public_log) updates['PUBLIC_LOG_CHANNEL'] = public_log.id;

    if (Object.keys(updates).length === 0) {
        return interaction.editReply({ content: '⚠️ คุณไม่ได้เลือกตั้งค่าใดๆ เลย แนะนำให้ลองเลือกอย่างน้อย 1 อย่างครับ' });
    }

    // Update variables both in in-memory environment, and save to file (.env)
    for (const [key, val] of Object.entries(updates)) {
        // Update in-memory so features change immediately
        process.env[key] = val;

        // Update in content string
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
            // Append if not exist
            envContent += `\n${key}=${val}`;
        }
    }

    // Write file back
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    // Build responsive message
    let msg = '✅ **ตั้งค่าระบบบอทให้ใหม่เรียบร้อยแล้ว (อัปเดตทันที)!**\n';
    if (updates['NOTIFY_CHANNEL_ID']) msg += `- แจ้งเตือนยศถูกเปลี่ยนเป็น <#${updates['NOTIFY_CHANNEL_ID']}>\n`;
    if (updates['PREPARED_VOICE_ID']) msg += `- ห้องคลุมดำเสียงถูกเปลี่ยนเป็น <#${updates['PREPARED_VOICE_ID']}>\n`;
    if (updates['VOICE_CATEGORY_ID']) msg += `- หมวดหมู่สร้างห้องเสียงเป็น **ID: ${updates['VOICE_CATEGORY_ID']}**\n`;
    if (updates['CITIZEN_REQUEST_CHANNEL']) msg += `- ห้องยื่นสัญชาติถูกเปลี่ยนเป็น <#${updates['CITIZEN_REQUEST_CHANNEL']}>\n`;
    if (updates['CITIZEN_ADMIN_CHANNEL']) msg += `- ห้องอนุมัติสัญชาติเปลี่ยนเป็น <#${updates['CITIZEN_ADMIN_CHANNEL']}>\n`;
    if (updates['ADMIN_LOG_CHANNEL']) msg += `- ห้อง Log ของแอดมิน เปลี่ยนเป็น <#${updates['ADMIN_LOG_CHANNEL']}>\n`;
    if (updates['PUBLIC_LOG_CHANNEL']) msg += `- ห้อง Log ประชาชน เปลี่ยนเป็น <#${updates['PUBLIC_LOG_CHANNEL']}>\n`;
    
    msg += '\n*หมายเหตุ: ตั้งค่าเหล่านี้มีผลทันทีไม่ต้องรีสตาร์ทบอท คุณสามารถใช้คำสั่งนี้สลับห้องได้ตลอดเวลา*';

    await interaction.editReply({ content: msg });

    const { sendEconomyLog } = require('../utils/logger');
    await sendEconomyLog(
      interaction.client, 
      '⚙️ ตั้งค่าระบบ (Setup)', 
      `**แอดมิน:** <@${interaction.user.id}>\n**เปลี่ยนการตั้งค่า:** มีการอัปเดตช่องทางและเปิดปิดฟังก์ชันบอทจากหน้าต่างดิสคอร์ด`, 
      'Yellow',
      false // Admin only
    );
  }
};
