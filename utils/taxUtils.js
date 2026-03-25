// utils/taxUtils.js
const { loadUsers, saveUsers } = require('./economyUtils');
const { loadConfig, saveConfig } = require('./economyUtils');

/**
 * คำนวณภาษีจากยอดเงินตามขั้นภาษีใน config
 * @param {number} amount ยอดเงิน (balance + bank)
 * @param {object[]} brackets config.tax.brackets
 */
function calculateTax(amount, brackets) {
  for (const bracket of brackets) {
    // bracket.upTo === null หมายถึงขั้นสูงสุดไม่มีเพดาน
    if (bracket.upTo === null || amount <= bracket.upTo) {
      const taxable = amount - bracket.base;
      const tax = bracket.previousTax + taxable * bracket.rate;
      return Math.max(0, Math.floor(tax));
    }
  }
  return 0;
}

/**
 * ดำเนินการหักภาษีจากผู้ใช้ทั้งหมด ยกเว้น Role ที่กำหนด
 * @param {Client} client Discord.js client
 */
async function applyMonthlyTax(client) {
  const cfg = loadConfig();
  const { brackets, exemptRoles } = cfg.tax;
  const users = loadUsers();

  // วนลูปผู้ใช้ในทุกกิลด์ (สมมุติว่าสมาชิกทุกคนอยู่ในกิลด์เดียว)
  for (const [userId, data] of Object.entries(users)) {
    const member = await client.guilds.cache
      .first()
      .members.fetch(userId)
      .catch(() => null);
    if (!member) continue;

    // ข้ามสมาชิกที่มี Role ยกเว้น
    if (member.roles.cache.some(r => exemptRoles.includes(r.id))) continue;

    const totalMoney = (data.balance || 0) + (data.bank || 0);
    const tax = calculateTax(totalMoney, brackets);
    if (tax <= 0) continue;

    // หักภาษี เพิกเงินจาก balance ก่อน (ถ้า balance ไม่พอ ถอนจาก bank)
    let remain = tax;
    if (data.balance >= remain) {
      data.balance -= remain;
      remain = 0;
    } else {
      remain -= data.balance;
      data.balance = 0;
      data.bank = Math.max(0, data.bank - remain);
    }
  }

  saveUsers(users);
}

module.exports = {
  calculateTax,
  applyMonthlyTax
};
