function hhmmToMinutes(hhmm) {
	const [hh, mm] = hhmm.split(":").map(Number);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 24 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

export function parseScheduleFromRawMobileHtml(rawMobileHtml) {
	const html = String(rawMobileHtml || "");
	const text = html.replace(/<[^>]*>/g, "\n");

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
	const out = Object.fromEntries(groups.map((g) => [g, []]));

	// Рядки вигляду:
	// "Група 1.1. Електроенергії немає з 02:30 до 06:30, з 09:30 до 16:30, з 20:00 до 24:00."
	for (const lineRaw of text.split("\n")) {
		const line = lineRaw.replace(/\s+/g, " ").trim();
		if (!line) continue;

		const mGroup = line.match(/Група\s+([1-6]\.[1-2])\./);
		if (!mGroup) continue;

		const g = mGroup[1];
		if (!out[g]) continue;

		const pairs = [];
		const re = /з\s*(\d{2}:\d{2})\s*до\s*(\d{2}:\d{2})/g;
		let mm;
		while ((mm = re.exec(line))) {
			const a = hhmmToMinutes(mm[1]);
			const b = hhmmToMinutes(mm[2]);
			if (a == null || b == null) continue;
			pairs.push([a, b]);
		}

		out[g] = pairs;
	}

	return out;
}
