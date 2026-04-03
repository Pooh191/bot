require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ChannelType, Partials, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { connectAndSyncAll, getCache, setCacheAndSave } = require('./utils/mongoManager');
const { setupDailyUpdate } = require('./scheduler/dailyUpdate');
const { loadUsers, saveUsers, getUser, loadResources, saveResources, loadConfig, saveConfig, addXP } = require('./utils/economyUtils');
const { scheduleAll } = require('./scheduler/scheduler');

// สร้างโฟลเดอร์ data ถ้ายังไม่มี
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Set up collections after client initialization
client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();

// Constants
const CIVILIAN_ROLE_NAME = 'THC | Thailand Citizen';
const COUNTER_FILE = path.join(dataDir, 'counter.json');
const UID_ROLE_FILE = path.join(dataDir, 'uid_roles.json');
// Instead of constants, we will read directly from process.env for hot reloadability

const rolesInOrder = [
  'CMI | เชียงใหม่',
  'CRI | เชียงราย',
  'LPN | ลำพูน',
  'NMA | นครราชสีมา',
  'KKN | ขอนแก่น',
  'UDN | อุดรธานี',
  'BKK | กรุงเทพมหานคร',
  'AYA | พระนครศรีอยุธยา',
  'NBI | นนทบุรี',
  'PKT | ภูเก็ต',
  'SKA | สงขลา',
  'SNI | สุราษฎร์ธานี'
];

const autoChannels = new Set();

// helper หาชื่อห้องถัดไป VC 1, VC 2, ...
async function getNextVoiceChannelName(guild) {
  const used = new Set();
  guild.channels.cache
    .filter(c => c.type === ChannelType.GuildVoice && c.parentId === process.env.VOICE_CATEGORY_ID)
    .forEach(c => {
      const m = c.name.match(/^VC (\d+)$/);
      if (m) used.add(parseInt(m[1], 10));
    });
  for (let i = 1; ; i++) {
    if (!used.has(i)) return `VC ${i}`;
  }
}

// Counter helpers
function getCounter() {
  const data = getCache('counter');
  return data?.count || 0;
}

function saveCounter(n) {
  setCacheAndSave('counter', { count: n });
}

// UID-role map helper
function getUidRoles() {
  return getCache('uid_roles') || {};
}

function saveUidRoles(data) {
  setCacheAndSave('uid_roles', data);
}

// โหลดและลงทะเบียน Slash commands
const commands = [];
for (const f of fs.readdirSync('./commands').filter(f => f.endsWith('.js'))) {
  const cmd = require(`./commands/${f}`);
  if (!cmd.data?.name) continue;
  client.commands.set(cmd.data.name, cmd);
  commands.push(cmd.data.toJSON());
  console.log(`🔹 Loaded '/${cmd.data.name}'`);
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
  try {
    await connectAndSyncAll();
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`📡 Registered ${commands.length} slash commands`);

    // Let the bot login ONLY after DB cache is ready
    client.login(process.env.BOT_TOKEN);
  } catch (e) {
    console.error('❌ Initialization failed', e);
  }
})();

const statuses = [
  { name: 'ประเทศไทย', type: ActivityType.Playing },
  { name: 'ประชาชนชาวไทย', type: ActivityType.Watching },
  { name: 'เพลงชาติไทย', type: ActivityType.Listening },
  { name: 'การเลือกตั้ง', type: ActivityType.Competing },
  { name: 'โหมดประหยัดพลังงาน', type: ActivityType.Watching },
];

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ฟังก์ชันเปลี่ยนสถานะ
  const changeStatus = () => {
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    client.user.setPresence({
      activities: [{
        name: randomStatus.name,
        type: randomStatus.type
      }],
      status: 'online',
    });
  };

  // เรียกใช้ฟังก์ชันเปลี่ยนสถานะทันทีที่บอทออนไลน์
  changeStatus();

  // เปลี่ยนสถานะทุก ๆ 15 วินาที (15,000 มิลลิวินาที)
  setInterval(changeStatus, 15000);

  scheduleAll(client);
  setupDailyUpdate(client);
});


// Interaction handler (Slash Commands, Buttons, Modals)
const interactionHandler = require('./events/interactionCreate.js');
client.on('interactionCreate', async interaction => {
  await interactionHandler.execute(interaction, client);
});

