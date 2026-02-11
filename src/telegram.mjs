import TelegramBot from "node-telegram-bot-api";

export function createBot(token) {
	return new TelegramBot(token, { polling: true });
}

export async function sendPng(bot, chatId, pngBuffer, caption = undefined) {
	await bot.sendPhoto(chatId, pngBuffer, caption ? { caption } : undefined);
}
