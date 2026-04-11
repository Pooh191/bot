const fs = require('fs');
const path = require('path');

const usersPath = 'd:/bot-kingdom/data/users.json';
const logsPath = 'd:/bot-kingdom/data/history_logs.json';

function restoreBalances() {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));

    console.log('Starting restoration process...');

    // ลำดับ Logs จากเก่าไปใหม่ (เพื่อให้ค่าล่าสุดชนะ)
    const reversedLogs = [...logs].reverse();

    reversedLogs.forEach(entry => {
        const desc = entry.description;
        if (!desc) return;

        // 1. หาจาก Log ฝากเงิน/ถอนเงิน
        // Example: **ผู้ทำรายการ:** <@967991106228858990> | **ฝากเข้าแบงค์:** 5,000 บาท | **ยอดเงินสดเหลือ:** 5,873 บาท | **ยอดเงินในแบงค์:** 10,000 บาท
        const depositMatch = desc.match(/\*\*ผู้ทำรายการ:\*\* <@(\d+)>(?:.*)\*\*ยอดเงินสดเหลือ:\*\* ([\d,]+) บาท \| \*\*ยอดเงินในแบงค์:\*\* ([\d,]+) บาท/);
        if (depositMatch) {
            const id = depositMatch[1];
            const cash = parseInt(depositMatch[2].replace(/,/g, ''));
            const bank = parseInt(depositMatch[3].replace(/,/g, ''));
            if (users[id]) {
                users[id].balance = Math.max(users[id].balance || 0, cash);
                users[id].bank = Math.max(users[id].bank || 0, bank);
            }
        }

        // 2. หาจาก Log คำสั่งทำงาน (ที่บอกยอดเงินสดใหม่)
        // Example: **คนงาน:** <@1414229227095461898> | **สิ่งที่ได้:** +1,770 บาท | **ยอดเงินสดใหม่:** 2,150 บาท
        const earnMatch = desc.match(/\*\*(?:คนงาน|ผู้รับ|ผู้ต้องสงสัย):\*\* <@(\d+)>(?:.*)\*\*ยอดเงินสด(?:ใหม่|ที่มีตอนนี้):\*\* ([\d,]+) บาท/);
        if (earnMatch) {
            const id = earnMatch[1];
            const cash = parseInt(earnMatch[2].replace(/,/g, ''));
            if (users[id]) {
                users[id].balance = Math.max(users[id].balance || 0, cash);
            }
        }
        
        // 3. หาจาก Log ภาษี (ที่มียอดเงินรวม)
        // Example: • <@USER_ID>: **150,000** บาท (อัตรา 25%)
        const taxMatch = desc.match(/• <@(\d+)>: \*\*([\d,]+)\*\* บาท/g);
        if (taxMatch) {
            taxMatch.forEach(m => {
                const subMatch = m.match(/<@(\d+)>: \*\*([\d,]+)\*\*/);
                if (subMatch) {
                    const id = subMatch[1];
                    const total = parseInt(subMatch[2].replace(/,/g, ''));
                    if (users[id]) {
                        // ถ้าเงินรวมหายไปเยอะ ให้คืนเข้าธนาคารไปก่อนส่วนหนึ่ง
                        const currentTotal = (users[id].balance || 0) + (users[id].bank || 0);
                        if (total > currentTotal) {
                            users[id].bank = total - (users[id].balance || 0);
                        }
                    }
                }
            });
        }
    });

    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    console.log('Restoration complete! Check users.json.');
}

restoreBalances();
