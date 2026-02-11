function ensureNoTrailingSlash(s) {
	return s.endsWith("/") ? s.slice(0, -1) : s;
}

function absUrl(base, rel) {
	return new URL(rel, base).toString();
}

export async function getLatestChartImageUrl(imagePageUrl) {
	const pageUrl = ensureNoTrailingSlash(imagePageUrl);

	const res = await fetch(pageUrl, {
		headers: {
			Accept: "text/html,application/xhtml+xml",
			"User-Agent": "Mozilla/5.0 (compatible; loe-bot/1.0)",
		},
	});

	if (!res.ok) {
		throw new Error(
			`IMAGE_PAGE_URL error: ${res.status} ${res.statusText}`,
		);
	}

	const html = await res.text();

	// В дампі у тебе такі шляхи: /media/...GPV-mobile.png [file:815]
	const re = /\/media\/[a-zA-Z0-9._-]*GPV-mobile\.png/g;
	const matches = html.match(re) ?? [];

	if (matches.length === 0) {
		throw new Error("Could not find GPV-mobile.png in page HTML");
	}

	const rel = matches[matches.length - 1];
	return absUrl(pageUrl, rel);
}

export async function downloadPngBuffer(url) {
	const res = await fetch(url, {
		headers: { Accept: "image/png,*/*" },
	});
	if (!res.ok)
		throw new Error(`PNG download error: ${res.status} ${res.statusText}`);

	const arr = await res.arrayBuffer();
	return Buffer.from(arr);
}
