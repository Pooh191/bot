const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const DatingProfile = require('../models/DatingProfile');

module.exports = async (interaction, client) => {
  try {
    // === 1. ปุ่มหลักในเมนู (Buttons) ===
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // 📝 สมัคร/อัปเดต - ปุ่มสำหรับเรียกฟอร์ม
      if (customId === 'dating_register') {
        const { StringSelectMenuBuilder } = require('discord.js');
        const provincesByRegion = require('../data/provincesByRegion');

        const regionSelect = new StringSelectMenuBuilder()
          .setCustomId('dating_region_select')
          .setPlaceholder('กดยังที่นี่เพื่อเลือก "ภูมิภาค" ของคุณ')
          .addOptions(
            Object.keys(provincesByRegion).map(region => ({
              label: region,
              value: region
            }))
          );

        const row = new ActionRowBuilder().addComponents(regionSelect);

        await interaction.reply({
          content: '📍 **ขั้นตอนที่ 1:** กรุณาเลือกภาคที่คุณอยู่ในประเทศไทย เพื่อค้นหาจังหวัดของคุณครับ',
          components: [row],
          flags: [MessageFlags.Ephemeral]
        });
        return true;
      }

      // ✨ ข้อมูลเสริม
      if (customId === 'dating_extra_info') {
        const modal = new ModalBuilder()
          .setCustomId('dating_extra_info_modal')
          .setTitle('✨ อัปเดตข้อมูลเสริม (Bio)');

        const lookingForInput = new TextInputBuilder()
          .setCustomId('dating_looking_for')
          .setLabel('เป้าหมายที่ตามหา (เช่น เพื่อนเล่นเกม, เพื่อนคุย)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const bioInput = new TextInputBuilder()
          .setCustomId('dating_bio')
          .setLabel('แนะนำตัวสั้นๆ')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(lookingForInput),
          new ActionRowBuilder().addComponents(bioInput)
        );

        await interaction.showModal(modal);
        return true;
      }

      // 👤 โปรไฟล์ของฉัน
      if (customId === 'dating_my_profile') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const profile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!profile) {
          return interaction.editReply({ content: '❌ คุณยังไม่ได้ลงทะเบียน กรุณากดปุ่ม **สมัคร/อัปเดต** ก่อนครับ' });
        }
        
        const embed = new EmbedBuilder()
          .setColor('#ff479b')
          .setTitle(`👤 โปรไฟล์ของฉัน`)
          .addFields(
            { name: 'ชื่อเล่น', value: profile.nickname || 'ไม่ระบุ', inline: true },
            { name: 'เพศ', value: profile.gender || 'ไม่ระบุ', inline: true },
            { name: 'จังหวัด', value: profile.province || 'ไม่ระบุ', inline: true },
            { name: 'กำลังมองหา', value: profile.lookingFor || 'ไม่ระบุ', inline: true },
            { name: 'Facebook', value: profile.facebook || '-', inline: true },
            { name: 'Instagram', value: profile.instagram || '-', inline: true },
            { name: '📝 แนะนำตัว (Bio)', value: profile.extraInfo || 'ยังไม่ได้เขียนอะไรเพิ่มเติม', inline: false },
            { name: '💞 สถิติ', value: `คนกดถูกใจคุณ: ${profile.likesReceived.length} | กดถูกใจไปแล้ว: ${profile.likesGiven.length} | แมตช์แล้ว: ${profile.matches.length}`, inline: false }
          )
          .setThumbnail(interaction.user.displayAvatarURL());
          
        await interaction.editReply({ embeds: [embed] });
        return true;
      }

      // 🧭 หาคนใกล้ฉัน (ในจังหวัดตัวเอง)
      if (customId === 'dating_find_near') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!myProfile) return interaction.editReply({ content: '❌ คุณต้องลงทะเบียนโปรไฟล์ก่อนครับ ไปที่ **สมัคร/อัปเดต** ได้เลย' });

        return await searchNextProfile(interaction, client, myProfile, { province: myProfile.province });
      }

      // 🏙️ หาคนในจังหวัด (สุ่มทั่วประเทศ หรือหาจากทั้งหมด)
      if (customId === 'dating_find_all') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!myProfile) return interaction.editReply({ content: '❌ คุณต้องลงทะเบียนโปรไฟล์ก่อนครับ ไปที่ **สมัคร/อัปเดต** ได้เลย' });

        return await searchNextProfile(interaction, client, myProfile, {});
      }

      // 💟 คนที่ถูกใจฉัน
      if (customId === 'dating_liked_me') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!myProfile) return interaction.editReply({ content: '❌ ยังไม่มีโปรไฟล์...' });

        if (myProfile.likesReceived.length === 0) {
          return interaction.editReply({ content: '😢 ว้า... ยังไม่มีคนกดถูกใจคุณเลย รออีกนิดนะ!' });
        }

        const likers = await DatingProfile.find({ userId: { $in: myProfile.likesReceived } });
        const listText = likers.map(l => `- **${l.nickname}** (จ.${l.province})`).join('\n') || 'ไม่มีข้อมูลเพิ่มเติม';
        
        const embed = new EmbedBuilder()
          .setColor('#ff479b')
          .setTitle('คนที่สนใจคุณ! 💟')
          .setDescription(listText);

        await interaction.editReply({ embeds: [embed] });
        return true;
      }

      // ❓ วิธีใช้
      if (customId === 'dating_help') {
        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('❓ วิธีการใช้งานระบบหาเพื่อน')
          .setDescription('1. กด **📝 สมัคร/อัปเดต** เพื่อตั้งค่าโปรไฟล์แรกเข้า\n2. กด **✨ ข้อมูลเสริม** เพื่อเพิ่ม Bio ให้น่าสนใจยิ่งขึ้น\n3. ใช้ปุ่ม **🧭 หาคนใกล้ฉัน** เพื่อสุ่มมองหาคนในจังหวัดเดียวกัน\n4. ใช้ปุ่ม **🏙️ หาคนในจังหวัด** เพื่อสุ่มข้ามจังหวัดทั่วประเทศ\n5. หากเจอคนที่ใช่ กด ❤️ ถูกใจ! ถ้าเขาถูกใจคุณกลับเช่นกัน บอทจะแจ้งเตือนทั้งสองฝ่ายเพื่อให้แลกคอนแทคกันนะ!');
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        return true;
      }

      // ❤️ กดถูกใจ (Like)
      if (customId.startsWith('dating_like_')) {
        await interaction.deferUpdate().catch(() => {});
        const targetId = customId.split('_')[2];
        const searchMode = customId.split('_')[3] || 'all'; // near or all

        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        const targetProfile = await DatingProfile.findOne({ userId: targetId });

        if (!myProfile || !targetProfile) {
          return interaction.editReply({ content: '❌ ข้อมูลเกิดข้อผิดพลาด หรือโปรไฟล์หายไปแล้ว', embeds: [], components: [] });
        }

        // เพิ่มประวัติกดถูกใจ
        if (!myProfile.likesGiven.includes(targetId)) {
          myProfile.likesGiven.push(targetId);
          await myProfile.save();
        }

        if (!targetProfile.likesReceived.includes(interaction.user.id)) {
          targetProfile.likesReceived.push(interaction.user.id);
          await targetProfile.save();
        }

        // ส่ง DM หาทั้งคู่แบบระบบ Request / Accept
        try {
          const targetDiscordUser = await client.users.fetch(targetId);
          if (targetDiscordUser) {
            const embed = new EmbedBuilder()
              .setColor('#ff479b')
              .setTitle('💌 มีคำขอเป็นเพื่อนใหม่ส่งถึงคุณ!')
              .setDescription(`ผู้เล่น **${myProfile.nickname}** (จ.${myProfile.province}) มีความสนใจอยากเป็นเพื่อนกับคุณ!\n\nเป้าหมายของเขา: ${myProfile.lookingFor || '-'}\n\nกดปุ่มด้านล่างเพื่อตัดสินใจ:`);
            
            const btnRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`dating_accept_${interaction.user.id}`)
                .setLabel('✅ ยอมรับ')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`dating_reject_${interaction.user.id}`)
                .setLabel('❌ ไม่ยอมรับ')
                .setStyle(ButtonStyle.Danger)
            );

            await targetDiscordUser.send({ embeds: [embed], components: [btnRow] }).catch(() => {});
          }
        } catch (e) {}

        await interaction.followUp({ content: `💌 **ส่งคำขอสำเร็จ!** ระบบได้ทำการส่งคำขอไปยัง <@${targetId}> แล้ว รอให้เขาตอบรับนะ!`, flags: [MessageFlags.Ephemeral] });

        // โหลดโปรไฟล์ถัดไป (หาใหม่)
        return await searchNextProfile(interaction, client, myProfile, searchMode === 'near' ? { province: myProfile.province } : {}, searchMode);
      }

      // ❌ กดข้าม (Skip)
      if (customId.startsWith('dating_skip_')) {
        await interaction.deferUpdate().catch(() => {});
        const skippedId = customId.split('_')[2];
        const searchMode = customId.split('_')[3] || 'all';
        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        
        if (!myProfile.skipsGiven) myProfile.skipsGiven = [];
        if (!myProfile.skipsGiven.includes(skippedId)) {
          myProfile.skipsGiven.push(skippedId);
          await myProfile.save();
        }

        return await searchNextProfile(interaction, client, myProfile, searchMode === 'near' ? { province: myProfile.province } : {}, searchMode);
      }

      // ✅ กดยอมรับคำขอเป็นเพื่อนผ่าน DM
      if (customId.startsWith('dating_accept_')) {
        await interaction.deferUpdate().catch(() => {});
        const requesterId = customId.split('_')[2];
        const myProfile = await DatingProfile.findOne({ userId: interaction.user.id });
        const requesterProfile = await DatingProfile.findOne({ userId: requesterId });

        if (!myProfile || !requesterProfile) return;

        // เติมลงใน Matches
        if (!myProfile.matches.includes(requesterId)) myProfile.matches.push(requesterId);
        if (!requesterProfile.matches.includes(interaction.user.id)) requesterProfile.matches.push(interaction.user.id);
        
        await myProfile.save();
        await requesterProfile.save();

        // เปลี่ยนแก้ข้อความใน DM ตัวเอง
        const updatedEmbed = new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ คุณยอมรับคำขอเป็นเพื่อนสำเร็จแล้ว!')
          .setDescription(`คุณได้ตอบรับเป็นเพื่อนกับ **${requesterProfile.nickname}** เรียบร้อย!\nติดต่อเขาได้ที่ช่องทางต่อไปนี้:\n**Facebook:** ${requesterProfile.facebook}\n**Instagram:** ${requesterProfile.instagram}`);
        
        await interaction.editReply({ embeds: [updatedEmbed], components: [] }).catch(() => {});

        // แจ้งเตือนไปยังฝั่งคนขอ
        try {
          const reqDiscordUser = await client.users.fetch(requesterId);
          if (reqDiscordUser) {
            const notifEmbed = new EmbedBuilder()
              .setColor('Green')
              .setTitle('🎉 มีคนยอมรับคำขอเป็นเพื่อนของคุณแล้ว!')
              .setDescription(`**${myProfile.nickname}** ยอมรับคำขอเป็นเพื่อนของคุณแล้ว!\nลองทักทายเขาดูได้ที่ช่องทางต่อไปนี้:\n**Facebook:** ${myProfile.facebook}\n**Instagram:** ${myProfile.instagram}`);
            await reqDiscordUser.send({ embeds: [notifEmbed] }).catch(() => {});
          }
        } catch (e) {}

        return true;
      }

      // ❌ กดปฏิเสธคำขอเป็นเพื่อนผ่าน DM
      if (customId.startsWith('dating_reject_')) {
        await interaction.deferUpdate().catch(() => {});
        const updatedEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ ไม่ยอมรับคำขอ')
          .setDescription('คุณได้ปฏิเสธคำขอเป็นเพื่อนจากผู้เล่นท่านนี้เรียบร้อยแล้ว');
        
        await interaction.editReply({ embeds: [updatedEmbed], components: [] }).catch(() => {});
        return true;
      }
    }


    // === 1.5 ตัวเลือกเมนูภูมิภาคและจังหวัด (String Select Menu) ===
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'dating_region_select') {
        const selectedRegion = interaction.values[0];
        const provincesByRegion = require('../data/provincesByRegion');
        const provinces = provincesByRegion[selectedRegion];

        const { StringSelectMenuBuilder } = require('discord.js');
        const provinceSelect = new StringSelectMenuBuilder()
          .setCustomId('dating_province_select')
          .setPlaceholder(`เลือก "จังหวัด" ใน ${selectedRegion}`)
          .addOptions(
            provinces.map(prov => ({
              label: prov,
              value: prov
            }))
          );

        const row = new ActionRowBuilder().addComponents(provinceSelect);

        await interaction.update({
          content: `📍 **ขั้นตอนที่ 2:** คุณเลือก ${selectedRegion} เรียบร้อยแล้ว\nกรุณากดเลือกจังหวัดของคุณจากเมนูด้านล่างนี้ครับ:`,
          components: [row]
        });
        return true;
      }

      if (interaction.customId === 'dating_province_select') {
        const selectedProvince = interaction.values[0];

        // เด้ง Modal กรอกข้อมูลอื่นตามมา โดยแอบส่ง selectedProvince ไปใน customId
        const modal = new ModalBuilder()
          .setCustomId(`dating_register_modal_${selectedProvince}`)
          .setTitle(`📝 สมัคร (จ.${selectedProvince})`);

        const nicknameInput = new TextInputBuilder()
          .setCustomId('dating_nickname')
          .setLabel('ชื่อ/ชื่อเล่น ที่ใช้แสดง')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const genderInput = new TextInputBuilder()
          .setCustomId('dating_gender')
          .setLabel('เพศ (ระบุเองได้เลย)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const fbInput = new TextInputBuilder()
          .setCustomId('dating_fb')
          .setLabel('Facebook / Contact')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const igInput = new TextInputBuilder()
          .setCustomId('dating_ig')
          .setLabel('Instagram')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nicknameInput),
          new ActionRowBuilder().addComponents(genderInput),
          new ActionRowBuilder().addComponents(fbInput),
          new ActionRowBuilder().addComponents(igInput)
        );

        await interaction.showModal(modal);
        return true;
      }
    }


    // === 2. แบบฟอร์ม Modal Submits ===
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('dating_register_modal_')) {
        const province = interaction.customId.replace('dating_register_modal_', '');
        const nickname = interaction.fields.getTextInputValue('dating_nickname');
        const gender = interaction.fields.getTextInputValue('dating_gender');
        const facebook = interaction.fields.getTextInputValue('dating_fb') || '-';
        const ig = interaction.fields.getTextInputValue('dating_ig') || '-';

        let profile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!profile) {
          profile = new DatingProfile({ userId: interaction.user.id });
        }
        profile.nickname = nickname;
        profile.gender = gender;
        profile.province = province;
        profile.facebook = facebook;
        profile.instagram = ig;
        
        await profile.save();

        await interaction.reply({ content: '✅ เซฟโปรไฟล์เรียบร้อย! สามารถเพิ่มข้อมูลเสริมหรือเริ่มหาคนได้เลย!', flags: [MessageFlags.Ephemeral] });
        return true;
      }

      if (interaction.customId === 'dating_extra_info_modal') {
        const lookingFor = interaction.fields.getTextInputValue('dating_looking_for') || '-';
        const bio = interaction.fields.getTextInputValue('dating_bio') || '-';

        let profile = await DatingProfile.findOne({ userId: interaction.user.id });
        if (!profile) {
          return interaction.reply({ content: '❌ กรุณาตั้งค่าโปรไฟล์เริ่มต้น (ປุ่ມสมัคร/อัปเดต) ก่อนเพิ่มไบโอนะครับ', flags: [MessageFlags.Ephemeral] });
        }
        profile.lookingFor = lookingFor;
        profile.extraInfo = bio;
        
        await profile.save();

        await interaction.reply({ content: '✅ อัปเดต Bio เพิ่มเติมเรียบร้อย!', flags: [MessageFlags.Ephemeral] });
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Dating System Error:', err);
    return false;
  }
};

