const { EmbedBuilder } = require('discord.js');
const { getCache, setCacheAndSave } = require('./mongoManager');

/**
 * ส่ง Log ไปยังห้องที่กำหนดใน Discord และบันทึกลงไฟล์
 */
async function sendEconomyLog(client, title, description, color = 'Blue', isPublic = false, content = null) {
  try {
    // 1. บันทึกลง MongoDB (และ Cache)
    let logs = getCache('history_logs') || [];

    const logEntry = {
      timestamp: Date.now(),
      title,
      description: description.replace(/\n/g, ' | ').substring(0, 500), 
      isPublic
    };

    logs.unshift(logEntry);
    if (logs.length > 500) logs.length = 500;
    setCacheAndSave('history_logs', logs, true);

    // 2. ส่งไปยังห้อง Discord ประจำการ (Real-time)
    const displayDescription = description.length > 4000 
      ? description.substring(0, 4000) + '... (truncated)' 
      : description;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(displayDescription)
      .setColor(color)
      .setTimestamp();

    // ส่งเข้าห้อง Admin Log (ส่งทุกอย่าง)
    const adminLogId = process.env.ADMIN_LOG_CHANNEL;
    if (adminLogId) {
      const channel = await client.channels.fetch(adminLogId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send({ content: content, embeds: [embed] }).catch(() => {});
      }
    }

    // ส่งเข้าห้อง Public Log (ส่งเฉพาะรายการสาธารณะ)
    if (isPublic) {
      const publicLogId = process.env.PUBLIC_LOG_CHANNEL;
      if (publicLogId) {
        const channel = await client.channels.fetch(publicLogId).catch(() => null);
        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }

  } catch (e) {
    console.error('Failed to send economy log:', e);
  }
}

module.exports = { sendEconomyLog };
