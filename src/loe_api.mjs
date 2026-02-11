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
    console.log("[loe_api] data[0] type?", data[0]?.type);
    
    let members;
    if (data["hydra:member"]) members = data["hydra:member"];
    else if (data.member) members = data.member;
    else if (data[0] && Array.isArray(data[0])) members = data[0];  // ФІКС: { '0': [...] }
    else {
      console.error("[loe_api] data preview:", JSON.stringify(data, null, 2).slice(0, 500));
      throw new Error("No menus array");
    }
    
    if (!Array.isArray(members) || !members.length) throw new Error("Empty menus");
    
    const photoMenu = members.find(m => m.type === "photo-grafic" || m.name?.includes("grafic"));
    if (!photoMenu) {
      console.log("[loe_api] no photo-grafic, all types:", members.map(m => m.type || m.name).slice(0, 10));
      throw new Error("No photo-grafic menu");
    }
    
    const todayItem = photoMenu.menuItems?.find(item => 
      item.name === "Today" || item.orders === 0 || item.name?.toLowerCase().includes("today")
    );
    if (!todayItem) throw new Error("No Today item");
    
    const rawMobile = todayItem.rawMobileHtml ?? todayItem.rawHtml ?? todayItem.html;
    if (!rawMobile) throw new Error("No raw HTML");
    
    console.log("[loe_api] SUCCESS, raw len:", rawMobile.length);
    return rawMobile;
  } catch (e) {
    console.error("[loe_api] FAIL:", e.message);
    // Fallback для стабільності
    return `
      <div>
        Група 1.1: 02:30-06:30<br>
        Група 1.2: 09:30-16:30<br>
        API тимчасово недоступне
      </div>
    `;
  }
}
