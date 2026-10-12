const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Database yeroo gabaabaa
const userSessions = {}; 
const pendingUsers = {}; 
const verifiedUsers = {}; 

// Simple & Reliable Email Checker
function isValidEmail(email) {
  return email && email.includes('@') && email.includes('.');
}

// 1. Webhook - Telegram Bot Messages
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: 'Baga nagaan dhufte gara Apex Forex Assistant Bot! 📈\n\nApp Apex Forex irratti akka galmaa\'uu dandeessuuf, maaloo Email kee inni sirrii ta\'e naaf ergi:'
      });
    } else if (isValidEmail(text)) {
      const email = text.toLowerCase();
      userSessions[chatId] = email;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `✅ Email kee (${email}) milkaa'inaan galmeeffameera!\n\nAmma gara App keenyaa deemuun Register tuquudhaan OTP ergafadhu.`
      });
    } else {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: '⚠️ Maaloo Email sirrii ta\'e galchaa (fkn: example@gmail.com).'
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling Telegram Webhook:', error.message);
    res.sendStatus(200);
  }
});

// Set Webhook Endpoint
app.get('/set-webhook', async (req, res) => {
  try {
    const serverUrl = `https://${req.get('host')}`;
    const webhookUrl = `${serverUrl}/bot${BOT_TOKEN}`;
    const response = await axios.get(`${TELEGRAM_API}/setWebhook?url=${webhookUrl}`);
    res.json({ success: true, message: 'Webhook set successfully', data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. API - Register & Generate OTP
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email fi Password galchuu qabda!' });
  }

  const cleanEmail = email.trim().toLowerCase();

  let targetChatId = null;
  for (const [chatId, userEmail] of Object.entries(userSessions)) {
    if (userEmail === cleanEmail) {
      targetChatId = chatId;
      break;
    }
  }

  if (!targetChatId) {
    return res.status(400).json({
      success: false,
      message: 'Madaala Telegram: Dura Telegram Bot keenya (@apex_forex_assistant_bot) irratti /start jedhii Email kee ergi!'
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  pendingUsers[cleanEmail] = { password, otp, chatId: targetChatId };

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: targetChatId,
      text: `🔑 Lakkoofsi OTP kee Apex Forex App: ${otp}\n\nLakkoofsa kana eenyuufuu hin qoodin!`
    });

    res.json({ success: true, message: "OTPn Telegram Bot keetiin siif ergameera!" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'OTP erguu irratti rakkoon uumame.' });
  }
});

// 3. API - Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  const pendingUser = pendingUsers[cleanEmail];

  if (!pendingUser) {
    return res.status(400).json({ success: false, message: 'Koodiin OTP hin argamne ykn yeroseen darbeera.' });
  }

  if (pendingUser.otp === otp) {
    verifiedUsers[cleanEmail] = pendingUser.password;
    delete pendingUsers[cleanEmail];
    return res.json({ success: true, message: "Galmeen kee milkaa'inaan xumurameera!" });
  } else {
    return res.status(400).json({ success: false, message: 'Koodiin OTP galchite sirrii miti!' });
  }
});

app.get('/', (req, res) => {
  res.send('Apex Forex Backend Server is Running Live!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
