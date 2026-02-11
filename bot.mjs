import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import crypto from "crypto";
import fs from "fs";
import express from "express";

const BOT_TOKEN = process.env.BOT_TOKEN;
const IMAGE_URL = process.env.IMAGE_URL;
const PUBLIC_URL = process.env.PUBLIC_URL; // https://xxxxx.up.railway.app
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // optional
const INTERVAL_SECONDS = Number(process.env.INTERVAL_SECONDS ?? 1800);
const BOT_USERNAME = process.env.BOT_USERNAME ?? "LightWatcherBot";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN in env");
if (!IMAGE_URL) throw new Error("Missing IMAGE_URL in env");
if (!PUBLIC_URL) throw new Error("Missing PUBLIC_URL in env");

const STATE_FILE = "./state.json";
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

let state = { chatId: null, lastHash: null };

if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {}
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function mainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "Графік зараз", callback_data: "NOW_CHART" }]],
    },
  };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeCaption(kind) {
  const startup = [
    "Стартую. Підключився і вже перевіряю графік.",
    "Запустився. Зараз надішлю актуальний графік.",
    "Готово. Я на звʼязку і тримаю графік під контролем.",
    "Працюю. Відстежую зміни і попереджу вчасно.",
    "Запуск успішний. Перша перевірка вже йде.",
    "На місці. Зараз покажу поточний графік.",
    "Підключено. Далі надсилатиму лише коли буде зміна.",
    "Запустив моніторинг. Якщо графік оновиться я напишу.",
    "Я тут. Збираю оновлення і надсилаю графік.",
    "Усе готово. Починаю стежити за графіком світла.",
  ];

  const now_button = [
    "На запит. Ось поточний графік.",
    "Оновив вручну. Тримай актуальний графік.",
    "Запит прийнято. Показую що є зараз.",
    "Перевірив прямо зараз. Ось результат.",
    "Ось графік на цей момент.",
    "Швидка перевірка готова. Лови графік.",
    "Оновлення по кнопці. Надсилаю.",
    "Поточний стан отримано. Дивись графік.",
    "Зробив запит. Повертаю актуальний графік.",
    "Готово. Графік на зараз у повідомленні.",
  ];

  const now_cmd = [
    "Команда /now. Показую графік.",
    "Отримав /now. Надсилаю актуальний графік.",
    "Запит через /now виконано. Лови.",
    "Оновив по команді. Ось графік.",
    "По /now перевірив. Дивись.",
    "Команда прийнята. Надсилаю поточний стан.",
    "Ось графік за запитом /now.",
    "Перевірка по /now готова. Відправляю.",
    "Виконую /now. Ось що актуально.",
    "Гаразд. Оновлення по /now вже тут.",
  ];

  const changed = [
    "Є зміни. Графік оновився.",
    "Оновлення. Зʼявився новий графік.",
    "Зміна зафіксована. Надсилаю свіжу версію.",
    "Графік змінився. Ось актуальні дані.",
    "Піймав оновлення. Дивись новий графік.",
    "Щойно оновили. Надсилаю графік.",
    "Новий стан. Перевір актуальний графік.",
    "Є апдейт. Надсилаю свіжий графік світла.",
    "Зміни підтверджено. Ось оновлений графік.",
    "Оновлено. Актуальна картинка вже тут.",
  ];

  const shareLine = `🔗 <a href="${shareUrl}">Поширити бота</a>`;

  let head;
  if (kind === "startup") head = "🚀 " + pick(startup);
  else if (kind === "now_button") head = "📍 " + pick(now_button);
  else if (kind === "now_cmd") head = "⌨️ " + pick(now_cmd);
  else if (kind === "changed") head = "🔔 " + pick(changed);
  else head = pick(changed);

  return `${head}\n\n${shareLine}`;
}

async function downloadImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function sendChart(chatId, captionKind) {
  const img = await downloadImage(IMAGE_URL);
  const h = sha256(img);

  await bot.sendPhoto(
    chatId,
    img,
    {
      caption: makeCaption(captionKind),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...mainKeyboard(),
    },
    { filename: "chart.png", contentType: "image/png" },
  );

  return h;
}

async function sendCurrentChart(captionKind = "startup") {
  if (!state.chatId) return;
  const h = await sendChart(state.chatId, captionKind);
  state.lastHash = h;
  saveState();
}

async function tick() {
  if (!state.chatId) return;

  const img = await downloadImage(IMAGE_URL);
  const h = sha256(img);

  if (h !== state.lastHash) {
    await bot.sendPhoto(
      state.chatId,
      img,
      {
        caption: makeCaption("changed"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...mainKeyboard(),
      },
      { filename: "chart.png", contentType: "image/png" },
    );

    state.lastHash = h;
    saveState();
  }
}

// Commands
bot.onText(/\/start/, async (msg) => {
  state.chatId = msg.chat.id;
  saveState();

  await bot.sendMessage(
    state.chatId,
    `Підключено ✅\nНадсилаю графік зараз і далі — тільки коли він зміниться.\n\nБот: https://t.me/${BOT_USERNAME}`,
    { disable_web_page_preview: true, ...mainKeyboard() },
  );

  await sendCurrentChart("startup");
});

bot.onText(/\/now/, async (msg) => {
  state.chatId = msg.chat.id;
  saveState();
  await sendChart(state.chatId, "now_cmd");
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `chatId: ${state.chatId ?? "не заданий"}\ninterval: ${INTERVAL_SECONDS}s\nurl: ${IMAGE_URL}`,
    mainKeyboard(),
  );
});

bot.on("callback_query", async (q) => {
  const chatId = q.message?.chat?.id;
  if (!chatId) return;

  await bot.answerCallbackQuery(q.id).catch(() => {});

  if (q.data === "NOW_CHART") {
    state.chatId = chatId;
    saveState();
    await sendChart(chatId, "now_button");
  }
});

// Webhook server (Express)
const app = express();
app.use(express.json());

const webhookPath = `/webhook/${BOT_TOKEN}`;

app.post(webhookPath, (req, res) => {
  if (WEBHOOK_SECRET) {
    const header = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (header !== WEBHOOK_SECRET) return res.sendStatus(401);
  }
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => res.status(200).send("ok"));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, async () => {
  const webhookUrl = `${PUBLIC_URL}${webhookPath}`;
  const opts = WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : undefined;

  await bot.setWebHook(webhookUrl, opts);
  console.log("Webhook set to:", webhookUrl);
});

// periodic check
setInterval(() => {
  tick().catch((e) => console.error("tick error:", e));
}, INTERVAL_SECONDS * 1000);
