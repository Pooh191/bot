const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment-timezone');

async function syncLottoToSheet(dataType, data) {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.LOTTO_SHEET_ID;

    if (!serviceAccountEmail || !privateKey || !sheetId) {
      console.warn('⚠️ Google Sheets Sync skipped: missing config in .env');
      return;
    }

    const auth = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();

    let sheet;
    if (dataType === 'purchases') {
      const title = 'Purchases';
      sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        sheet = await doc.addSheet({ title, headerValues: ['Date', 'User', 'Numbers', 'Status'] });
      }
      
      for (const num of data.numbers) {
        await sheet.addRow({
          Date: moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss'),
          User: data.username || data.userId,
          Numbers: num,
          Status: 'Purchased'
        });
      }
      console.log('✅ Synced purchase to Google Sheet successfully');
    } else if (dataType === 'results') {
      const title = 'Results';
      sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        sheet = await doc.addSheet({ title, headerValues: ['DrawDate', 'Award', 'Numbers'] });
      }

      for (const [award, nums] of Object.entries(data.results)) {
        await sheet.addRow({
          DrawDate: data.drawDate,
          Award: award,
          Numbers: nums.join(', ')
        });
      }
      console.log('✅ Synced draw result to Google Sheet successfully');
    }
  } catch (err) {
    if (err.message.includes('403')) {
      console.error('❌ Google Sheets Error: บอทไม่มีสิทธิ์เข้าถึง (ลืมแชร์ชีทให้บอทหรือเปล่า?)');
    } else if (err.message.includes('404')) {
      console.error('❌ Google Sheets Error: ไม่พบ Sheet ID ที่ระบุใน .env');
    } else {
      console.error('❌ Google Sheets Sync Error:', err.message);
    }
  }
}

module.exports = { syncLottoToSheet };
