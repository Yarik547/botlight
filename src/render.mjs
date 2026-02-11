import { createCanvas } from "canvas";

function fmt(mins) {
	const hh = String(Math.floor(mins / 60)).padStart(2, "0");
	const mm = String(mins % 60).padStart(2, "0");
	return `${hh}:${mm}`;
}

function rr(ctx, x, y, w, h, r) {
	if (typeof ctx.roundRect === "function") {
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, r);
		return;
	}
	const rad = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + rad, y);
	ctx.arcTo(x + w, y, x + w, y + h, rad);
	ctx.arcTo(x + w, y + h, x, y + h, rad);
	ctx.arcTo(x, y + h, x, y, rad);
	ctx.arcTo(x, y, x + w, y, rad);
	ctx.closePath();
}

function chunkPairs(pairs) {
	return pairs.map(([a, b]) => `${fmt(a)} по ${fmt(b)}`);
}

function pad2(n) {
	return String(n).padStart(2, "0");
}

function formatKyivNow() {
	// Простий варіант: час сервера (без таймзон). Якщо хочеш саме Europe/Kyiv — скажи, доробимо. [file:815]
	const d = new Date();
	return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(
		d.getMinutes(),
	)}`;
}

export function renderSchedulePng({ schedule }) {
	const cols = 3;
	const rows = 4;

	const pad = 26;
	const gap = 22;
	const cardW = 250;
	const cardH = 220;

	// ДОДАЛИ місце під header/footer
	const headerH = 70;
	const footerH = 40;

	const W = pad * 2 + cols * cardW + (cols - 1) * gap;
	const H = pad * 2 + rows * cardH + (rows - 1) * gap + headerH + footerH;

	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");

	// background
	ctx.fillStyle = "#f3f4f6";
	ctx.fillRect(0, 0, W, H);

	// ===== HEADER =====
	ctx.fillStyle = "#111827";
	ctx.font = "700 26px Arial";
	ctx.fillText("Графік відключень Львів:", pad, pad + 32);

	ctx.fillStyle = "#6b7280";
	ctx.font = "16px Arial";
	ctx.fillText("Групи 1.1–6.2", pad, pad + 56);

	// ===== CARDS =====
	const groups = [
		"1.1",
		"1.2",
		"2.1",
		"2.2",
		"3.1",
		"3.2",
		"4.1",
		"4.2",
		"5.1",
		"5.2",
		"6.1",
		"6.2",
	];

	for (let i = 0; i < groups.length; i++) {
		const g = groups[i];
		const r = Math.floor(i / cols);
		const c = i % cols;

		const x = pad + c * (cardW + gap);
		// ЗСУНУЛИ вниз на headerH
		const y = pad + headerH + r * (cardH + gap);

		// card
		ctx.fillStyle = "#ffffff";
		ctx.strokeStyle = "#e5e7eb";
		ctx.lineWidth = 2;
		rr(ctx, x, y, cardW, cardH, 18);
		ctx.fill();
		ctx.stroke();

		// badge
		const bx = x + 18;
		const by = y + 18;
		const bw = 54;
		const bh = 32;

		ctx.fillStyle = "#f59e0b";
		rr(ctx, bx, by, bw, bh, 12);
		ctx.fill();

		ctx.fillStyle = "#111827";
		ctx.font = "700 24px Arial";
		ctx.fillText(g, bx + 10, by + 25);

		// title
		ctx.fillStyle = "#111827";
		ctx.font = "700 18px Arial";
		ctx.fillText("Електроенергії немає", x + 18, y + 92);

		// times
		const pairs = schedule?.[g] ?? [];
		if (pairs.length > 0) {
			const lines = chunkPairs(pairs);

			ctx.fillStyle = "#111827";
			ctx.font = "600 18px Arial";

			let ty = y + 125;
			for (const line of lines.slice(0, 6)) {
				ctx.fillText(line, x + 18, ty);
				ty += 24;
			}
		} else {
			ctx.fillStyle = "#6b7280";
			ctx.font = "16px Arial";
			ctx.fillText("Немає даних", x + 18, y + 125);
		}
	}

	return canvas.toBuffer("image/png");
}
