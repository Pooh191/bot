const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📋 แสดงรายการคำสั่งทั้งหมดที่บอทสามารถทำได้'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 คู่มือการใช้งานบอท THAILAND')
      .setColor('Blue')
      .setDescription('นี่คือรายการคำสั่งทั้งหมดที่คุณสามารถใช้งานได้ในเซิร์ฟเวอร์นี้ครับ')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTimestamp();

    embed.addFields(
      { name: '📊 สถิติ & รางวัล', value: '`/profile` - ดูเลเวลและ XP\n`/checkmoney` - เช็คเงิน\n`/leader` - อันดับคนรวย\n`/econstats` - รายงานเศรษฐกิจไทย\n`/tax` - เช็คยอดภาษี\n`/howto` - วิธีใช้บอทเงิน', inline: false },
      { name: '💰 เศรษฐกิจ & ธนาคาร', value: '`/work` - ทำงาน\n`/slut` - ทำงานสีเทา\n`/crime` - ปล้นระบบ\n`/dep` - ฝากเงิน\n`/drew` - ถอนเงิน\n`/pay` - โอนเงิน\n`/loan` - กู้เงินธนาคารแห่งประเทศไทย\n`/repay` - ชำระหนี้\n`/credit` - เช็ควงเงินกู้', inline: false },
      { name: '🎲 การพนัน & เสี่ยงโชค', value: '`/slots` - หมุนสล็อต\n`/coinflip` - ทายหัวก้อย\n`/rob` - แอบปล้นผู้เล่น', inline: false },
      { name: '🛡️ แอดมิน & ระบบ', value: '`/purge` - ลบข้อความ\n`/invite` - สร้างลิงก์ถาวร\n`/setnews` - ตั้งค่าช่องรายงาน\n`/testnews` - ตัวอย่างรายงาน\n`/testtax` - จำลองเก็บภาษี\n`/setloanlimit` - ตั้งค่าวงเงินกู้\n`/setrole_salary` - ตั้งค่าเงินเดือนยศ\n`/list_role_salaries` - ดูรายการเงินเดือน\n`/setmoney1day` - ตั้งค่าแจกเงินรายวัน\n`/help` - ดูทั้งหมด\n`/ping` - ตรวจสอบความหน่วงบอท', inline: false }
    );

    embed.setFooter({ text: 'ขอบคุณที่ร่วมเป็นส่วนหนึ่งของเมืองเรา!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
