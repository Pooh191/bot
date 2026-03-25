const { loadResources, saveResources } = require('./userUtils');

// สุ่มค่าทรัพยากร (เพิ่มหรือลด 1-5 หน่วยต่อทรัพยากรในแต่ละจังหวัด)
function randomizeResources() {
  const resources = loadResources();

  for (const province in resources) {
    const res = resources[province];
    for (const key in res) {
      // ให้เพิ่มหรือลดแบบสุ่ม 1–5 หน่วย
      const change = Math.floor(Math.random() * 5) + 1;
      const upOrDown = Math.random() < 0.5 ? -1 : 1;

      res[key] = Math.max(0, res[key] + change * upOrDown); // ป้องกันค่าติดลบ
    }
  }

  saveResources(resources);
  console.log('✅ Resources randomized for today');
}

// ตรวจสอบว่า CO2 ในจังหวัดไหนเกิน 30 บ้าง
function checkOxygenCO2Alert() {
  const resources = loadResources();
  const alertProvinces = [];

  for (const province in resources) {
    const co2 = resources[province].co2 || 0;
    if (co2 > 30) {
      alertProvinces.push(`${province} (${co2})`);
    }
  }

  return alertProvinces.length > 0 ? alertProvinces.join(', ') : null;
}

module.exports = {
  randomizeResources,
  checkOxygenCO2Alert
};
