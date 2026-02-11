import "dotenv/config";

export const MODE = process.env.MODE ?? "webhook";
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const BOT_USERNAME = process.env.BOT_USERNAME ?? "LightWatcherBot";
export const API_BASE = process.env.APIBASE ?? "https://api.loe.lviv.ua/api";  // ФІКС: APIBASE
export const INTERVAL_SECONDS = Number(process.env.INTERVAL_SECONDS ?? 1800);
export const PUBLIC_URL = process.env.PUBLIC_URL;
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (MODE === "webhook" && !PUBLIC_URL) throw new Error("Missing PUBLIC_URL");