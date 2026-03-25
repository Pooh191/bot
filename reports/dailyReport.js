const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { loadConfig } = require('../utils/economyUtils');

module.exports = (client) => {
  console.log('🕕 ตั้งเวลา Daily Report 08:00 (เวลาไทย)');

  cron.schedule('00 08 * * *', async () => {
    try {
      const config = loadConfig();
      const channelId = config.econChannelId;

      if (!channelId) {
        console.warn('⚠️ ยังไม่ได้ตั้งค่า econChannelId ด้วย /seteconchannel');
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.warn('⚠️ ไม่พบช่องที่ตั้งไว้ใน config');
        return;
      }

      // โหลดข้อมูลผู้ใช้
      const filePath = path.join(__dirname, '../data/users.json');
      let users = {};

      if (fs.existsSync(filePath)) {
        users = JSON.parse(fs.readFileSync(filePath));
      }

      let totalCash = 0;
      let totalBank = 0;

      for (const userId in users) {
        if (users[userId].balance) totalCash += users[userId].balance;
        if (users[userId].bank) totalBank += users[userId].bank;
      }

      const total = totalCash + totalBank;

      const embed = new EmbedBuilder()
        .setColor('#00BFFF') // สีฟ้า
        .setTitle('📊 รายงานเศรษฐกิจประจำวันที่ 08:00')
        .setDescription('ข้อมูลสถิติเศรษฐกิจประจำวันที่ส่งโดยอัตโนมัติ')
        .addFields(
          { name: '💵 เงินสดรวม', value: `${totalCash.toLocaleString()} DL Arlington`, inline: true },
          { name: '🏦 เงินในธนาคารรวม', value: `${totalBank.toLocaleString()} DL Arlington`, inline: true },
          { name: '📈 รวมทั้งหมด', value: `${total.toLocaleString()} DL Arlington`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'กรมสรรพกร กระทรวงเศรษฐกิจและสิ่งแวดล้อม', iconURL: 'https://media.discordapp.net/attachments/1367228675640262707/1367228714475327559/Government_House.png?ex=6813d277&is=681280f7&hm=089260ea16173c79b9c76583d0e3ff3f946c9c61a4d7a3ea52417f373307a319&=&format=webp&quality=lossless&width=960&height=960' }) // ใส่ Footer ถ้าต้องการ
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log('✅ ส่งรายงานเศรษฐกิจแบบ Embed เวลา 08:00 เรียบร้อยแล้ว');

    } catch (err) {
      console.error('❌ ส่งรายงานล้มเหลว:', err);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });
};
