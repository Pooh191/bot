module.exports = {
  validateName: (name) => {
    // ตรวจสอบคำนำหน้า
    const allowedTitles = ['นาย', 'นาง', 'นางสาว'];
    const firstWord = name.split(' ')[0];
    if (!allowedTitles.includes(firstWord)) {
      return { valid: false, reason: 'ต้องใช้คำนำหน้า นาย, นาง หรือ นางสาว' };
    }

    // ตรวจสอบชื่อกลาง
    if (name.split(' ').length > 2) {
      return { valid: false, reason: 'ห้ามมีชื่อกลาง' };
    }

    // ตรวจสอบ ณ
    if (name.includes('ณ ')) {
      return { valid: false, reason: 'ห้ามมี ณ ต่างๆ' };
    }

    return { valid: true };
  }
};