// ฟังก์ชันสำหรับค้นหาคนที่ยังไม่เห็น/ไม่ใช่ตัวเอง
async function searchNextProfile(interaction, client, myProfile, qFilter = {}, searchMode = 'all') {
  // หากลุ่มคนที่ไม่ใช่ตัวเอง, ไม่ใช่คนที่เคยกดไลค์ไปแล้ว, ไม่ใช่คนที่ข้ามไปแล้ว, ไม่ใช่คนที่แมตช์แล้ว
  const likes = myProfile.likesGiven || [];
  const matches = myProfile.matches || [];
  const skips = myProfile.skipsGiven || [];

  const query = {
    userId: { 
      $ne: myProfile.userId, 
      $nin: [...likes, ...matches, ...skips] 
    },
    ...qFilter
  };

  const pool = await DatingProfile.find(query);
  
  if (pool.length === 0) {
    return interaction.editReply({ 
      content: '😢 ค้นหาจนหมดแล้ว... ไม่พบโปรไฟล์ที่น่าสนใจในขณะนี้ หรือคุณปัดทุกคนหมดแล้ว!', 
      embeds: [], 
      components: [] 
    });
  }

  // สุ่ม 1 คน
  const randomProfile = pool[Math.floor(Math.random() * pool.length)];

  // ดึงภาพ Avatar ถ้าเป็นไปได้
  let thumbUrl = 'https://i.imgur.com/KzRkZlR.png'; // default
  try {
    const dTarget = await client.users.fetch(randomProfile.userId);
    if (dTarget) thumbUrl = dTarget.displayAvatarURL() || thumbUrl;
  } catch (e) {}

  const embed = new EmbedBuilder()
    .setColor('#ff479b')
    .setTitle(`💖 สนใจคนนี้รึเปล่า?`)
    .setDescription(`**${randomProfile.nickname}** (${randomProfile.gender})`)
    .addFields(
      { name: '📍 จังหวัด', value: randomProfile.province || 'ไม่ระบุ', inline: true },
      { name: '🎯 กำลังมองหา', value: randomProfile.lookingFor || '-', inline: true },
      { name: '💬 แนะนำตัวสั้นๆ', value: randomProfile.extraInfo || 'ยังไม่มีการเขียนแนะนำตัว', inline: false }
    )
    .setThumbnail(thumbUrl)
    .setFooter({ text: 'กดหัวใจถ้าชอบ หรือกากบาทถ้ายังไม่ใช่' });

  // ปุ่มถูกใจ และ ข้าม (ส่งโหมดกลับไปด้วยเพื่อจะได้รู้ว่าเวลาหาคนถัดไปต้องหาแบบ near หรือ all)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dating_like_${randomProfile.userId}_${searchMode}`)
      .setLabel('❤️ ถูกใจ')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`dating_skip_${randomProfile.userId}_${searchMode}`)
      .setLabel('❌ ข้าม')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
  return true;
}
