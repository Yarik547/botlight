export async function getTodayRawMobileHtml({ apiBase }) {
  const url = `${apiBase}/menus?type=photo-grafic`;  // ФІКС: /menus
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/ld+json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    console.log("[loe_api] keys:", Object.keys(data));
    const members = data["hydra:member"] ?? data.member;
    if (!Array.isArray(members) || !members.length) 
      throw new Error("No menus");
    const photoMenu = members.find(m => m.type === "photo-grafic");
    if (!photoMenu) throw new Error("No photo-grafic");
    const todayItem = photoMenu.menuItems?.find(item => item.name === "Today" || item.orders === 0);
    if (!todayItem) throw new Error("No Today");
    const rawMobile = todayItem.rawMobileHtml ?? todayItem.rawHtml;
    if (!rawMobile) throw new Error("No rawHtml");
    console.log("[loe_api] raw len:", rawMobile.length);
    return rawMobile;
  } catch (e) {
    console.error("[loe_api] FAIL:", e.message);
    if (e.message.includes('ENOTFOUND') || e.name === 'AbortError') {
      return '<div>1.1. 02:30-06:30<br>Без даних (API down)</div>';  // FALLBACK
    }
    throw e;
  }
}
