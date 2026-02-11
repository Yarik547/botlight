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

const shareUrl =
  "https://t.me/share/url?url=" +
  encodeURIComponent(`https://t.me/${BOT_USERNAME}`) +
  "&text=" +
  encodeURIComponent("Графік світла та сповіщення — LightWatcher");

function makeCaption(kind) {
  const phrases = [
    "Свіжак під’їхав.",
    "Оновлення з мережі.",
    "Тримаю в курсі.",
    "Актуально на зараз.",
    "Лови графік.",
    "Ситуація на зараз.",
  ];
  const p = phrases[Math.floor(Math.random() * phrases.length)];

  let head = p;
  if (kind === "startup") head = `🚀 Старт. ${p}`;
  else if (kind === "now_button") head = `📍 На запит. ${p}`;
  else if (kind === "now_cmd") head = `⌨️ /now. ${p}`;
  else if (kind === "changed") head = `🔔 Є зміни. ${p}`;

  return `<b>Графік світла</b>\n${line1}\n\n<a href="${shareUrl}">Поширити LightWatcher</a>`;

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
