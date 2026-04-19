const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function syncLottoToSheet(dataType, data) {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.LOTTO_SHEET_ID;

    if (!serviceAccountEmail || !privateKey || !sheetId) {
      console.warn('⚠️ Google Sheets credentials not configured. Skipping sync.');
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
      sheet = doc.sheetsByTitle['Purchases'] || await doc.addSheet({ title: 'Purchases', headerValues: ['Date', 'User', 'Numbers', 'Status'] });
      await sheet.addRow({
        Date: new Date().toISOString(),
        User: data.username || data.userId,
        Numbers: data.numbers.join(', '),
        Status: 'Purchased'
      });
    } else if (dataType === 'results') {
      sheet = doc.sheetsByTitle['Results'] || await doc.addSheet({ title: 'Results', headerValues: ['DrawDate', 'Award', 'Numbers'] });
      for (const [award, nums] of Object.entries(data.results)) {
        await sheet.addRow({
          DrawDate: data.drawDate,
          Award: award,
          Numbers: nums.join(', ')
        });
      }
    }
  } catch (err) {
    console.error('❌ Google Sheets Sync Error:', err);
  }
}

module.exports = { syncLottoToSheet };
