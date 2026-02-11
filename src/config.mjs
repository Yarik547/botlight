import "dotenv/config";

export const MODE = process.env.MODE ?? "webhook"; // polling | webhook

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const BOT_USERNAME = process.env.BOT_USERNAME ?? "LightWatcherBot";

export const API_BASE = process.env.API_BASE ?? "https://api.loe.lviv.ua/api";
export const INTERVAL_SECONDS = Number(process.env.INTERVAL_SECONDS ?? 1800);

export const PUBLIC_URL = process.env.PUBLIC_URL; // тільки для webhook
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // optional

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN in env");
if (MODE === "webhook" && !PUBLIC_URL)
	throw new Error("Missing PUBLIC_URL in env");
