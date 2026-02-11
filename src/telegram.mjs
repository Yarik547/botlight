import TelegramBot from "node-telegram-bot-api";
import crypto from "crypto";

export function createBot({ token, mode }) {
	return new TelegramBot(token, { polling: mode === "polling" });
}

export function mainKeyboard() {
	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: "Графік зараз", callback_data: "NOW_CHART" }],
			],
		},
	};
}

export function makeShareUrl(botUsername) {
	return (
		"https://t.me/share/url?url=" +
		encodeURIComponent(`https://t.me/${botUsername}`) +
		"&text=" +
		encodeURIComponent("Графік світла та сповіщення — LightWatcher")
	);
}

export function makeCaption(kind, shareUrl) {
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

	return `${head}\n\n🔗 <a href="${shareUrl}">Поширити бота</a>`;
}

export function bust(u) {
	return u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
}

export async function downloadImage(url) {
	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0",
			Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
			"Cache-Control": "no-cache",
			Pragma: "no-cache",
		},
		redirect: "follow",
	});
	if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

export function sha256(buf) {
	return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function sendPhoto(bot, chatId, img, caption, keyboard) {
	await bot.sendPhoto(
		chatId,
		img,
		{
			caption,
			parse_mode: "HTML",
			disable_web_page_preview: true,
			...keyboard,
		},
		{ filename: "chart.png", contentType: "image/png" },
	);
}