// VoiceStateUpdate: สร้าง & ลบห้อง VC อัตโนมัติ
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild;

  // 1) สร้างห้องใหม่ เมื่อเข้าห้องเตรียม
  if (oldState.channelId !== newState.channelId && newState.channelId === process.env.PREPARED_VOICE_ID) {
    const category = guild.channels.cache.get(process.env.VOICE_CATEGORY_ID);
    if (!category || category.type !== ChannelType.GuildCategory) {
      return console.error(`❌ VOICE_CATEGORY_ID (${process.env.VOICE_CATEGORY_ID}) ไม่ใช่หมวดหมู่ที่ถูกต้อง หรือไม่พบหมวดหมู่`);
    }
    try {
      const name = await getNextVoiceChannelName(guild);
      const ch = await guild.channels.create({
        name, 
        type: ChannelType.GuildVoice, 
        parent: category,
        reason: 'Auto-created VC'
      });
      autoChannels.add(ch.id);
      await newState.member.voice.setChannel(ch);
    } catch (e) {
      console.error('❌ สร้างห้องเสียงล้มเหลว', e);
    }
  }

  // 2) ลบห้องเมื่อไม่มีผู้ใช้เหลือ (ลบเฉพาะห้องในหมวดหมู่ที่กำหนด และชื่อตรงตามแพทเทิร์น VC X)
  const leftId = oldState.channelId;
  if (leftId) { // ไม่ต้องเช็ค autoChannels.has(leftId) เพื่อให้ลัดหลังบอทรีสตาร์ทได้
    const ch = oldState.guild.channels.cache.get(leftId);
    if (ch && ch.type === ChannelType.GuildVoice && ch.parentId === process.env.VOICE_CATEGORY_ID) {
      // ตรวจสอบชื่อว่าต้องเป็น VC ตามด้วยตัวเลข (กันลบห้องอื่นที่ไม่ได้สร้างโดยบอทในหมวดเดียวกัน)
      const isAutoVC = ch.name.match(/^VC \d+$/);
      if (isAutoVC) {
        const humans = ch.members.filter(m => !m.user.bot).size;
        if (humans === 0) {
          try {
            await ch.delete('No humans left');
            autoChannels.delete(leftId);
          } catch (e) {
            // console.error('❌ Auto-delete failed', e);
          }
        }
      }
    }
  }
});

// guildMemberUpdate: มอบยศ CIV ตามลำดับ
client.on('guildMemberUpdate', async (oldM, newM) => {
  const civRole = newM.guild.roles.cache.find(r => r.name === CIVILIAN_ROLE_NAME);
  if (!civRole) {
    // console.error(`❌ ไม่พบยศหลักที่ชื่อ "${CIVILIAN_ROLE_NAME}" ในเซิร์ฟเวอร์นี้`);
    return;
  }

  const had = oldM.roles.cache.has(civRole.id);
  const has = newM.roles.cache.has(civRole.id);

  // ตรวจสอบว่าคือกิจกรรม "เพิ่งได้รับยศหลัก" หรือไม่
    if (!had && has) {
    console.log(`👤 ตรวจพบ ${newM.user.tag} ได้รับยศหลัก "${CIVILIAN_ROLE_NAME}" กำลังสุ่มจังหวัด...`);
    
    const uidRoles = getUidRoles();
    let roleName = uidRoles[newM.id];
    if (!roleName) {
      console.log(`🎲 สมาชิกใหม่ (ยังไม่เคยมีจังหวัด) กำลังสุ่มจาก ${rolesInOrder.length} จังหวัด...`);
      const counts = {};
      for (const prov of rolesInOrder) counts[prov] = 0;
      for (const uid in uidRoles) {
        if (counts[uidRoles[uid]] !== undefined) {
          counts[uidRoles[uid]]++;
        }
      }

      const minCount = Math.min(...Object.values(counts));
      const candidates = rolesInOrder.filter(prov => counts[prov] === minCount);
      const randomIdx = Math.floor(Math.random() * candidates.length);
      roleName = candidates[randomIdx];

      uidRoles[newM.id] = roleName;
      saveUidRoles(uidRoles);
      console.log(`📍 สุ่มได้จังหวัด: "${roleName}" (ประชากรเดิม: ${minCount})`);
      
      // อัปเดตตัวนับไว้เฉยๆ เผื่อระบบเก่ามีเรียกใช้ที่ไหน
      saveCounter(getCounter() + 1);
    } else {
      console.log(`🏠 สมาชิกเดิม เคยมีจังหวัดเป็น "${roleName}" อยู่แล้ว`);
    }

    const r = newM.guild.roles.cache.find(x => x.name === roleName);
    if (r) {
      try {
        await newM.roles.add(r);
        console.log(`✅ มอบยศ "${roleName}" ให้ ${newM.user.tag} เรียบร้อย!`);
        
        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setTitle(`${newM.user.username} ได้รับยศ`)
          .setDescription(`<@${newM.id}> ได้รับยศ **${roleName}**`)
          .setTimestamp();
        const nc = newM.guild.channels.cache.get(process.env.NOTIFY_CHANNEL_ID);
        if (nc?.isTextBased()) await nc.send({ embeds: [embed] });
      } catch (err) {
        console.error(`❌ บอทไม่สามารถมอบยศ "${roleName}" ได้:`, err.message);
        console.error(`👉 ตรวจสอบว่าบอทมีสิทธิ์ "Manage Roles" และยศของบอทอยู่ *สูงกว่า* ยศนั้นหรือไม่`);
      }
    } else {
      console.error(`❌ ไม่พบยศที่ชื่อ "${roleName}" ในเซิร์ฟเวอร์นี้ (กรุณาเช็คชื่อยศว่าตรงกับในโค้ดหรือไม่)`);
    }
  }
});



