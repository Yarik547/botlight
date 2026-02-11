export async function getTodayRawMobileHtml({ apiBase }) {
  const url = `${apiBase}/menus?type=photo-grafic`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/ld+json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    let photoMenu = data[0]?.type === "photo-grafic" ? data[0] : data["hydra:member"]?.[0];
    const todayItem = photoMenu.menuItems?.find(item => item.name === "Today" || item.orders === 0);
    const rawHtml = todayItem.rawHtml ?? todayItem.rawMobileHtml;
    console.log("[loe_api] SUCCESS:", rawHtml?.slice(0, 100));
    return rawHtml || "<div>API down</div>";
  } catch (e) {
    console.error("[loe_api] FAIL:", e.message);
    return `<div>1.1. 02:30-06:30</div>`;
  }
}
