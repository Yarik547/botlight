const DEFAULT_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	Accept: "application/ld+json, application/json;q=0.9, */*;q=0.8",
};

async function fetchJson(url) {
	const res = await fetch(url, {
		headers: DEFAULT_HEADERS,
		redirect: "follow",
	});
	if (!res.ok) throw new Error(`API failed ${res.status} for ${url}`);
	return await res.json();
}

export async function getTodayRawMobileHtml({ apiBase }) {
	const url = `${apiBase}/menus?type=photo-grafic`;
	const data = await fetchJson(url);

	const items = data?.["hydra:member"];
	if (!Array.isArray(items) || items.length === 0) {
		throw new Error("No hydra:member in photo-grafic response");
	}

	const menu = items[0];
	const menuItems = menu?.menuItems;
	if (!Array.isArray(menuItems) || menuItems.length === 0) {
		throw new Error("No menuItems in photo-grafic menu");
	}

	const today =
		menuItems.find((x) => (x?.name ?? "").toLowerCase() === "today") ??
		menuItems[0];
	const html = today?.rawMobileHtml || today?.rawHtml;

	if (!html) throw new Error("No rawMobileHtml/rawHtml in Today menuItem");
	return html;
}
