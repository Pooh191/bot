const moment = require('moment-timezone');

/**
 * Prize Structure:
 * 1. 1st Prize: 1 award - 100,000 THB
 * 2. 2nd Prize: 2 awards - 50,000 THB
 * 3. 3rd Prize: 5 awards - 30,000 THB
 * 4. 4th Prize: 10 awards - 10,000 THB
 * 5. 5th Prize: 20 awards - 8,000 THB
 * 6. Last 2 digits: 2 awards - 2,000 THB
 * 7. First 2 digits: 2 awards - 2,000 THB
 * 8. Middle 2 digits: 1 award - 3,000 THB
 */

const REWARDS = [
  { name: 'รางวัลที่ 1', amount: 100000, count: 1, type: 'match' },
  { name: 'รางวัลที่ 2', amount: 50000, count: 2, type: 'match' },
  { name: 'รางวัลที่ 3', amount: 30000, count: 5, type: 'match' },
  { name: 'รางวัลที่ 4', amount: 10000, count: 10, type: 'match' },
  { name: 'รางวัลที่ 5', amount: 8000, count: 20, type: 'match' },
  { name: 'รางวัลเลขหน้า 2 ตัว', amount: 2000, count: 2, type: 'first2' },
  { name: 'รางวัลเลขท้าย 2 ตัว', amount: 2000, count: 2, type: 'last2' },
  { name: 'รางวัลเลขกลาง 2 ตัว', amount: 3000, count: 1, type: 'mid2' },
];

function getNextDrawDate() {
  const now = moment().tz('Asia/Bangkok');
  let drawDates = [
    moment().tz('Asia/Bangkok').date(5).hour(18).minute(30).second(0),
    moment().tz('Asia/Bangkok').date(20).hour(18).minute(30).second(0)
  ];

  // Logic for holiday: if day 5 or 20 is weekend/holiday?
  // User said: "ถ้าเป็นวันหยุดราชการให้เลื่อนไป 1 วัน"
  // For simplicity, we just check if it's Saturday/Sunday for now. 
  // Real public holidays would need a list.
  drawDates = drawDates.map(d => {
    while (d.day() === 0 || d.day() === 6) {
      d.add(1, 'day');
    }
    return d;
  });

  // Find the next one
  let next = drawDates.find(d => d.isAfter(now));
  if (!next) {
    // Next month
    next = moment().tz('Asia/Bangkok').add(1, 'month').date(5).hour(18).minute(30).second(0);
    while (next.day() === 0 || next.day() === 6) {
      next.add(1, 'day');
    }
  }
  return next;
}

function checkPrize(ticketNumber, drawResult) {
  // drawResult: { FIRST: ['1234'], SECOND: ['...'], ... }
  let bestPrize = null;

  // 1. Check exact matches
  const matchPrizes = ['รางวัลที่ 1', 'รางวัลที่ 2', 'รางวัลที่ 3', 'รางวัลที่ 4', 'รางวัลที่ 5'];
  for (const pName of matchPrizes) {
    if (drawResult[pName] && drawResult[pName].includes(ticketNumber)) {
      const prizeInfo = REWARDS.find(r => r.name === pName);
      if (!bestPrize || prizeInfo.amount > bestPrize.amount) {
        bestPrize = prizeInfo;
      }
    }
  }

  // 2. Check First 2
  const first2 = ticketNumber.substring(0, 2);
  if (drawResult['รางวัลเลขหน้า 2 ตัว'] && drawResult['รางวัลเลขหน้า 2 ตัว'].includes(first2)) {
    const prizeInfo = REWARDS.find(r => r.name === 'รางวัลเลขหน้า 2 ตัว');
    if (!bestPrize || prizeInfo.amount > bestPrize.amount) {
      bestPrize = prizeInfo;
    }
  }

  // 3. Check Last 2
  const last2 = ticketNumber.substring(2, 4);
  if (drawResult['รางวัลเลขท้าย 2 ตัว'] && drawResult['รางวัลเลขท้าย 2 ตัว'].includes(last2)) {
    const prizeInfo = REWARDS.find(r => r.name === 'รางวัลเลขท้าย 2 ตัว');
    if (!bestPrize || prizeInfo.amount > bestPrize.amount) {
      bestPrize = prizeInfo;
    }
  }

  // 4. Check Mid 2
  const mid2 = ticketNumber.substring(1, 3);
  if (drawResult['รางวัลเลขกลาง 2 ตัว'] && drawResult['รางวัลเลขกลาง 2 ตัว'].includes(mid2)) {
    const prizeInfo = REWARDS.find(r => r.name === 'รางวัลเลขกลาง 2 ตัว');
    if (!bestPrize || prizeInfo.amount > bestPrize.amount) {
      bestPrize = prizeInfo;
    }
  }

  return bestPrize;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // ล้างค่าว่างและเปลี่ยน - เป็น / เพื่อให้ง่ายต่อการแบ่ง
  const cleanStr = dateStr.trim().replace(/-/g, '/');
  let [d, m, y] = cleanStr.split('/');

  // ถ้ากรอกมาแบบ YYYY/MM/DD (แบบเดิม)
  if (d.length === 4) {
    const tempY = d;
    const tempD = y;
    d = tempD;
    y = tempY;
  }

  if (!d || !m || !y) return null;

  let day = parseInt(d);
  let month = parseInt(m);
  let year = parseInt(y);

  // ตรวจสอบปี พ.ศ. (ถ้ามากกว่า 2500 ให้ลบ 543)
  if (year > 2500) {
    year -= 543;
  }

  // สร้าง moment object และคืนค่าเป็น YYYY-MM-DD เพื่อบันทึกลงฐานข้อมูล
  const date = moment(`${year}-${month}-${day}`, 'YYYY-M-D', true);
  return date.isValid() ? date.format('YYYY-MM-DD') : null;
}

module.exports = {
  REWARDS,
  getNextDrawDate,
  checkPrize,
  normalizeDate
};
