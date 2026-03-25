const fs = require('fs');
const path = require('path');

// Path setup
const usersFilePath  = path.join(__dirname, '..', 'data', 'users.json');
const configFilePath = path.join(__dirname, '..', 'config.json');
const resourcesFilePath = path.join(__dirname, '..', 'data', 'resources.json');

// —————— User functions ——————
function loadUsers() {
  if (!fs.existsSync(usersFilePath)) {
    fs.mkdirSync(path.dirname(usersFilePath), { recursive: true });
    fs.writeFileSync(usersFilePath, JSON.stringify({}, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
}

function getUser(userId) {
  const users = loadUsers();
  if (!users[userId]) {
    const cfg = loadConfig();
    users[userId] = {
      id: userId,
      balance: cfg.startingBalance || 0,
      bank: 0,
      xp: 0,
      level: 1,
      lastWork: 0,
      lastSlut: 0,
      lastCrime: 0,
      lastCrime: 0,
      job: 'none',
      loanPrincipal: 0,
      loanInterest: 0,
      idCard: null
    };
    saveUsers(users);
  }
  // backwards compatibility for existing users
  if (users[userId].xp === undefined) users[userId].xp = 0;
  if (users[userId].level === undefined) users[userId].level = 1;
  if (users[userId].job === undefined) users[userId].job = 'none';
  if (users[userId].idCard === undefined) users[userId].idCard = null;
  
  // Migration for old loanDebt
  if (users[userId].loanDebt !== undefined) {
    users[userId].loanPrincipal = Math.floor(users[userId].loanDebt * 0.95);
    users[userId].loanInterest = Math.ceil(users[userId].loanDebt * 0.05);
    delete users[userId].loanDebt;
  }
  
  if (users[userId].loanPrincipal === undefined) users[userId].loanPrincipal = 0;
  if (users[userId].loanInterest === undefined) users[userId].loanInterest = 0;

  return { users, user: users[userId] };
}

function addXP(userId, amount) {
  const { users, user } = getUser(userId);
  user.xp += amount;
  
  // Basic level up formula: Level * 100 XP
  const nextLevelXP = user.level * 100;
  if (user.xp >= nextLevelXP) {
    user.xp -= nextLevelXP;
    user.level += 1;
    saveUsers(users);
    return { leveledUp: true, level: user.level };
  }
  
  saveUsers(users);
  return { leveledUp: false };
}

// —————— Config functions ——————
function loadConfig() {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify({}, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
}

// —————— Resource functions ——————
function loadResources() {
  if (!fs.existsSync(resourcesFilePath)) {
    fs.mkdirSync(path.dirname(resourcesFilePath), { recursive: true });
    fs.writeFileSync(resourcesFilePath, JSON.stringify({}, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(resourcesFilePath, 'utf8'));
}

function saveResources(resources) {
  fs.writeFileSync(resourcesFilePath, JSON.stringify(resources, null, 2), 'utf8');
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
  calculateTax
};
