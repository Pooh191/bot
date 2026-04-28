const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getCache, setCacheAndSave } = require('../utils/mongoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetticket')
    .setDescription('🎫 (Admin) รีเซ็ตระบบ Ticket และเลือกลบห้องพูดคุยที่ค้างอยู่ได้')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(option => 
      option.setName('delete_channels')
        .setDescription('ต้องการสั่งลบห้องทิคเก็ตทุกห้องที่กำลังเปิดใช้งานอยู่ด้วยหรือไม่?')
        .setRequired(false)),
        
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '⚠️ เฉพาะผู้ดูแลระบบเท่านั้น!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let message = '✅ ปิดการใช้งานระบบ Ticket และลบข้อมูลการตั้งค่าเรียบร้อยแล้ว (ปุ่มเปิดทิคเก็ตเก่าในห้องแชทจะใช้งานไม่ได้อีกต่อไป จนกว่าจะพิมพ์ /setupticket ใหม่)';

    const deleteChannels = interaction.options.getBoolean('delete_channels');
    let deletedCount = 0;

    const config = getCache('ticket_config');
    const hasConfig = config && Object.keys(config).length > 0;

    // ถ้ากดเลือกลบช่องที่ค้างอยู่ด้วย
    if (deleteChannels) {
        if (hasConfig) {
            try {
                const categoryIds = [config.adminCategoryId, config.govCategoryId, config.parlCategoryId, config.categoryId].filter(id => id);
                
                if (categoryIds.length > 0) {
                    // กวาดหาห้องที่มีชื่อขึ้นต้นว่า gov-, admin-, parl- หรือ ticket- และอยู่ใน category ที่ตั้งไว้
                    const categoryChannels = interaction.guild.channels.cache.filter(c => 
                        categoryIds.includes(c.parentId) && 
                        (c.name.startsWith('gov-') || c.name.startsWith('admin-') || c.name.startsWith('parl-') || c.name.startsWith('ticket-'))
                    );
                    for (const [, channel] of categoryChannels) {
                        try {
                            await channel.delete('Admin requested to reset ticket system');
                            deletedCount++;
                        } catch (err) {
                            console.error(`Cannot delete channel ${channel.name}`, err);
                        }
                    }
                }
                message += `\n\n🗑️ **นอกจากนี้ยังได้เคลียร์ห้องทิคเก็ตเก่าทิ้งทั้งหมด:** จำนวน ${deletedCount} ห้อง`;
            } catch (err) {
                console.error('Error parsing config for resetting tickets:', err);
                message += '\n⚠️ มีข้อผิดพลาดในการโหลดหมวดหมู่ทิคเก็ต กรุณาลบห้องเอง';
            }
        } else {
            message += '\n⚠️ ไม่มีประวัติการตั้งค่า Ticket มาก่อน จึงไม่ได้ลบห้องใดๆ';
        }
    }

    // ลบข้อมูล Config ทิ้ง
    if (hasConfig) {
      try {
        setCacheAndSave('ticket_config', {});
      } catch (e) {
        console.error('Failed to clear ticket config:', e);
      }
    }
    
    // แจ้งเตือนลง Log ห้องแอดมิน
    const { sendEconomyLog } = require('../utils/logger');
    try {
        await sendEconomyLog(
          interaction.client, 
          '🛠️ รีเซ็ตระบบ Ticket', 
          `**แอดมินผู้สั่ง:** <@${interaction.user.id}>\n**การกระทำ:** รีเซ็ตระบบ Ticket และปิดการใช้งาน${deleteChannels ? `\n**ลบห้องคงค้างทิ้ง:** ${deletedCount} ห้อง` : ''}`, 
          'Red', 
          false
        );
    } catch(e) { /* ignore logger error if any */ }

    return interaction.editReply({ content: message });
  }
};
