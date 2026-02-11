import { getEnv, getEnvInt } from "./config.mjs";
import { createBot, sendPng } from "./telegram.mjs";
import { getLatestChartImageUrl, downloadPngBuffer } from "./loe_page.mjs";

const MODE = (process.env.MODE || "polling").toLowerCase();
if (MODE !== "polling") throw new Error(`This project is configured for MODE=polling, got: ${MODE}`);

const BOT_TOKEN = getEnv("BOT_TOKEN");
const IMAGE_PAGE_URL = getEnv("IMAGE_PAGE_URL"); // напр. https://poweron.loe.lviv.ua/ [web:919]
const COOLDOWN_SEC = getEnvInt("COOLDOWN_SEC", { required: false, fallback: 30 });

const bot = createBot(BOT_TOKEN);

let lastRequestAt = 0;
let cached = { ts: 0, png: null, url: null };
const CACHE_TTL_MS = 60 * 1000;

async function getChartPngCached() {
  const now = Date.now();
  if (cached.png && now - cached.ts < CACHE_TTL_MS) return cached;

  const url = await getLatestChartImageUrl(IMAGE_PAGE_URL);
  const png = await downloadPngBuffer(url);

  cached = { ts: now, png, url };
  return cached;
}

async function handleNow(chatId) {
  const now = Date.now();
  if (now - lastRequestAt < COOLDOWN_SEC * 1000) {
    const wait = Math.ceil((COOLDOWN_SEC * 1000 - (now - lastRequestAt)) / 1000);
    await bot.sendMessage(chatId, `Зачекай ${wait}с і спробуй ще раз.`);
    return;
  }
  lastRequestAt = now;

  const { png, url } = await getChartPngCached();
  await sendPng(bot, chatId, png, `Графік (джерело: ${url})`);
}

bot.onText(/^\/start$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Напиши /now — я надішлю актуальний графік."
  );
});

bot.onText(/^\/now$/, async (msg) => {
  try {
    await handleNow(msg.chat.id);
  } catch (e) {
    console.error("[/now] error:", e?.stack || e);
    await bot.sendMessage(msg.chat.id, "Не вдалось отримати графік. Спробуй пізніше.");
  }
});

// fallback: якщо людина просто написала "now"
bot.on("message", async (msg) => {
  if (typeof msg.text !== "string") return;
  if (msg.text.trim().toLowerCase() === "now") {
    try {
      await handleNow(msg.chat.id);
    } catch {
      await bot.sendMessage(msg.chat.id, "Не вдалось отримати графік. Спробуй пізніше.");
    }
  }
});

console.log("[boot] ready. Commands: /start, /now");
