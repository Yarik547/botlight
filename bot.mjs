import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import crypto from "crypto";
import fs from "fs";
import express from "express";

const BOT_TOKEN = process.env.BOT_TOKEN;
const IMAGE_URL = process.env.IMAGE_URL;
const INTERVAL_SECONDS = Number(process.env.INTERVAL_SECONDS ?? 1800);
const PUBLIC_URL = process.env.PUBLIC_URL; // напр. https://xxxxx.up.railway.app
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // optional
const STATE_FILE = "./state.json";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN in env");
if (!IMAGE_URL) throw new Error("Missing IMAGE_URL in env");
if (!PUBLIC_URL) throw new Error("Missing PUBLIC_URL in env");

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
	return `${p}}`;
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

// handlers (те саме що було)
bot.onText(/\/start/, async (msg) => {
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
	state.chatId = msg.chat.id;
	saveState();
	await sendChart(state.chatId, makeCaption("now_cmd"));
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
		await sendChart(chatId, makeCaption("now_button"));
	}
});

// Express webhook server
const app = express();
app.use(express.json());

const webhookPath = `/webhook/${BOT_TOKEN}`;

// optional: verify secret header
app.post(webhookPath, (req, res) => {
	if (WEBHOOK_SECRET) {
		const header = req.get("X-Telegram-Bot-Api-Secret-Token");
		if (header !== WEBHOOK_SECRET) return res.sendStatus(401);
	}

	bot.processUpdate(req.body);
	res.sendStatus(200);
});

// healthcheck
app.get("/", (req, res) => res.status(200).send("ok"));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, async () => {
	const webhookUrl = `${PUBLIC_URL}${webhookPath}`;

	// setWebhook: Telegram буде слати апдейти сюди [web:492]
	const opts = WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : undefined;
	await bot.setWebHook(webhookUrl, opts);

	console.log("Webhook set to:", webhookUrl);
});

// periodic check
setInterval(() => {
	tick().catch((e) => console.error("tick error:", e));
}, INTERVAL_SECONDS * 1000);
