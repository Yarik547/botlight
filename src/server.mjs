import express from "express";

export function startWebhookServer({ bot, token, publicUrl, webhookSecret }) {
	const app = express();
	app.use(express.json());

	const webhookPath = `/webhook/${token}`;

	app.post(webhookPath, (req, res) => {
		if (webhookSecret) {
			const header = req.get("X-Telegram-Bot-Api-Secret-Token");
			if (header !== webhookSecret) return res.sendStatus(401);
		}
		bot.processUpdate(req.body);
		res.sendStatus(200);
	});

	app.get("/", (req, res) => res.status(200).send("ok"));

	const port = Number(process.env.PORT ?? 3000);
	app.listen(port, async () => {
		const webhookUrl = `${publicUrl}${webhookPath}`;
		const opts = webhookSecret
			? { secret_token: webhookSecret }
			: undefined;
		await bot.setWebHook(webhookUrl, opts);
		console.log("Webhook set to:", webhookUrl);
	});
}
