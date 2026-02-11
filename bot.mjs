import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import crypto from "crypto";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
const IMAGE_URL = process.env.IMAGE_URL;
const INTERVAL_SECONDS = Number(process.env.INTERVAL_SECONDS ?? 1800);
const STATE_FILE = "./state.json";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN in env");
if (!IMAGE_URL) throw new Error("Missing IMAGE_URL in env");

const bot = new TelegramBot(BOT_TOKEN, {
	polling: { params: { allowed_updates: ["message", "callback_query"] } },
});

let state = { chatId: null, lastHash: null, lastUpdateId: 0 };

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
			inline_keyboard: [
				[{ text: "Графік зараз", callback_data: "NOW_CHART" }],
			],
		},
	};
}

function pad2(n) {
	return String(n).padStart(2, "0");
}

function makeCaption(kind) {
	const now = new Date();
	const ts = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

	const phrases = [
		"Свіжак під’їхав.",
		"Оновлення з мережі.",
		"Тримаю в курсі.",
		"Актуально на зараз.",
		"Лови графік.",
		"Перевірка пройшла успішно.",
		"Ситуація на зараз.",
		"Пульс мережі тут.",
	];

	const p = phrases[Math.floor(Math.random() * phrases.length)];

	if (kind === "startup") return `🚀 Старт. ${p}\n⏱ ${ts}`;
	if (kind === "now_button") return `📍 На запит. ${p}\n⏱ ${ts}`;
	if (kind === "now_cmd") return `⌨️ /now. ${p}\n⏱ ${ts}`;
	if (kind === "changed") return `🔔 Є зміни. ${p}\n⏱ ${ts}`;
	return `${p}\n⏱ ${ts}`;
}

async function downloadImage(url) {
	const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
	if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

function sha256(buf) {
	return crypto.createHash("sha256").update(buf).digest("hex");
}

async function sendChart(chatId, caption) {
	const img = await downloadImage(IMAGE_URL);
	const h = sha256(img);

	await bot.sendPhoto(
		chatId,
		img,
		{ caption, ...mainKeyboard() },
		{ filename: "chart.png", contentType: "image/png" },
	);

	return h;
}

async function sendCurrentChart(captionKind = "startup") {
	if (!state.chatId) return;
	const h = await sendChart(state.chatId, makeCaption(captionKind));
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
			{ caption: makeCaption("changed"), ...mainKeyboard() },
			{ filename: "chart.png", contentType: "image/png" },
		);
		state.lastHash = h;
		saveState();
	}
}

/**
 * Дедуплікація апдейтів.
 * update_id — це інкрементний id апдейта, і якщо після рестарту/overlap апдейт приїде ще раз,
 * ми просто ігноруємо його (обробляємо тільки якщо він новіший за збережений). [web:154]
 */
function shouldProcessUpdate(update) {
	const uid = update?.update_id;
	if (typeof uid !== "number") return true;

	if (uid <= (state.lastUpdateId ?? 0)) return false;

	state.lastUpdateId = uid;
	saveState();
	return true;
}

bot.on("message", async (msg) => {
	// node-telegram-bot-api передає update_id в msg.update_id
	if (!shouldProcessUpdate(msg)) return;
});

bot.on("callback_query", async (q) => {
	// callback_query теж має update_id
	if (!shouldProcessUpdate(q)) return;

	const chatId = q.message?.chat?.id;
	if (!chatId) return;

	await bot.answerCallbackQuery(q.id).catch(() => {});

	if (q.data === "NOW_CHART") {
		state.chatId = chatId;
		saveState();
		await sendChart(chatId, makeCaption("now_button"));
	}
});

bot.onText(/\/start/, async (msg) => {
	if (!shouldProcessUpdate(msg)) return;

	state.chatId = msg.chat.id;
	saveState();

	await bot.sendMessage(
		state.chatId,
		"Підключено. Надсилаю графік зараз і далі — тільки коли він зміниться.",
		mainKeyboard(),
	);

	await sendCurrentChart("startup");
});

bot.onText(/\/now/, async (msg) => {
	if (!shouldProcessUpdate(msg)) return;

	state.chatId = msg.chat.id;
	saveState();
	await sendChart(state.chatId, makeCaption("now_cmd"));
});

bot.onText(/\/status/, async (msg) => {
	if (!shouldProcessUpdate(msg)) return;

	const chatId = msg.chat.id;
	await bot.sendMessage(
		chatId,
		`chatId: ${state.chatId ?? "не заданий"}\ninterval: ${INTERVAL_SECONDS}s\nurl: ${IMAGE_URL}`,
		mainKeyboard(),
	);
});

// якщо chatId уже є в state.json — одразу шлемо після старту процесу
sendCurrentChart("startup").catch((e) =>
	console.error("startup send error:", e),
);

// періодична перевірка
setInterval(() => {
	tick().catch((e) => console.error("tick error:", e));
}, INTERVAL_SECONDS * 1000);
