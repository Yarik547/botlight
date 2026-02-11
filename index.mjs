import {
	MODE,
	BOT_TOKEN,
	BOT_USERNAME,
	API_BASE,
	PUBLIC_URL,
	WEBHOOK_SECRET,
	INTERVAL_SECONDS,
} from "./src/config.mjs";

import { loadState, saveState } from "./src/state.mjs";
import { getTodayRawMobileHtml } from "./src/loe_api.mjs";
import { parseScheduleFromRawMobileHtml } from "./src/parser.mjs";
import { renderSchedulePng } from "./src/render.mjs";

import {
	createBot,
	mainKeyboard,
	makeShareUrl,
	makeCaption,
	sha256,
	sendPhoto,
} from "./src/telegram.mjs";

const state = loadState();
const keyboard = mainKeyboard();
const shareUrl = makeShareUrl(BOT_USERNAME);

const bot = createBot({ token: BOT_TOKEN, mode: MODE });

if (MODE === "polling") {
	await bot.deleteWebHook().catch(() => {});
}

async function buildLatestImageBuffer() {
	const raw = await getTodayRawMobileHtml({ apiBase: API_BASE });

	const preview = String(raw).slice(0, 250);
	console.log("[dbg] raw preview:", preview);
	console.log("[dbg] has '1.1.':", String(raw).includes("1.1."));
	console.log("[dbg] has '003C':", String(raw).includes("003C"));

	const schedule = parseScheduleFromRawMobileHtml(raw);

	console.log("[dbg] 1.1 pairs:", schedule["1.1"]);
	console.log("[dbg] 6.2 pairs:", schedule["6.2"]);

	return renderSchedulePng({ schedule });
}

async function sendLatestChart(chatId, kind) {
	const img = await buildLatestImageBuffer();
	const h = sha256(img);

	await sendPhoto(bot, chatId, img, makeCaption(kind, shareUrl), keyboard);

	console.log("[send]", kind, "hash:", h);
	return h;
}

// handlers
bot.onText(/\/start/, async (msg) => {
	state.chatId = msg.chat.id;
	saveState(state);

	await bot.sendMessage(
		state.chatId,
		"Підключено ✅\nНадсилаю графік зараз і далі тільки коли він зміниться.",
		keyboard,
	);

	state.lastHash = await sendLatestChart(state.chatId, "startup");
	saveState(state);
});

bot.onText(/\/now/, async (msg) => {
	state.chatId = msg.chat.id;
	saveState(state);

	state.lastHash = await sendLatestChart(state.chatId, "now_cmd");
	saveState(state);
});

bot.on("callback_query", async (q) => {
	const chatId = q.message?.chat?.id;
	if (!chatId) return;

	await bot.answerCallbackQuery(q.id).catch(() => {});

	if (q.data === "NOW_CHART") {
		state.chatId = chatId;
		saveState(state);

		state.lastHash = await sendLatestChart(chatId, "now_button");
		saveState(state);
	}
});

if (MODE === "webhook") {
	startWebhookServer({
		bot,
		token: BOT_TOKEN,
		publicUrl: PUBLIC_URL,
		webhookSecret: WEBHOOK_SECRET,
	});
}

async function tick() {
	if (!state.chatId) return;

	const img = await buildLatestImageBuffer();
	const h = sha256(img);

	if (h !== state.lastHash) {
		await sendPhoto(
			bot,
			state.chatId,
			img,
			makeCaption("changed", shareUrl),
			keyboard,
		);
		console.log("[tick] changed. new hash:", h, "old:", state.lastHash);

		state.lastHash = h;
		saveState(state);
	}
}

setInterval(() => {
	tick().catch((e) => console.error("tick error:", e));
}, INTERVAL_SECONDS * 1000);
