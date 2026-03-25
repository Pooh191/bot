const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('howto')
    .setDescription('📖 ประกาศคู่มือการเริ่มหาเงินลงในช่องแชท (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 คู่มือการเริ่มต้นหาเงิน (THAILAND)')
      .setColor('#FFD700')
      .setDescription('ยินดีต้อนรับสู่ระบบเศรษฐกิจจำลองครับ! นี่คือขั้นตอนการเริ่มต้นหาเงินในเซิร์ฟเวอร์เรา:')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { 
          name: '1️⃣ การหาเงินเบื้องต้น (สายขยัน)', 
          value: '• พิมพ์ `/daily` เพื่อรับเงินขวัญถุงรายวันฟรีๆ\n• พิมพ์ `/work` เพื่อทำงานสุจริตสะสมเงินและค่า XP\n• อยู่ในห้องถอนหายใจ (Voice Channel) เพื่อรับเบี้ยเลี้ยงรายชั่วโมง!', 
          inline: false 
        },
        { 
          name: '2️⃣ ระบบอาชีพ (สายมั่นคง)', 
          value: '• พิมพ์ `/jobs` เพื่อดูรายการอาชีพที่คุณสามารถเป็นได้\n• พิมพ์ `/joinjob` เพื่อสมัครงาน (บางงานต้องใช้เลเวลสูงขึ้น)\n• บอทจะจ่ายเงินเดือนให้ท่านโดยอัตโนมัติ!', 
          inline: false 
        },
        { 
          name: '3️⃣ การกู้เงิน & ธนาคาร (สายลงทุน)', 
          value: '• พิมพ์ `/dep` เพื่อฝากเงินเข้าธนาคาร (ป้องกันการโดนปล้น)\n• พิมพ์ `/loan` เพื่อกู้เงินจากธนาคารแห่งประเทศไทย (ความสามารถในการกู้ขึ้นอยู่กับเลเวล)\n• พิมพ์ `/credit` เพื่อเช็ควงเงินกู้คงเหลือของคุณ', 
          inline: false 
        },
        { 
          name: '4️⃣ กิจกรรม & การเสี่ยงโชค (สายลุ้น)', 
          value: '• `/slots` หรือ `/coinflip` เพื่อเสี่ยงโชค\n• `/rob` เพื่อแอบขโมยเงินจากผู้เล่นอื่น (ระวังโดนปรับนะ!)', 
          inline: false 
        },
        { 
          name: '5️⃣ การดูข้อมูลตัวเอง', 
          value: '• พิมพ์ `/profile` เพื่อดูเลเวล, XP และยอดเงินทั้งหมดของคุณ\n• พิมพ์ `/leader` เพื่อดูว่าคุณอยู่อันดับไหนของเซิร์ฟเวอร์', 
          inline: false 
        }
      )
      .setFooter({ text: 'หากมีข้อสงสัยเพิ่มเติม สอบถามได้ที่ทีมงาน THAILAND ครับ!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
