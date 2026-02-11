function hhmmToMinutes(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return (hh ?? 0) * 60 + (mm ?? 0);
}

export function parseScheduleFromRawMobileHtml(rawMobileHtml) {
  const text = String(rawMobileHtml).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  const groups = ['1.1','1.2','2.1','2.2','3.1','3.2','4.1','4.2','5.1','5.2','6.1','6.2'];
  const out = Object.fromEntries(groups.map(g => [g, []]));
  
  const re = /(\d\.\d)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/g;
  let m;
  while (m = re.exec(text)) {
    const g = m[1], a = hhmmToMinutes(m[2]+':'+m[3]), b = hhmmToMinutes(m[4]+':'+m[5]);
    if (out[g]) out[g].push([a, b]);
  }
  return out;
}
