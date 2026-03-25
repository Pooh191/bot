module.exports = (client) => {
    client.once('ready', () => {
      console.log(`✅ ${client.user.tag} ได้เข้าสู่ระบบ พรัอมที่จะทำงานแล้ว`);
    });
  };
  