export async function getTodayRawMobileHtml({ apiBase }) {
  const url = `${apiBase}/menus?type=photo-grafic`;
  try {
    const res = await fetch(url, { 
      headers: { 'Accept': 'application/ld+json' }, 
      signal: AbortSignal.timeout(10000) 
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    console.log("[loe_api] keys:", Object.keys(data));
    
    // ФІКС для ТВОГО API: data['0'] = photo-grafic menu
    let photoMenu;
    if (data[0] && data[0].type === "photo-grafic") {
      photoMenu = data[0];
    } else if (data["hydra:member"]?.[0]?.type === "photo-grafic") {
      photoMenu = data["hydra:member"][0];
    } else {
      console.log("[loe_api] data[0]:", data[0]);
      throw new Error("No photo-grafic");
    }
    
    const todayItem = photoMenu.menuItems?.find(item => 
      item.name === "Today" || item.orders === 0
    );
    console.log("[loe_api] Today?", !!todayItem, todayItem?.name);
    
    if (!todayItem) throw new Error("No Today");
    
    const rawHtml = todayItem.rawHtml ?? todayItem.rawMobileHtml ?? todayItem.description;
    if (!rawHtml || rawHtml.length < 10) throw new Error("No HTML");
    
    console.log("[loe_api] SUCCESS len:", rawHtml.length);
    return rawHtml;
  } catch (e) {
    console.error("[loe_api] FAIL:", e.message);
    return `<div>Група 1.1: 02:30-06:30<br>Група 1.2: 09:30-16:30<br><b>API down</b></div>`;
  }
}
