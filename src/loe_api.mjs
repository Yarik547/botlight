export async function getTodayRawMobileHtml({ apiBase }) {
  const url = `${apiBase}/apimenus?type=photo-grafic`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/ld+json", // гарантує Hydra формат
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Дебаг для Railway
  console.log("[loe_api] status:", res.status);
  console.log("[loe_api] content-type:", res.headers.get("content-type"));
  console.log("[loe_api] data keys:", Object.keys(data));
  console.log("[loe_api] has hydra:member?", !!data["hydra:member"]);

  // Гнучкий парсинг: hydra:member або member
  const members = data["hydra:member"] ?? data.member;
  if (!Array.isArray(members) || members.length === 0) {
    console.error("[loe_api] full data preview:", JSON.stringify(data, null, 2).slice(0, 1000));
    throw new Error("No hydra:member/member array in photo-grafic response");
  }

  // Шукаємо Menu з type=photo-grafic
  const photoMenu = members.find(m => m.type === "photo-grafic");
  if (!photoMenu) {
    throw new Error("No photo-grafic menu found");
  }

  // Шукаємо Today елемент (orders=0) у menuItems
  const todayItem = photoMenu.menuItems?.find(item => item.name === "Today" || item.orders === 0);
  if (!todayItem) {
    throw new Error("No 'Today' item in photo-grafic menu");
  }

  // Повертаємо rawMobileHtml (або rawHtml якщо mobile нема)
  const rawMobile = todayItem.rawMobileHtml ?? todayItem.rawHtml;
  if (!rawMobile) {
    throw new Error("No rawMobileHtml/rawHtml in Today item");
  }

  console.log("[loe_api] found Today rawMobileHtml length:", rawMobile.length);
  return rawMobile;
}
