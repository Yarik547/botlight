import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';

export function createBot({ token, mode }) {
  return new TelegramBot(token, { polling: mode === 'polling' });
}

export function mainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[
        { text: '📊 Графік зараз', callback_data: 'NOW_CHART' }
      ]]
    }
  };
}

export function makeShareUrl(botUsername) {
  return `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUsername}`)}&text=${encodeURIComponent('LightWatcher')}`;
}

export function makeCaption(kind, shareUrl) {
  const phrases = [
    'Оновлений графік відключень ⚡',
    'Свіжий графік по групах 1.1-6.2',
    'Чому немає світла? Дивись графіку!'
  ];
  const p = phrases[Math.floor(Math.random() * phrases.length)];
  let head = p;
  if (kind === 'startup') head = `👋 Підключено! ${p}`;
  else if (kind === 'now_button') head = `📱 По кнопці: ${p}`;
  else if (kind === 'changed') head = `🆕 ЗМІНИЛОСЯ! ${p}`;
  return `${head}<br><a href="${shareUrl}">Поділитись</a>`;
}

export function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function sendPhoto(bot, chatId, img, caption, keyboard) {
  await bot.sendPhoto(chatId, img, {
    caption,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  }, {
    filename: 'chart.png',
    contentType: 'image/png'  // ✅ ФІКС DEPRECATION WARNING!
  });
  // keyboard не потрібен для photo, тільки message
}
