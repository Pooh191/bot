const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { loadConfig } = require('../utils/configManager');
const fs = require('fs');
const path = require('path');
const { getUser, saveUsers, addXP } = require('../utils/economyUtils');
const { sendEconomyLog } = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ✅ ปุ่มขอสัญชาติ
      if (interaction.isButton() && interaction.customId === 'citizen_request') {
        const modal = new ModalBuilder()
          .setCustomId('citizen_form')
          .setTitle('แบบฟอร์มขอสัญชาติไทย');

        const nameInput = new TextInputBuilder()
          .setCustomId('fullname')
          .setLabel("ชื่อ-สกุล")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("ตัวอย่าง: สมชาย ใจดี");

        const discordInput = new TextInputBuilder()
          .setCustomId('discord_username')
          .setLabel("Discord Username")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("username#1234");

        const robloxInput = new TextInputBuilder()
          .setCustomId('roblox_username')
          .setLabel("Roblox Username")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("RobloxPlayer");

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(discordInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(robloxInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        await interaction.showModal(modal);
        return;
      }

      // ✅ แบบฟอร์มสัญชาติ
      if (interaction.isModalSubmit() && interaction.customId === 'citizen_form') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const fullName = interaction.fields.getTextInputValue('fullname');
        const discordUsername = interaction.fields.getTextInputValue('discord_username');
        const robloxUsername = interaction.fields.getTextInputValue('roblox_username');

        const config = loadConfig();
        if (!config?.verifyChannel) {
          return interaction.editReply({ content: '❌ ยังไม่ได้ตั้งค่าระบบสัญชาติ' });
        }

        const verifyEmbed = new EmbedBuilder()
          .setTitle('คำขอสัญชาติใหม่')
          .setDescription(`จาก: <@${interaction.user.id}>`)
          .addFields(
            { name: 'ชื่อ-สกุล', value: fullName },
            { name: 'Discord', value: discordUsername },
            { name: 'Roblox', value: robloxUsername },
            { name: 'สถานะ', value: 'รอตรวจสอบ' }
          )
          .setColor('#FFA500')
          .setTimestamp();

        const verifyChannel = interaction.guild.channels.cache.get(config.verifyChannel);
        if (verifyChannel) {
          const btnApprove = new ButtonBuilder()
            .setCustomId(`approve_citizen_${interaction.user.id}`)
            .setLabel('อนุมัติสัญชาติ')
            .setStyle(ButtonStyle.Success);
          const btnReject = new ButtonBuilder()
            .setCustomId(`reject_citizen_${interaction.user.id}`)
            .setLabel('ปฏิเสธ')
            .setStyle(ButtonStyle.Danger);
          const buttonRow = new ActionRowBuilder().addComponents(btnApprove, btnReject);

          await verifyChannel.send({
            content: 'มีคำขอสัญชาติใหม่ที่ต้องการตรวจสอบ',
            embeds: [verifyEmbed],
            components: [buttonRow]
          });
        }

        await interaction.editReply({
          content: '✅ ส่งคำขอสัญชาติเรียบร้อยแล้ว! กรุณารอการตรวจสอบจากเจ้าหน้าที่'
        });
        return;
      }

      // ✅ แบบฟอร์มตั้งเวลาประกาศข้อความยาวๆ
      if (interaction.isModalSubmit() && interaction.customId.startsWith('sa_modal_')) {
        const cachedData = global.tempAnnounceCache?.get(interaction.customId);
        if (!cachedData) {
          return interaction.reply({ content: '❌ เซสชันหมดอายุหรือฟอร์มไม่ถูกต้อง กรุณาตั้งเวลาใหม่อีกครั้ง', ephemeral: true });
        }
        
        let messageInput = interaction.fields.getTextInputValue('announce_message');
        messageInput = messageInput.replace(/\\n/g, '\n'); // รองรับการพิมพ์ \n ตรงๆ
        
        const fileP = path.join(__dirname, '..', 'data', 'scheduled_messages.json');
        let schedules = [];
        if (fs.existsSync(fileP)) {
          try {
            schedules = JSON.parse(fs.readFileSync(fileP, 'utf8'));
            if (!Array.isArray(schedules)) schedules = [];
          } catch(e) { schedules = []; }
        }

        const newSchedule = {
          id: Date.now().toString(),
          guildId: cachedData.guildId,
          channelId: cachedData.channelId,
          message: messageInput,
          roleId: cachedData.roleId,
          imageUrl: cachedData.imageUrl,
          authorId: interaction.user.id,
          executeAt: cachedData.executeAt
        };

        schedules.push(newSchedule);
        
        const dir = path.dirname(fileP);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(fileP, JSON.stringify(schedules, null, 2), 'utf8');

        // Clean up
        global.tempAnnounceCache.delete(interaction.customId);

        let previewMsg = messageInput.length > 1000 ? messageInput.substring(0, 1000) + '...' : messageInput;

        const replyEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ ตั้งเวลาประกาศสำเร็จ')
          .setDescription(`ระบบจะส่งข้อความประกาศในเวลา **${cachedData.formattedTime}**`)
          .addFields(
            { name: '📍 ไปที่ห้อง', value: `<#${cachedData.channelId}>`, inline: true },
            { name: '🏷️ ยศที่แท็ก', value: cachedData.roleId ? `<@&${cachedData.roleId}>` : 'ไม่มี', inline: true },
            { name: '🕒 เวลาที่จะส่ง', value: `<t:${Math.floor(cachedData.executeAt / 1000)}:R>`, inline: false },
            { name: '📝 ข้อความตัวอย่าง', value: previewMsg }
          );

        if (cachedData.imageUrl) replyEmbed.setImage(cachedData.imageUrl);

        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        return;
      }

      // ✅ จัดการปุ่มอนุมัติ/ปฏิเสธสัญชาติ
      if (interaction.isButton() && (interaction.customId.startsWith('approve_citizen_') || interaction.customId.startsWith('reject_citizen_'))) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const isApprove = interaction.customId.startsWith('approve_citizen_');
        // split from 'approve_citizen_userID'
        const targetUserId = interaction.customId.split('_')[2];
        
        // อัปเดต Embed ข้อความทับไปเลย
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        originalEmbed.spliceFields(3, 1, { name: 'สถานะ', value: isApprove ? '✅ อนุมัติแล้ว' : '❌ ถูกปฏิเสธ' });
        originalEmbed.setColor(isApprove ? '#00FF00' : '#FF0000');
        
        await interaction.message.edit({
          embeds: [originalEmbed],
          components: [] // ลบปุ่มออก
        });

        const config = loadConfig();
        const successChannel = interaction.guild.channels.cache.get(config.successChannel);
        
        if (isApprove) {
          let roleGiveStatus = '';
          const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
          if (member) {
            const civRole = interaction.guild.roles.cache.find(r => r.name === 'THC | Thailand Citizen');
            if (!civRole) {
              roleGiveStatus = '\n⚠️ **คำเตือน:** บอทหายศชื่อ "THC | Thailand Citizen" ไม่เจอ (ใน Discord เปลี่ยนชื่อยศหรือยัง?)';
            } else {
            await member.roles.add(civRole).then(async () => {
                // ✅ เก็บข้อมูลชื่อจริงและจังหวัดลงฐานข้อมูล + มอบทุน 5,000 บาท
                const { users, user } = getUser(targetUserId);
                
                // ดึงชื่อและจังหวัดจาก Embed ที่แอดมินพิจารณา
                const fullName = originalEmbed.data.fields[1] ? originalEmbed.data.fields[1].value : "ไม่ระบุชื่อ";
                const provinceName = originalEmbed.data.fields[2] ? originalEmbed.data.fields[2].value : "ไม่ระบุ";
                
                user.fullname = fullName;
                user.province = provinceName;
                user.balance += 5000;
                saveUsers(users);

                const { sendEconomyLog } = require('../utils/logger'); // Keep internal if needed but better at top
                await sendEconomyLog(
                  interaction.client, 
                  '🎁 สมาชิกระบบเศรษฐกิจใหม่ (New Citizen)', 
                  `ผู้เล่น <@${targetUserId}>\n👤 **ชื่อ:** ${fullName}\n🏠 **จังหวัด:** ${provinceName}\n💰 ได้รับทุนตั้งตัว **5,000 บาท** เรียบร้อยแล้ว`, 
                  'Gold',
                  false
                );

                // Remove CV | CorrectVisa role
                const cvRole = interaction.guild.roles.cache.find(r => r.name === 'CV | CorrectVisa');
                if (cvRole && member.roles.cache.has(cvRole.id)) {
                  await member.roles.remove(cvRole).catch(err => console.error('Error removing CV role:', err));
                  roleGiveStatus += ' (และลบยศ CV เรียบร้อยแล้ว)';
                }
              }).catch(err => {
                console.error('Role Add Error:', err);
                roleGiveStatus = '\n⚠️ **คำเตือน:** บอทไม่สามารถให้ยศได้ (อาจเป็นเพราะคนที่ขอสัญชาติมี Role สูงกว่าบอท, หรือบอทไม่มีสิทธิ์ Manage Roles)';
              });
            }
          }

          if (member) {
            try {
              await member.send(`🎉 ขอแสดงความยินดี! คำขอสัญชาติของคุณได้รับการอนุมัติแล้วโดย <@${interaction.user.id}>`);
            } catch (err) {
              console.error('ไม่สามารถส่ง DM หาผู้ใช้ได้ (เขาอาจจะปิด DM ไว้)', err);
            }
          }
          
          await interaction.editReply({ content: `✅ คุณได้ทำการ **อนุมัติ** คำขอสัญชาตินี้เรียบร้อยแล้ว${roleGiveStatus}` });

          const { sendEconomyLog } = require('../utils/logger');
          await sendEconomyLog(
            interaction.client, 
            '🛂 แอดมินจัดการสัญชาติ', 
            `**เจ้าหน้าที่:** <@${interaction.user.id}>\n**การกระทำ:** ✅ ให้สัญชาติใหม่กับ <@${targetUserId}>`, 
            'Green',
            false
          );
        } else {
          await interaction.editReply({ content: '❌ คุณได้ทำการ **ปฏิเสธ** คำขอสัญชาตินี้เรียบร้อยแล้ว' });

          await sendEconomyLog(
            interaction.client, 
            '🛂 แอดมินจัดการสัญชาติ', 
            `**เจ้าหน้าที่:** <@${interaction.user.id}>\n**การกระทำ:** ❌ ปฏิเสธคำขอสัญชาติของ <@${targetUserId}>`, 
            'Red',
            false
          );
        }
        return;
      }



      // ✅ ระบบ Ticket: กดปุ่มเปิดทิคเก็ต
      if (interaction.isButton() && interaction.customId === 'ticket_create') {
        const TICKET_CONFIG_FILE = path.join(__dirname, '..', 'data', 'ticket_config.json');
        
        if (!fs.existsSync(TICKET_CONFIG_FILE)) {
          return interaction.reply({ content: '❌ แอดมินยังไม่ได้ตั้งค่าระบบ Ticket', flags: [MessageFlags.Ephemeral] });
        }
        
        const config = JSON.parse(fs.readFileSync(TICKET_CONFIG_FILE, 'utf8'));
        const categoryId = config.categoryId;
        const adminRoleId = config.adminRoleId;

        // ตรวจสอบว่า Category ยังมีอยู่จริงหรือไม่
        const category = interaction.guild.channels.cache.get(categoryId);
        if (!category) {
          return interaction.reply({ content: '❌ ไม่พบหมวดหมู่ (Category) ที่ตั้งค่าไว้ (อาจถูกลบไปแล้ว) กรุณาให้แอดมินใช้คำสั่ง /setupticket ใหม่อีกครั้ง', ephemeral: true });
        }

        // ตรวจสอบห้องเดิมที่มีอยู่แล้ว
        const ticketChannelName = `ticket-${interaction.user.username.toLowerCase()}`.replace(/[^a-z0-9-]/g, '');
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketChannelName && c.parentId === categoryId);
        
        if (existingChannel) {
          return interaction.reply({ content: `❌ คุณเปิดทิคเก็ตไว้แล้วที่ห้อง <#${existingChannel.id}>`, ephemeral: true });
        }

        // สร้างห้องทิคเก็ตใหม่โดยใช้โครงสร้างที่รัดกุมที่สุด
        try {
          const newChannel = await interaction.guild.channels.create({
            name: ticketChannelName,
            type: ChannelType.GuildText,
            parent: category.id,
          });

          // ทยอยอัปเดตสิทธิ์ทีละขั้น (เพื่อป้องกันบัคจาก API Array ที่ยาวเกินตอนสร้าง)
          await newChannel.permissionOverwrites.edit(interaction.guild.id, {
            ViewChannel: false
          }).catch(() => null);

          // สิทธิ์ผู้ส่ง
          await newChannel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(() => null);

          // สิทธิ์แอดมิน
          await newChannel.permissionOverwrites.edit(adminRoleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(() => null);

          const embed = new EmbedBuilder()
            .setTitle('🎫 ศูนย์ช่วยเหลือ (Support Ticket)')
            .setDescription(`สวัสดีครับ <@${interaction.user.id}>\n\nโปรดพิมพ์คำถาม รายงานปัญหา หรือแจ้งเรื่องผู้เล่นผิดกฎไว้ที่นี่ได้เลย\nทีมงาน ( <@&${adminRoleId}> ) จะรีบทบทวนและตอบกลับให้เร็วที่สุดครับ!\n\nเมื่อสนทนาจบผลแล้ว สามารถกดปุ่มด้านล่างเพื่อปิดทิคเก็ตช่องนี้ทิ้งได้เลย`)
            .setColor('#2b2d31');

          const closeBtn = new ButtonBuilder()
            .setCustomId('ticket_close_request')
            .setLabel('ปิดทิคเก็ต (Close)')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(closeBtn);

          await newChannel.send({ content: `<@${interaction.user.id}> | <@&${adminRoleId}>`, embeds: [embed], components: [row] });

          await interaction.reply({ content: `✅ สร้างห้องทิคเก็ตสำเร็จแล้ว! ไปที่ <#${newChannel.id}> ได้เลยครับ`, flags: [MessageFlags.Ephemeral] });
        } catch (error) {
          console.error('Error creating ticket channel:', error);
          await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการสร้างห้องทิคเก็ต (บอทอาจจะไม่มีสิทธิ์ Manage Channels)', flags: [MessageFlags.Ephemeral] });
        }
        return;
      }

      // ✅ ระบบ Ticket: กดปุ่มขอปิดทิคเก็ต
      if (interaction.isButton() && interaction.customId === 'ticket_close_request') {
        const confirmBtn = new ButtonBuilder()
          .setCustomId('ticket_close_confirm')
          .setLabel('ลบห้องทิ้งถาวร')
          .setStyle(ButtonStyle.Danger);

        const cancelBtn = new ButtonBuilder()
          .setCustomId('ticket_close_cancel')
          .setLabel('ยกเลิก')
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        await interaction.reply({ content: '⚠️ **คำเตือน:** คุณแน่ใจหรือไม่ว่าต้องการปิดห้องนี้?\nประวัติแชททั้งหมดจะถูกลบอย่างถาวร!', components: [row] });
        return;
      }

      // ✅ ระบบ Ticket: ยืนยันปิดทิคเก็ต
      if (interaction.isButton() && interaction.customId === 'ticket_close_confirm') {
        await interaction.reply({ content: '🗑️ กำลังลบห้องในอีก 5 วินาที...' });
        setTimeout(() => {
          if (interaction.channel) {
              interaction.channel.delete().catch(console.error);
          }
        }, 5000);
        return;
      }

      // ✅ ระบบ Ticket: ยกเลิกปิดทิคเก็ต
      if (interaction.isButton() && interaction.customId === 'ticket_close_cancel') {
        await interaction.message.delete();
        return;
      }

      // ✅ จัดการ Slash Command
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        try {
          await cmd.execute(interaction, client);

          // Log Slash command usage for Admin
          sendEconomyLog(client, '⌨️ ใช้คำสั่ง Slash', `**ผู้ใช้:** <@${interaction.user.id}>\n**คำสั่ง:** /${interaction.commandName}`, 'Aqua', false);
        } catch (e) {
          console.error(e);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ เกิดข้อขัดข้องในการรันคำสั่งนี้', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          } else {
            await interaction.reply({ content: '❌ เกิดข้อขัดข้อง', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          }
        }
      }

      // ✅ จัดการปุ่มอื่น
      else if (interaction.isButton()) {
        const btn = client.buttons.get(interaction.customId);
        if (!btn) return;
        try {
          await btn.execute(interaction, client);
        } catch (e) {
          console.error(e);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ การกดปุ่มล้มเหลว', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          } else {
            await interaction.reply({ content: '❌ การกดปุ่มล้มเหลว', flags: [MessageFlags.Ephemeral] }).catch(() => {});
          }
        }
      }

      // ✅ จัดการ Modal อื่น
      else if (interaction.isModalSubmit()) {
        const modal = client.modals.get(interaction.customId);
        if (!modal) return;
        try {
          await modal.execute(interaction, client);
        } catch (e) {
          console.error(e);
          if (!interaction.replied) {
            await interaction.reply({ content: '❌ การส่งฟอร์มล้มเหลว', ephemeral: true });
          }
        }
      }

    } catch (error) {
      console.error('Interaction Error:', error);
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ เกิดข้อผิดพลาดในการประมวลผล',
            flags: [MessageFlags.Ephemeral]
          }).catch(e => {});
        } else {
          await interaction.reply({
            content: '❌ เกิดข้อผิดพลาดในการประมวลผล',
            flags: [MessageFlags.Ephemeral]
          }).catch(e => {});
        }
      }
    }
  }
};
