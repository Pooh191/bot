const moment = require('moment-timezone');
const { getCache, setCacheAndSave } = require('./mongoManager');

// —————— User functions ——————
function loadUsers() {
  return getCache('users') || {};
}

function saveUsers(users) {
  setCacheAndSave('users', users);
}

function getUser(userId) {
  const users = loadUsers();
  const cfg = loadConfig();
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      balance: cfg.startingBalance || 0,
      bank: 0,
      xp: 0,
      level: 1,
      lastWork: 0,
      lastSlut: 0,
      lastCrime: 0,
      job: 'none',
      loanPrincipal: 0,
      loanInterest: 0,
      lottoSpent: 0,
      lottoLimit: 3
    };
    saveUsers(users);
  } else {
    // กำหนดค่าเริ่มต้นสำหรับฟิลด์ที่อาจจะหายไป เพื่อป้องกันค่า undefined
    if (users[userId].balance === undefined) users[userId].balance = 0;
    if (users[userId].bank === undefined) users[userId].bank = 0;
    if (users[userId].xp === undefined) users[userId].xp = 0;
    if (users[userId].level === undefined) users[userId].level = 1;
    if (users[userId].job === undefined) users[userId].job = 'none';
    if (users[userId].loanPrincipal === undefined) users[userId].loanPrincipal = 0;
    if (users[userId].loanInterest === undefined) users[userId].loanInterest = 0;
    if (users[userId].lottoSpent === undefined) users[userId].lottoSpent = 0;
    if (users[userId].lottoLimit === undefined) users[userId].lottoLimit = 3;
    
    // ลบ Migration loanDebt ที่เสี่ยงออก (ถ้าไม่มีใครใช้แล้ว)
    if (users[userId].loanDebt !== undefined) delete users[userId].loanDebt;
  }

  return { users, user: users[userId] };
}

function addXP(user, amount) {
  user.xp = (user.xp || 0) + amount;
  
  // Basic level up formula: Level * 100 XP
  const nextLevelXP = (user.level || 1) * 100;
  if (user.xp >= nextLevelXP) {
    user.xp -= nextLevelXP;
    user.level = (user.level || 1) + 1;
    return { leveledUp: true, level: user.level };
  }
  
  return { leveledUp: false };
}

// —————— Config functions ——————
function loadConfig() {
  const config = getCache('config') || {};
  
  // ป้องกันค่า NaN กรณีที่ Config ใน Database หรือไฟล์หาย/ไม่สมบูรณ์
  const defaults = {
    workMin: 200,
    workMax: 500,
    workCooldown: 300,
    slutMin: 1000,
    slutMax: 2500,
    slutCooldown: 600000,
    crimeMin: 500,
    crimeMax: 1000,
    crimeCooldown: 480000,
    xpWork: 10,
    xpCrime: 15,
    xpSlut: 20,
    startingBalance: 200,
    dailyIncome: 0
  };

  return { ...defaults, ...config };
}

function saveConfig(config) {
  setCacheAndSave('config', config);
}

// —————— Resource functions ——————
function loadResources() {
  const res = getCache('resources') || {};
  
  // กู้คืนจากไฟล์ถ้าใน RAM/DB เป็นค่าว่าง
  if (Object.keys(res).length === 0) {
    try {
      const fs = require('fs');
      const path = require('path');
      const localData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/resources.json'), 'utf8'));
      if (Object.keys(localData).length > 0) {
        return localData;
      }
    } catch (e) {
      // ignored
    }
  }

  return res;
}

function saveResources(resources) {
  setCacheAndSave('resources', resources);
}

// —————— Tax functions (กรมสรรพากร) ——————
function calculateTax(totalWealth) {
  const taxRates = [
    { min: 0, max: 100000, rate: 0, baseTax: 0, bracketStart: 0 },
    { min: 100001, max: 200000, rate: 0.05, baseTax: 0, bracketStart: 100000 },
    { min: 200001, max: 350000, rate: 0.10, baseTax: 5000, bracketStart: 200000 },
    { min: 350001, max: 550000, rate: 0.15, baseTax: 20000, bracketStart: 350000 },
    { min: 550001, max: 800000, rate: 0.20, baseTax: 50000, bracketStart: 550000 },
    { min: 800001, max: 1100000, rate: 0.25, baseTax: 100000, bracketStart: 800000 },
    { min: 1100001, rate: 0.30, baseTax: 175000, bracketStart: 1100000 }
  ];

  let tax = 0;
  let currentRate = 0;

  for (const bracket of taxRates) {
    if (totalWealth > bracket.bracketStart) {
      const taxableAmount = totalWealth - bracket.bracketStart;
      tax = (taxableAmount * bracket.rate) + bracket.baseTax;
      currentRate = bracket.rate * 100;
    }
  }

  return { tax: Math.floor(tax), rate: currentRate };
}

module.exports = {
  // Users
  loadUsers,
  saveUsers,
  getUser,
  addXP,
  // alias for backward compatibility
  getUsers: loadUsers,

  // Config
  loadConfig,
  saveConfig,
  getConfig: loadConfig,

  // Resources
  loadResources,
  saveResources,

  // Tax
  calculateTax,
  
};
