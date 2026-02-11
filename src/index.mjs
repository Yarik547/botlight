import { getEnv, getEnvInt } from "./config.mjs";
import { createBot, sendPng } from "./telegram.mjs";
import { getLatestChartImageUrl, downloadPngBuffer } from "./loe_page.mjs";
import { sha256Hex } from "./hash.mjs";

const MODE = (process.env.MODE || "polling").toLowerCase();

if (MODE !== "polling") {
	throw new Error(
		`This project is configured for MODE=polling, got: ${MODE}`,
	);
}

const BOT_TOKEN = getEnv("BOT_TOKEN");
const CHAT_ID = getEnv("CHAT_ID"); // можна string, TG приймає і "-100..."
const IMAGE_PAGE_URL = getEnv("IMAGE_PAGE_URL"); // напр. https://poweron.loe.lviv.ua/ [web:919]
const UPDATE_EVERY_SEC = getEnvInt("UPDATE_EVERY_SEC", {
	required: false,
	fallback: 120,
});

const bot = createBot(BOT_TOKEN);

let lastHash = null;
let running = false;

async function tick() {
	if (running) return;
	running = true;

	try {
		const imgUrl = await getLatestChartImageUrl(IMAGE_PAGE_URL);
		const png = await downloadPngBuffer(imgUrl);

		const h = sha256Hex(png);
		if (h !== lastHash) {
			lastHash = h;
			await sendPng(bot, CHAT_ID, png);
			console.log("[tick] sent update, hash:", h, "url:", imgUrl);
		} else {
			console.log("[tick] no changes");
		}
	} catch (e) {
		console.error("[tick] error:", e?.stack || e);
	} finally {
		running = false;
	}
}

console.log("[boot] polling mode, update every sec:", UPDATE_EVERY_SEC);

await tick();
setInterval(tick, UPDATE_EVERY_SEC * 1000);
