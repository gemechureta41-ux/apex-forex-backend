const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Telegram Bot Token Environment Variable irraa fudhama ykn kallattiidhaan taa'a
const BOT_TOKEN = process.env.BOT_TOKEN || '8961524303:AAHhrvbJQsegAdqtGy6AeuPZZb4Z-QM8aUQ';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const registeredUsers = {}; // { email: chatId }
const otpStore = {};        // { email: { otp: "1234", expiresAt: timestamp } }
const userCredentials = {}; // { email: password }

// Bot Commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Baga nagaan dhufte gara Apex Forex Assistant Bot! 📈\n\nApp Apex Forex irratti akka galmaa'uu dandeessuuf, maaloo Email kee inni sirrii ta'e naaf ergi:`
  );
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim().toLowerCase() : '';

  if (text.startsWith('/start')) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
  if (emailRegex.test(text)) {
    registeredUsers[text] = chatId;
    bot.sendMessage(
      chatId,
      `✅ Email **${text}** milkaa'inaan galmeeffameera!\n\nAmmass app Apex Forex irratti email kanaan register gochuu dandeessa.`
    );
  } else {
    bot.sendMessage(chatId, `⚠️ Maaloo Email sirrii ta'e galchaa (fkn: example@gmail.com).`);
  }
});

// API Routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  if (!registeredUsers[cleanEmail]) {
    return res.status(400).json({
      success: false,
      message: 'Email kun bot telegram irratti hin galmeeffamne! Dura Telegram Bot (@apex_forex_assistant_bot) irratti email kee galmeessi.'
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[cleanEmail] = {
    otp: otp,
    password: password,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  const chatId = registeredUsers[cleanEmail];
  try {
    await bot.sendMessage(
      chatId,
      `🔑 **Apex Forex Verification Code:**\n\nCode kee: **${otp}**\n\nCode kun daqiiqaa 5 qofaaf hojjeta.`
    );
    return res.json({ success: true, message: 'Verification Code (OTP) gara Telegram Bot keetiitti ergameera!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'OTP erguu irratti dogoggorri uumameera.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  const record = otpStore[cleanEmail];

  if (!record) return res.status(400).json({ success: false, message: 'OTP hin fundhamne ykn expire ta\'eera.' });

  if (record.otp === otp) {
    userCredentials[cleanEmail] = record.password;
    delete otpStore[cleanEmail];
    return res.json({ success: true, message: 'Galmeen kee milkaa\'inaan xumurameera!' });
  } else {
    return res.status(400).json({ success: false, message: 'OTP galchite sirrii miti!' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  if (userCredentials[cleanEmail] && userCredentials[cleanEmail] === password) {
    return res.json({ success: true, message: 'Login Successful!' });
  } else {
    return res.status(400).json({ success: false, message: 'Email ykn Password dogoggora!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Apex Forex PORT ${PORT} irratti jalqabeera...`));