// Login is handled above inside the initialization async function

// Render Port Binding (Fix for "No open ports detected" error)
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});

const { sendEconomyLog } = require('./utils/logger');

// Voice State Logging
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member.user;
  if (user.bot) return;

  if (!oldState.channelId && newState.channelId) {
    // Join
    sendEconomyLog(client, '🔊 เข้าห้องเสียง (Voice Join)', `**ผู้ใช้:** <@${user.id}>\n**เข้าห้อง:** <#${newState.channelId}>`, 'Blue', false);
  } else if (oldState.channelId && !newState.channelId) {
    // Leave
    sendEconomyLog(client, '🔇 ออกจากห้องเสียง (Voice Leave)', `**ผู้ใช้:** <@${user.id}>\n**ออกจากห้อง:** <#${oldState.channelId}>`, 'Grey', false);
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    // Move
    sendEconomyLog(client, '🔄 ย้ายห้องเสียง (Voice Move)', `**ผู้ใช้:** <@${user.id}>\n**จาก:** <#${oldState.channelId}>\n**ไปที่:** <#${newState.channelId}>`, 'LightGrey', false);
  }
});

// Slash Command Execution Logging (Already handled in command files for most, but this catches if any missed)
// However, logging literally "everything typed" might be too noisy. 
// We will log message deletions or edits for admin as well if needed.
client.on('messageDelete', async (message) => {
  if (!message.guild || !message.author || message.author.bot) return;
  sendEconomyLog(client, '🗑️ ข้อความถูกลบ (Message Deleted)', `**ผู้ส่ง:** <@${message.author.id}>\n**ห้อง:** <#${message.channelId}>\n**เนื้อหา:** ${message.content || '[ไม่มีข้อความ/เป็นไฟล์]'}`, 'Orange', false);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
  if (oldMessage.content === newMessage.content) return;
  sendEconomyLog(client, '✏️ แก้ไขข้อความ (Message Edited)', `**ผู้ส่ง:** <@${newMessage.author.id}>\n**ห้อง:** <#${newMessage.channelId}>\n**เก่า:** ${oldMessage.content || '[ว่าง]'}\n**ใหม่:** ${newMessage.content || '[ว่าง]'}`, 'Yellow', false);
});

// Message Sent Logging (Admin only can view this via /log)
client.on('messageCreate', async (message) => {
  if (!message.guild || !message.author || message.author.bot) return;

  // Add XP (Message)
  const { users, user } = getUser(message.author.id);
  const result = addXP(user, Math.floor(Math.random() * 5) + 1);
  saveUsers(users);

  if (result.leveledUp) {
    message.channel.send(`🎊 ยินดีด้วยคุณ <@${message.author.id}>! เลเวลของคุณเพิ่มขึ้นเป็น **Level ${result.level}** แล้ว!`);
  }

  // เพื่อไม่ให้ Logs ไฟล์บวมเกินไป เราจะบันทึกสั้นๆ
  sendEconomyLog(client, '💬 แชท (Message)', `**ผู้ส่ง:** <@${message.author.id}> แชทใน <#${message.channelId}>: ${message.content.substring(0, 100)}`, 'White', false);
});

// Member Join/Leave Logging
client.on('guildMemberAdd', (member) => {
  sendEconomyLog(client, '📥 สมาชิกใหม่ (Member Join)', `**ผู้ใช้:** <@${member.id}>\n**เข้าเซิร์ฟเวอร์มาใหม่**`, 'Green', false);
});

client.on('guildMemberRemove', (member) => {
  sendEconomyLog(client, '📤 สมาชิกออก (Member Leave)', `**ผู้ใช้:** <@${member.id}>\n**ออกจากเซิร์ฟเวอร์**`, 'Orange', false);
});


