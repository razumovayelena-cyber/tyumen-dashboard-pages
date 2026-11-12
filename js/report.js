function reportDate() {
  return new Date().toLocaleDateString("ru-RU");
}

function reportFileStamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function reportEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportMoney(n) {
  return typeof moneyMln === "function" ? moneyMln(n) : fmt(n, 1) + " млн ₽";
}

async function reportAssetDataUrl(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return "";
  }
}

function reportChartDataUrl(id) {
  const el = document.getElementById(id);
  if (!el || typeof el.toDataURL !== "function") return "";
  try {
    return el.toDataURL("image/png");
  } catch (err) {
    return "";
  }
}

function lonLatToMerc(lon, lat) {
  const x = (lon * 20037508.342789244) / 180;
  const y =
    (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 20037508.342789244) /
    Math.PI;
  return [x, y];
}

function mercToLonLat(x, y) {
  const lon = (x * 180) / 20037508.342789244;
  const lat = (Math.atan(Math.exp((y * Math.PI) / 20037508.342789244)) * 360) / Math.PI - 90;
  return [lon, lat];
}

function fitBboxToAspect(bbox, w, h) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const [minX, minY] = lonLatToMerc(minLon, minLat);
  const [maxX, maxY] = lonLatToMerc(maxLon, maxLat);
  let west = minX;
  let south = minY;
  let east = maxX;
  let north = maxY;
  const width = Math.max(east - west, 1);
  const height = Math.max(north - south, 1);
  const target = w / h;
  const current = width / height;
  if (current < target) {
    const extra = (height * target - width) / 2;
    west -= extra;
    east += extra;
  } else {
    const extra = (width / target - height) / 2;
    south -= extra;
    north += extra;
  }
  const sw = mercToLonLat(west, south);
  const ne = mercToLonLat(east, north);
  return [sw[0], sw[1], ne[0], ne[1]];
}

function reportMapSpec(kind) {
  const geo = window.GEO || {};
  const features = [];
  const pilots = kind === "all" || kind === "prk";
  if (kind === "prk") {
    (geo.prk || []).forEach((item) => features.push({ type: "prk", pts: item.line || [] }));
  }
  if (pilots || kind === "p1") {
    features.push({ type: "poly", pts: geo.p1 || [], label: kind === "prk" ? "" : "мкрн Оброчное" });
    features.push({ type: "shore", pts: geo.shoreOb || [] });
    features.push({ type: "bridge", pts: geo.bridge || [] });
  }
  if (pilots || kind === "p2") {
    features.push({ type: "poly", pts: geo.p2 || [], label: kind === "prk" ? "" : "мкрн ДОК" });
    features.push({ type: "shore", pts: geo.shoreDok || [] });
  }
  const all = features.flatMap((f) => f.pts);
  if (!all.length) return null;
  let minLat = all[0][0];
  let maxLat = all[0][0];
  let minLon = all[0][1];
  let maxLon = all[0][1];
  all.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });
  const pad = kind === "all" ? 0.28 : 0.2;
  const dLat = (maxLat - minLat) * pad || 0.01;
  const dLon = (maxLon - minLon) * pad || 0.01;
  return {
    features,
    bbox: [minLon - dLon, minLat - dLat, maxLon + dLon, maxLat + dLat],
  };
}

function reportProjectPts(pts, bbox, w, h) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const [minX, minY] = lonLatToMerc(minLon, minLat);
  const [maxX, maxY] = lonLatToMerc(maxLon, maxLat);
  return pts
    .map(([lat, lon]) => {
      const [x, y] = lonLatToMerc(lon, lat);
      const px = ((x - minX) / (maxX - minX)) * w;
      const py = ((maxY - y) / (maxY - minY)) * h;
      return px.toFixed(1) + "," + py.toFixed(1);
    })
    .join(" ");
}

function reportCentroid(pts) {
  if (!pts.length) return [0, 0];
  const sum = pts.reduce(
    (acc, [lat, lon]) => [acc[0] + lat, acc[1] + lon],
    [0, 0]
  );
  return [sum[0] / pts.length, sum[1] / pts.length];
}

function reportMapSrc(kind, w, h) {
  const spec = reportMapSpec(kind);
  if (!spec) return "";
  const bbox = fitBboxToAspect(spec.bbox, w, h).join(",");
  return (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    "?bbox=" +
    encodeURIComponent(bbox) +
    "&bboxSR=4326&imageSR=3857&size=" +
    w +
    "," +
    h +
    "&dpi=96&format=png&transparent=false&f=image"
  );
}

function reportMapHtml(kind, w, h, caption, imageSrc) {
  const spec = reportMapSpec(kind);
  if (!spec) return "";
  const bboxArr = fitBboxToAspect(spec.bbox, w, h);
  spec.bbox = bboxArr;
  const src = imageSrc || reportMapSrc(kind, w, h);
  const marks = spec.features
    .map((f) => {
      const points = reportProjectPts(f.pts, spec.bbox, w, h);
      if (!points) return "";
      if (f.type === "poly") {
        const [lat, lon] = reportCentroid(f.pts);
        const labelPts = reportProjectPts([[lat, lon]], spec.bbox, w, h).split(",");
        const label = f.label
          ? `<text x="${labelPts[0]}" y="${labelPts[1]}" class="map-label">${reportEscape(f.label)}</text>`
          : "";
        return `<polygon points="${points}" class="map-poly" />${label}`;
      }
      if (f.type === "shore") {
        return `<polyline points="${points}" class="map-shore" />`;
      }
      return `<polyline points="${points}" class="map-bridge" />`;
    })
    .join("");
  return `<figure class="map-fig">
    <div class="map-frame" style="aspect-ratio:${w}/${h}">
      <img src="${src}" alt="${reportEscape(caption)}" width="${w}" height="${h}" />
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${marks}</svg>
    </div>
    <figcaption>${reportEscape(caption)}. Подложка: Esri, Maxar, Earthstar Geographics.</figcaption>
  </figure>`;
}

function reportStat(num, lbl) {
  const html = reportEscape(num).replace(/\s*(?:⟶|⇒|→)\s*/g, ' <span class="fromto" aria-hidden="true"></span> ');
  return `<div class="stat"><div class="num">${html}</div><div class="lbl">${reportEscape(lbl)}</div></div>`;
}

function reportBars(rows, tone) {
  const max = Math.max(...rows.map((r) => r.v), 1);
  return `<div class="bars">${rows
    .map((r) => {
      const pct = Math.max(6, (r.v / max) * 100);
      return `<div class="bar-row"><span>${reportEscape(r.name)}</span><div class="bar-track"><i class="${tone || r.tone || ""}" style="width:${pct}%"></i></div><b>${reportEscape(r.val)}</b></div>`;
    })
    .join("")}</div>`;
}

function reportGreenRows(part) {
  const tree0 = part.trees * MODEL.trees.price;
  const companion0 = part.greenHa * MODEL.trees.companionPerHa;
  const raw = tree0 + companion0;
  const scale = raw ? part.greenRub / raw : 1;
  return [
    { name: "Посадки деревьев", v: tree0 * scale, val: fmt((tree0 * scale) / 1e6, 0) + " млн" },
    { name: "Сопутствующие посадки", v: companion0 * scale, val: fmt((companion0 * scale) / 1e6, 0) + " млн" },
  ];
}

function reportAmenityRows(part) {
  return [
    ["Дорожки", part.pathRub],
    ["Клумбы", part.flowerRub],
    ["Детские площадки", part.playgroundRub],
    ["МАФ и свет", part.mafRub],
    ["Туалеты", part.toiletRub],
    ["Питание (фудтраки и кафе)", part.truckRub + part.cafeRub],
  ].map(([name, v]) => ({ name, v, val: fmt(v / 1e6, 0) + " млн" }));
}

function reportEngRows(part, withBridge) {
  const rows = [
    { name: "Берегоукрепление", v: part.shoreRub, val: fmt(part.shoreRub / 1e6, 0) + " млн", tone: "river" },
    { name: "Ливневая канализация и очистка", v: part.stormTreatRub, val: fmt(part.stormTreatRub / 1e6, 0) + " млн" },
  ];
  if (withBridge && part.bridgeRub) {
    rows.push({
      name: "Пешеходный мост",
      v: part.bridgeRub,
      val: fmt(part.bridgeRub / 1e6, 0) + " млн",
      tone: "sand",
    });
  }
  return rows;
}

function reportStack(parts) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return `<div class="stack">${parts
    .map(
      (p) =>
        `<i class="${p.tone}" style="width:${(p.v / total) * 100}%"><span>${reportEscape(p.name)} · ${reportEscape(p.val)}</span></i>`
    )
    .join("")}</div>`;
}

function reportFunding(m) {
  if (typeof fundingSplit === "function") return fundingSplit(m);
  const shoreAll = m.p1.shoreRub + m.p2.shoreRub;
  const stormTreat = m.p1.stormTreatRub + m.p2.stormTreatRub;
  const shoreM = 733;
  const amenityM2 = 8836;
  const devShore = (shoreM / MODEL.parts.p2.shoreM) * m.p2.shoreRub;
  const activeM2 = m.p2.activeHa * 10000;
  const devAmenity = activeM2 > 0 ? (amenityM2 / activeM2) * m.p2.amenityRub : 0;
  const federal = shoreAll - devShore + stormTreat;
  const extra = devShore + devAmenity;
  const local = m.greenRub + (m.amenityRub - devAmenity) + m.bridgeRub;
  return {
    federalMln: federal / 1e6,
    extraMln: extra / 1e6,
    localMln: local / 1e6,
    outsideMln: (federal + extra) / 1e6,
    share: (federal + extra) / m.capex,
    articles: {
      labels: ["Озеленение", "Благоустройство", "Гидротехника", "Мост"],
      federal: [0, 0, federal / 1e6, 0],
      extra: [0, devAmenity / 1e6, devShore / 1e6, 0],
      local: [m.greenRub / 1e6, (m.amenityRub - devAmenity) / 1e6, 0, m.bridgeRub / 1e6],
    },
    devShoreMln: devShore / 1e6,
    devAmenityMln: devAmenity / 1e6,
  };
}

const PDF_PAGE_W = 794;
const PDF_PAGE_H = 1123;

function reportStyles() {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f1ece3; }
    body, .report-pdf-sheet {
      font-family: "Montserrat", "Segoe UI", sans-serif;
      color: #1f2d63;
      background: #f1ece3;
      line-height: 1.4;
    }
    .report-pdf-sheet { width: ${PDF_PAGE_W}px; }
    .pdf-page {
      width: ${PDF_PAGE_W}px;
      height: ${PDF_PAGE_H}px;
      overflow: hidden;
      background: #f1ece3;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }
    .pdf-chrome, .pdf-footer {
      flex: 0 0 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #5a6480;
    }
    .pdf-chrome { border-bottom: 1px solid rgba(31,45,99,0.12); }
    .pdf-footer { border-top: 1px solid rgba(31,45,99,0.12); }
    .pdf-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      padding: 16px 28px 10px;
      display: flex;
      flex-direction: column;
    }
    .pdf-page.is-cover .pdf-body { padding-top: 18px; }
    .cover {
      background: #1f2d63;
      color: #f1ece3;
      padding: 28px 28px 22px;
      flex: 0 0 auto;
    }
    .cover-logos { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .cover-logos img { height: 36px; width: auto; display: block; }
    .cover-logos img.gold { height: 46px; }
    .kicker {
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #f2c682;
      font-weight: 700;
      margin: 0 0 8px;
    }
    .cover h1 {
      font-size: 26px;
      line-height: 1.12;
      margin: 0 0 10px;
      font-weight: 800;
    }
    .cover .lede, .cover .meta { color: rgba(241,236,227,0.82); font-size: 13px; margin: 0 0 6px; }
    .gold-line { height: 4px; width: 72px; background: #dda13b; margin: 14px 0 0; }
    h2 { font-size: 20px; margin: 0 0 8px; color: #1f2d63; }
    h3 { font-size: 15px; margin: 12px 0 6px; color: #1f2d63; }
    h4 { font-size: 12px; margin: 10px 0 6px; color: #144992; }
    p, li { font-size: 12px; margin: 0 0 8px; }
    .sub, .note { color: #5a6480; }
    .section-kicker {
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #dda13b;
      font-weight: 700;
      margin: 0 0 4px;
    }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 12px; }
    .stats.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .stats.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .stat { background: #faf8f4; border: 1px solid rgba(31,45,99,0.12); padding: 8px 10px; }
    .stat .num { font-size: 16px; font-weight: 800; color: #1f2d63; line-height: 1.15; }
    .fromto {
      display: inline-block;
      width: 1.05em;
      height: 0.46em;
      margin: 0 0.16em;
      vertical-align: 0.08em;
      background-color: currentColor;
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 18'%3E%3Cpath fill='%23000' d='M0 2.6h20.2v3.55H0zm0 9.25h20.2v3.55H0zM18.4 0 36 9 18.4 18z'/%3E%3C/svg%3E") center / contain no-repeat;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 18'%3E%3Cpath fill='%23000' d='M0 2.6h20.2v3.55H0zm0 9.25h20.2v3.55H0zM18.4 0 36 9 18.4 18z'/%3E%3C/svg%3E") center / contain no-repeat;
    }
    .stat .lbl { font-size: 10px; color: #5a6480; margin-top: 3px; }
    .sci-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 0 0 12px; }
    .sci { background: #1f2d63; color: #f1ece3; padding: 10px; }
    .sci:nth-child(2) { background: #b77717; }
    .sci:nth-child(3) { background: #144992; }
    .sci .big { font-weight: 800; font-size: 12px; margin-bottom: 6px; }
    .sci p { margin: 0; color: rgba(241,236,227,0.86); font-size: 10px; }
    .group { border: 1px solid rgba(31,45,99,0.12); padding: 8px 10px; margin: 0 0 8px; background: #faf8f4; }
    .group.tone-pine { background: #e8edf6; }
    .group.tone-sand { background: #f8efdc; }
    .group.tone-river { background: #e7f2fa; }
    .group h4 { margin-top: 0; }
    table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; }
    th, td { border: 1px solid rgba(31,45,99,0.22); padding: 4px 6px; font-size: 10px; vertical-align: top; }
    th { background: #1f2d63; color: #f1ece3; text-align: left; font-weight: 600; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    tr.total td { font-weight: 800; background: #e8edf6; }
    .timeline { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 0 0 10px; }
    .tl { background: #faf8f4; border: 1px solid rgba(31,45,99,0.12); padding: 8px; }
    .tl.alert { background: #fde8e1; border-color: #f15c28; }
    .tl .y { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #5a6480; }
    .tl .v { font-size: 18px; font-weight: 800; color: #1f2d63; }
    .tl .t { font-size: 10px; color: #5a6480; }
    .map-fig { margin: 0 0 8px; display: flex; flex-direction: column; min-height: 0; }
    .pdf-page.is-map .map-fig { flex: 1 1 auto; }
    .map-frame {
      position: relative;
      background: #121a3a;
      overflow: hidden;
      border: 1px solid #1f2d63;
      flex: 1 1 auto;
      min-height: 280px;
      aspect-ratio: auto !important;
    }
    .pdf-page.is-map .map-frame { min-height: 0; }
    .pdf-page.is-site .map-frame { height: 300px; flex: 0 0 300px; }
    .map-frame img, .map-frame svg { display: block; width: 100%; height: 100%; }
    .map-frame img { object-fit: cover; }
    .map-frame svg { position: absolute; inset: 0; }
    .map-poly { fill: rgba(20,73,146,0.38); stroke: #dda13b; stroke-width: 2; }
    .map-shore { fill: none; stroke: #5ba0d8; stroke-width: 4; stroke-linecap: round; }
    .map-bridge { fill: none; stroke: #f4742c; stroke-width: 5; stroke-linecap: round; }
    .map-label {
      fill: #faf8f4;
      font-family: "Montserrat", sans-serif;
      font-size: 18px;
      font-weight: 800;
      paint-order: stroke;
      stroke: #1f2d63;
      stroke-width: 4px;
      text-anchor: middle;
    }
    figcaption { font-size: 10px; color: #5a6480; margin-top: 4px; flex: 0 0 auto; }
    .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10px; color: #5a6480; margin: 0 0 8px; }
    .legend i { display: inline-block; width: 12px; height: 8px; margin-right: 6px; vertical-align: middle; }
    .legend .poly { background: #dda13b; }
    .legend .shore { background: #5ba0d8; }
    .legend .bridge { background: #f4742c; }
    .panel { background: #faf8f4; border: 1px solid rgba(31,45,99,0.12); padding: 10px; margin: 0 0 8px; }
    .stack { display: flex; height: 24px; overflow: hidden; margin: 6px 0 10px; }
    .stack i { display: flex; align-items: center; justify-content: center; color: #fff; font-style: normal; font-size: 8px; font-weight: 700; }
    .stack .moss { background: #144992; }
    .stack .sand { background: #dda13b; color: #1f2d63; }
    .stack .river { background: #5ba0d8; color: #1f2d63; }
    .bars { display: grid; gap: 4px; }
    .bar-row { display: grid; grid-template-columns: 1.2fr 1.6fr auto; gap: 6px; align-items: center; font-size: 10px; }
    .bar-track { height: 7px; background: #e4ddd2; }
    .bar-track i { display: block; height: 100%; background: #144992; }
    .bar-track i.river { background: #5ba0d8; }
    .bar-track i.sand { background: #dda13b; }
    .articles { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 0 0 8px; }
    .article { border-top: 4px solid #144992; margin: 0; }
    .article.tone-sand { border-top-color: #dda13b; }
    .article.tone-river { border-top-color: #5ba0d8; }
    .article .sum { font-size: 15px; font-weight: 800; margin: 2px 0 6px; }
    .fund { margin: 0 0 8px; padding: 8px 10px; }
    .fund.federal { background: #e7f2fa; }
    .fund.regional { background: #e8edf6; }
    .fund.private { background: #f8efdc; }
    .fund h4 { margin-top: 0; }
    .fund p { margin: 0 0 4px; font-size: 11px; }
    .method-card { padding: 10px; margin: 0 0 8px; }
    .method-card p { font-size: 11px; }
    .tone-econ { background: #f2c682; }
    .tone-eco { background: #5ba0d8; color: #1f2d63; }
    .tone-health { background: #144992; color: #f1ece3; }
    .tone-health .kicker { color: #f2c682; }
    .tone-health h3 { color: #f1ece3; }
    .tone-health p { color: rgba(241,236,227,0.88); }
    .chart { width: 100%; height: 220px; object-fit: contain; display: block; margin: 4px 0 10px; border: 1px solid rgba(31,45,99,0.12); background: #fff; }
    .foot { margin: 0; color: #5a6480; font-size: 10px; }
    ul.plain { margin: 6px 0 8px; padding-left: 18px; }
    ul.plain li { margin-bottom: 4px; }
    ol.plain { margin: 6px 0 0; padding-left: 18px; }
    ol.plain li { margin-bottom: 4px; font-size: 12px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 0 0 8px; }
    .meta-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .meta-grid div { background: #f1ece3; padding: 6px 8px; }
    .meta-grid b { display: block; font-size: 13px; }
    .grow { flex: 1 1 auto; min-height: 0; }
  `;
}

function pdfPage(num, total, section, inner, extraClass) {
  return `<section class="pdf-page${extraClass ? " " + extraClass : ""}">
    <div class="pdf-chrome"><span>Тюмень · Апробация Стандарта</span><span>${reportEscape(section)}</span></div>
    <div class="pdf-body">${inner}</div>
    <div class="pdf-footer"><span>Сценарная оценка · ${reportEscape(reportDate())}</span><span>${num} / ${total}</span></div>
  </section>`;
}

function reportScCell(raw, base, key, digits) {
  if (key === "base") return raw < 0 ? "−" + fmt(Math.abs(raw), digits) : fmt(raw, digits);
  const d = raw - base;
  if (Object.is(d, 0) || Math.abs(d) < 5 * Math.pow(10, -digits - 1)) return fmt(0, digits);
  return (d > 0 ? "+" : "−") + fmt(Math.abs(d), digits);
}

function reportScenarioTable() {
  const S = window.SCENARIOS;
  if (!S) return "<p class='note'>Сценарная таблица недоступна.</p>";
  const groups = [
    {
      title: "Здоровье",
      rows: [
        ["YLL в год", S.health.yllYear, 2, "YLL"],
        ["YLD в год", S.health.yldYear, 3, "YLD"],
        ["DALY в год", S.health.dalyYear, 2, "DALY"],
        ["DALY за 20 лет", S.health.daly20, 1, "DALY"],
        ["DALY на 1 000 жителей", S.health.dalyPer1000, 2, "DALY/1000"],
      ],
    },
    {
      title: "Экология",
      rows: [
        ["Доп. поглощение CO₂ в год", S.co2.year, 1, "т/год"],
        ["Доп. поглощение CO₂ за 20 лет", S.co2.y20, 0, "т"],
        ["Доп. удержание стока в год", S.runoff.year, 0, "м³/год"],
        ["Доп. удержание стока за 20 лет", S.runoff.y20, 0, "м³"],
      ],
    },
    {
      title: "Защита от подтопления",
      rows: [
        ["EAD (ожидаемый среднегодовой ущерб), прокси", S.flood.eadAvoided, 3, "млн ₽/год"],
        ["PV предотвращённого EAD, 20 лет", S.flood.eadPv20, 2, "млн ₽"],
        ["Минимальные выплаты бюджета", S.flood.payoutYear, 2, "млн ₽/год"],
      ],
    },
    {
      title: "Экономика строительства",
      rows: [
        ["Прямая ВДС строительства", S.economy.constructionGva, 0, "млн ₽"],
        ["Временная занятость", S.economy.jobs, 0, "чел.-лет"],
        ["Налоги и взносы строительства", S.economy.fiscal, 0, "млн ₽"],
      ],
    },
  ];
  const body = groups
    .map((g) => {
      const title = `<tr class="total"><td colspan="5">${reportEscape(g.title)}</td></tr>`;
      const rows = g.rows
        .map(([name, vals, digits, unit]) => {
          const base = vals[1];
          return `<tr><td>${reportEscape(name)}</td><td class="num">${reportScCell(vals[0], base, "low", digits)}</td><td class="num">${reportScCell(vals[1], base, "base", digits)}</td><td class="num">${reportScCell(vals[2], base, "high", digits)}</td><td>${reportEscape(unit)}</td></tr>`;
        })
        .join("");
      return title + rows;
    })
    .join("");
  return `<table>
    <thead><tr><th>Показатель</th><th class="num">Низкий, к базе</th><th class="num">Базовый</th><th class="num">Высокий, к базе</th><th>Ед.</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildReportHtml(m, assets) {
  const logos = assets || {};
  const floodChart = logos.floodChart || "";
  const split = reportFunding(m);
  const p1 = m.p1;
  const p2 = m.p2;
  const logoRow = [
    logos.tumen ? `<img class="gold" src="${logos.tumen}" alt="Тюмень 440" />` : "",
    logos.asi ? `<img src="${logos.asi}" alt="АСИ" />` : "",
    logos.atre ? `<img src="${logos.atre}" alt="АТРЭ" />` : "",
  ].join("");
  const capexP1 = [
    { name: "Озеленение", v: p1.greenRub / 1e6, val: fmt(p1.greenRub / 1e6, 1), tone: "moss" },
    { name: "Благоустройство", v: p1.amenityRub / 1e6, val: fmt(p1.amenityRub / 1e6, 1), tone: "sand" },
    { name: "Инженерная защита", v: p1.engRub / 1e6, val: fmt(p1.engRub / 1e6, 1), tone: "river" },
  ];
  const capexP2 = [
    { name: "Озеленение", v: p2.greenRub / 1e6, val: fmt(p2.greenRub / 1e6, 1), tone: "moss" },
    { name: "Благоустройство", v: p2.amenityRub / 1e6, val: fmt(p2.amenityRub / 1e6, 1), tone: "sand" },
    { name: "Инженерная защита", v: p2.engRub / 1e6, val: fmt(p2.engRub / 1e6, 1), tone: "river" },
  ];
  const fundArticles = split.articles.labels
    .map((label, i) => {
      const fed = split.articles.federal[i];
      const loc = split.articles.local[i];
      const priv = split.articles.extra[i];
      return `<tr><td>${reportEscape(label)}</td><td class="num">${fmt(fed, 1)}</td><td class="num">${fmt(loc, 1)}</td><td class="num">${fmt(priv, 1)}</td><td class="num">${fmt(fed + loc + priv, 1)}</td></tr>`;
    })
    .join("");

  const specs = [
    {
      section: "Обложка",
      cls: "is-cover",
      cover: true,
      html: `
        <div class="stats cols-4">
          ${reportStat(fmt(m.area, 2) + " га", "площадь пилотных территорий")}
          ${reportStat(fmt(m.shoreM / 1000, 2) + " км", "линия берегоукрепления")}
          ${reportStat(fmtInt(m.p1.trees + m.p2.trees), "сценарное число деревьев")}
          ${reportStat(reportMoney(m.capexMln), "капитальные затраты без НДС")}
        </div>
        <p class="section-kicker">Содержание</p>
        <h2>Состав отчета</h2>
        <p class="sub">Каждый лист — страница A4. В отчет входят разделы дашборда «Обзор», «Результаты апробации», «Эффекты от пилотов», «Инвестиции в пилоты» и «Сценарии». Методология — в конце.</p>
        <ol class="plain">
          <li>Обзор пилотных территорий и обзорная карта</li>
          <li>Результаты апробации</li>
          <li>Контекст апробации Стандарта</li>
          <li>ПРК+Стандарт: решения для внедрения на пилотных территориях</li>
          <li>Эффекты от пилотов</li>
          <li>Структура вложений</li>
          <li>Потенциальные источники финансирования</li>
          <li>Сценарии эффектов</li>
          <li>Методология оценки</li>
        </ol>`,
    },
    {
      section: "Обзор",
      cls: "is-map",
      html: `
        <p class="section-kicker">Обзор</p>
        <h2>Пилотные территории на карте города</h2>
        <p>мкрн Оброчное — обеспечение пешего доступа к зеленой территории. мкрн ДОК — защита застройки от подтопления.</p>
        ${reportMapHtml("all", 1400, 720, "Общий вид пилотных территорий мкрн Оброчное и мкрн ДОК", logos.maps && logos.maps.all)}
        <div class="legend">
          <div><i class="poly"></i>Контуры озеленения</div>
          <div><i class="shore"></i>Берегоукрепление · 5,05 км</div>
          <div><i class="bridge"></i>Пешеходный мост · 303 м</div>
        </div>`,
    },
    {
      section: "Результаты апробации",
      html: `
        <p class="section-kicker">Результаты апробации</p>
        <h2>Ключевые выводы по городу</h2>
        <p class="sub">Результаты апробации основаны на анализе 231 показателя Стандарта. Период: 2016–2025 гг.</p>
        <div class="sci-grid">
          <div class="sci"><div class="big">Устойчивый рост ОПЖ</div><p>Рост связан со снижением смертности от инфекций и от внешних причин, включая ДТП. Кроме того, экономический рост в городе создает дополнительные стимулы у населения к сохранению здоровья.</p></div>
          <div class="sci"><div class="big">Риски города — рост заболеваемости хроническими болезнями</div><p>Увеличение ОПЖ «упирается» в хронические болезни (диабет, гипертония), а также в заболеваемость органов дыхания.</p></div>
          <div class="sci"><div class="big">Среда — ключевой резерв для роста ОПЖ</div><p>Хронические болезни плохо поддаются только медицинской терапии — они во многом зависят от среды и повседневных привычек.</p></div>
        </div>
        <div class="group tone-pine">
          <h4>Сильные стороны города</h4>
          <div class="stats cols-4">
            ${reportStat("73,6 ⟶ 77,0", "ОПЖ при рождении, лет")}
            ${reportStat("51,5 ⟶ 62,9%", "доля занимающихся спортом")}
            ${reportStat("4,2 ⟶ 2,5", "младенческая смертность, на 1 000 родившихся")}
            ${reportStat("8,6 ⟶ 5,8", "смертность от ДТП, на 100 тыс.")}
          </div>
        </div>
        <div class="group tone-sand">
          <h4>Явные риски и проблемы</h4>
          <div class="stats cols-4">
            ${reportStat("42,5 ⟶ 67,8", "сахарный диабет, общая заболеваемость, на 1 000")}
            ${reportStat("9,6 ⟶ 28,6", "первичная артериальная гипертензия, на 1 000")}
            ${reportStat("152,9 ⟶ 275,5", "болезни органов дыхания, первичная заболеваемость, на 1 000")}
            ${reportStat("1 510 ⟶ 1 741", "ожирение детей 0–17, на 100 тыс.")}
          </div>
        </div>
        <div class="group tone-river">
          <h4>Неустойчивая картина</h4>
          <div class="stats cols-4">
            ${reportStat("425 ⟶ 379", "смертность от ССЗ, на 100 тыс.")}
            ${reportStat("18,8 ⟶ 20,7", "доля старше трудоспособного возраста, %")}
            ${reportStat("55 ⟶ 90 м²", "зелень на жителя по городу")}
            ${reportStat("143 ⟶ 151", "смертность от новообразований, на 100 тыс.")}
          </div>
        </div>`,
    },
    {
      section: "Контекст апробации Стандарта",
      html: `
        <p class="section-kicker">Контекст апробации Стандарта</p>
        <h2>Летнее наводнение 2026</h2>
        <p class="sub">Летний подъём Туры — второй за историю наблюдений с 1891 года. Опасная отметка 850 см держалась около 17 суток.</p>
        <div class="timeline">
          <div class="tl"><div class="y">1979</div><div class="v">915 см</div><div class="t">абсолютный рекорд</div></div>
          <div class="tl"><div class="y">2016</div><div class="v">868 см</div><div class="t">весна</div></div>
          <div class="tl"><div class="y">весна 2026</div><div class="v">684 см</div><div class="t">весенний пик, без ЧС</div></div>
          <div class="tl alert"><div class="y">лето 2026</div><div class="v">896–897 см</div><div class="t">лето, режим ЧС с 28 июля</div></div>
        </div>
        <h3>Уровень Туры, лето 2026</h3>
        <p class="note">Оперативные отметки по открытым сводкам. Красная линия на графике — порог опасного явления (ОЯ).</p>
        ${floodChart ? `<img class="chart" src="${floodChart}" alt="Уровень Туры, лето 2026" />` : ""}
        <h3>Ущерб от наводнения для г. Тюмени</h3>
        <p class="sub">Сводка по открытым источникам на конец августа 2026.</p>
        <div class="stats cols-4">
          ${reportStat("151", "жилых домов в зоне подтопления")}
          ${reportStat("2 056", "приусадебных участков")}
          ${reportStat("412 + 153", "жилых и садовых домов к санобработке в городе")}
          ${reportStat("29", "населённых пунктов в зоне подтопления")}
        </div>`,
    },
    {
      section: "Решения",
      html: `
        <h2>Что пострадало</h2>
        <p class="note">Основной ущерб — имущество, участки, коммуникации и санитарное состояние. Погибших в открытых сводках по ЧС в Тюмени не сообщалось.</p>
        <div class="panel">
          <ul class="plain">
            <li>Уязвимы Старая Зарека, Береговая, мкрн ДОК и Лесобаза, нижние ярусы набережной, СНТ «Родничок», «Дубрава», «Осень», «Березка».</li>
            <li>Метелевский водозабор (~60% сети) не справился с органикой; за 30 дней разобрано 3 378,5 м³ привозной воды.</li>
            <li>Замор рыбы ~400 т: кислород в Туре снизился до 0,8 мг/л при норме ~6 мг/л.</li>
            <li>Эвакуация на пике: 53 человека (9 детей) 1 августа, позже по Богандинскому / Пышме — 66 чел.</li>
          </ul>
        </div>
        <p class="section-kicker">ПРК+Стандарт</p>
        <h3>ПРК+Стандарт: решения для внедрения на пилотных территориях</h3>
        <p class="sub">Результаты апробации Стандарта могут быть интегрированы в ПКР города в рамках пилотных территорий - <strong>мкрн "ДОК" и мкрн "Оброчное"</strong>.</p>
        <p class="sub">Обе территории имеют схожий класс проблем - развитие жилой застройки, уязвимость к подтоплению и отсутствие пешего доступа к благоустроенным зеленым территориям.</p>
        <div class="panel">
          <div class="kicker" style="color:#144992">Решение 1 · Берегоукрепление</div>
          <p>Строительство защитных сооружений для защиты от наводнений для двух наиболее уязвимых микрорайонов города.</p>
          <div class="meta-grid">
            <div><b>${fmtInt(m.prot)}</b>жителей зоны защиты</div>
            <div><b>${fmt(m.floodMln, 3)} млн ₽/год</b>EAD (ожидаемый среднегодовой ущерб), прокси</div>
          </div>
        </div>
        <div class="panel">
          <div class="kicker" style="color:#dda13b">Решение 2 · Благоустройство и озеленение рекреационных территорий</div>
          <p>Обеспечение 15-минутной доступности лесопарковых территорий для пеших прогулок.</p>
          <div class="meta-grid">
            <div><b>${fmt(m.co2, 1)} т CO₂/год</b>дополнительное чистое поглощение</div>
            <div><b>${fmt(m.dalyYear, 2)} DALY/год</b>частичный сценарный эффект здоровья</div>
          </div>
        </div>`,
    },
    {
      section: "мкрн Оброчное",
      cls: "is-site",
      html: `
        <p class="section-kicker">Эффекты от пилотов · часть 1 · ${fmt(MODEL.parts.p1.areaHa, 2)} га</p>
        <h2>мкрн Оброчное</h2>
        <p class="note">Проблема: уязвимость к подтоплениям и недостаток обустроенных зеленых территорий для пеших прогулок (15-минутная доступность). Основная задача: обеспечение пешего доступа к зеленым территориям.</p>
        ${reportMapHtml("p1", 980, 620, "мкрн Оброчное: контур озеленения, берегоукрепление и мост", logos.maps && logos.maps.p1)}
        <div class="legend">
          <div><i class="poly"></i>Контур озеленения</div>
          <div><i class="shore"></i>Берегоукрепление · 1 510 м</div>
          <div><i class="bridge"></i>Пешеходный мост · 303 м</div>
        </div>
        <div class="meta-grid cols-4">
          <div><b>${fmtInt(m.h1.nearby)}</b>постоянных жителей</div>
          <div><b>${fmtInt(m.h1.houses)}</b>объектов, верхняя граница</div>
          <div><b>${fmt(p1.greenHa, 1)} га</b>озеленение</div>
          <div><b>${fmtInt(p1.trees)}</b>деревьев</div>
          <div><b>1,51 км</b>берегоукрепления</div>
          <div><b>303 м</b>пешеходный мост</div>
          <div><b>${reportMoney(p1.total / 1e6)}</b>CAPEX части</div>
          <div><b>${reportMoney(m.f1.opex)}/год</b>OPEX</div>
        </div>`,
    },
    {
      section: "мкрн ДОК",
      cls: "is-site",
      html: `
        <p class="section-kicker">Эффекты от пилотов · часть 2 · ${fmt(MODEL.parts.p2.areaHa, 2)} га</p>
        <h2>мкрн ДОК</h2>
        <p class="note">Основная задача: защита застройки от подтопления.</p>
        ${reportMapHtml("p2", 980, 620, "мкрн ДОК: контур озеленения и берегоукрепление по Туре", logos.maps && logos.maps.p2)}
        <div class="legend">
          <div><i class="poly"></i>Контур озеленения</div>
          <div><i class="shore"></i>Берегоукрепление · 3 538 м</div>
        </div>
        <div class="meta-grid cols-4">
          <div><b>${fmtInt(m.h2.nearby)}</b>постоянных жителей</div>
          <div><b>${fmtInt(m.h2.houses)}</b>объектов, верхняя граница</div>
          <div><b>${fmt(p2.greenHa, 1)} га</b>озеленение</div>
          <div><b>${fmtInt(p2.trees)}</b>деревьев</div>
          <div><b>3,53 км</b>берегоукрепления</div>
          <div><b>${reportMoney(p2.total / 1e6)}</b>CAPEX части</div>
          <div><b>${reportMoney(m.f2.opex)}/год</b>OPEX</div>
        </div>`,
    },
    {
      section: "Инвестиции в пилоты · мкрн ДОК",
      html: `
        <p class="section-kicker">Инвестиции в пилоты</p>
        <h2>Структура вложений · мкрн ДОК</h2>
        <p class="sub">Компонентный CAPEX — нижняя оценка, без НДС. ${fmt(MODEL.parts.p2.areaHa, 2)} га · берегоукрепление по Туре 3 538 м · без моста.</p>
        <h3>${reportMoney(p2.total / 1e6)}</h3>
        ${reportStack(capexP2)}
        <div class="articles">
          <div class="panel article">
            <div class="kicker" style="color:#144992">Озеленение</div>
            <div class="sum">${reportMoney(p2.greenRub / 1e6)}</div>
            <p class="note">${fmt(p2.greenHa, 1)} га · ${fmtInt(p2.trees)} деревьев</p>
            ${reportBars(reportGreenRows(p2), "moss")}
          </div>
          <div class="panel article tone-sand">
            <div class="kicker" style="color:#dda13b">Благоустройство</div>
            <div class="sum">${reportMoney(p2.amenityRub / 1e6)}</div>
            <p class="note">${fmt(p2.activeHa, 1)} га интенсивного использования</p>
            ${reportBars(reportAmenityRows(p2), "sand")}
          </div>
          <div class="panel article tone-river">
            <div class="kicker" style="color:#5ba0d8">Инженерная защита</div>
            <div class="sum">${reportMoney(p2.engRub / 1e6)}</div>
            <p class="note">Берег, ливневая канализация, очистка стока</p>
            ${reportBars(reportEngRows(p2, false))}
          </div>
        </div>`,
    },
    {
      section: "Инвестиции в пилоты · мкрн Оброчное",
      html: `
        <h2>Структура вложений · мкрн Оброчное</h2>
        <p class="sub">${fmt(MODEL.parts.p1.areaHa, 2)} га · берегоукрепление 1 510 м · пешеходный мост 303 м. Без НДС.</p>
        <h3>${reportMoney(p1.total / 1e6)}</h3>
        ${reportStack(capexP1)}
        <div class="articles">
          <div class="panel article">
            <div class="kicker" style="color:#144992">Озеленение</div>
            <div class="sum">${reportMoney(p1.greenRub / 1e6)}</div>
            <p class="note">${fmt(p1.greenHa, 1)} га · ${fmtInt(p1.trees)} деревьев</p>
            ${reportBars(reportGreenRows(p1), "moss")}
          </div>
          <div class="panel article tone-sand">
            <div class="kicker" style="color:#dda13b">Благоустройство</div>
            <div class="sum">${reportMoney(p1.amenityRub / 1e6)}</div>
            <p class="note">${fmt(p1.activeHa, 1)} га интенсивного использования</p>
            ${reportBars(reportAmenityRows(p1), "sand")}
          </div>
          <div class="panel article tone-river">
            <div class="kicker" style="color:#5ba0d8">Инженерная защита</div>
            <div class="sum">${reportMoney(p1.engRub / 1e6)}</div>
            <p class="note">Берег, ливневая канализация, очистка, мост</p>
            ${reportBars(reportEngRows(p1, true))}
          </div>
        </div>
        <table>
          <thead><tr><th></th><th class="num">мкрн ДОК</th><th class="num">мкрн Оброчное</th><th class="num">Итого</th></tr></thead>
          <tbody>
            <tr><td>Озеленение, млн ₽</td><td class="num">${fmt(p2.greenRub / 1e6, 1)}</td><td class="num">${fmt(p1.greenRub / 1e6, 1)}</td><td class="num">${fmt(m.greenRub / 1e6, 1)}</td></tr>
            <tr><td>Благоустройство, млн ₽</td><td class="num">${fmt(p2.amenityRub / 1e6, 1)}</td><td class="num">${fmt(p1.amenityRub / 1e6, 1)}</td><td class="num">${fmt(m.amenityRub / 1e6, 1)}</td></tr>
            <tr><td>Инженерная защита, млн ₽</td><td class="num">${fmt(p2.engRub / 1e6, 1)}</td><td class="num">${fmt(p1.engRub / 1e6, 1)}</td><td class="num">${fmt(m.engRub / 1e6, 1)}</td></tr>
            <tr class="total"><td>CAPEX всего, млн ₽</td><td class="num">${fmt(p2.total / 1e6, 1)}</td><td class="num">${fmt(p1.total / 1e6, 1)}</td><td class="num">${fmt(m.capexMln, 1)}</td></tr>
            <tr><td>На 1 га территории, млн ₽/га</td><td class="num">${fmt(p2.total / 1e6 / MODEL.parts.p2.areaHa, 2)}</td><td class="num">${fmt(p1.total / 1e6 / MODEL.parts.p1.areaHa, 2)}</td><td class="num">${fmt(m.capexMln / m.area, 2)}</td></tr>
          </tbody>
        </table>
        <p class="note">НЦС-референс полного озеленения парка на ${fmt(m.greenHa, 0)} га — около ${fmt(m.ncsMln / 1000, 1)} млрд ₽. Компонентный метод (${fmt(m.greenRub / 1e6, 0)} млн ₽) — ${fmt((m.greenRub / 1e6 / m.ncsMln) * 100, 0)}% от НЦС.</p>`,
    },
    {
      section: "Финансирование",
      html: `
        <h2>Потенциальные источники финансирования</h2>
        <p class="sub">Потенциальные источники из федерального бюджета или внебюджетных средств.</p>
        <div class="stats cols-3">
          ${reportStat(fmt(split.share * 100, 0) + "%", "доля сметы не из бюджетов субъекта и муниципалитета")}
          ${reportStat(reportMoney(split.outsideMln), "федеральные субсидии и КРТ застройщика")}
          ${reportStat(reportMoney(split.localMln), "остаётся за областью и городом")}
        </div>
        <table>
          <thead>
            <tr>
              <th>Статья, млн ₽</th>
              <th class="num">Федеральные субсидии</th>
              <th class="num">Область и город</th>
              <th class="num">КРТ</th>
              <th class="num">Итого</th>
            </tr>
          </thead>
          <tbody>${fundArticles}</tbody>
        </table>
        <p class="note">Федерация: берегоукрепление, ливневка и очистка за вычетом участка застройщика — ${fmt(split.federalMln, 0)} млн ₽. КРТ: 733 м набережной мкрн ДОКа (${fmt(split.devShoreMln, 0)} млн ₽) и ${fmt(8.8, 1)} тыс. м² благоустройства (${fmt(split.devAmenityMln, 0)} млн ₽). Озеленение и мост профильного федерального источника не имеют.</p>
        <div class="fund federal">
          <h4>Федеральное финансирование</h4>
          <p><b>Росводресурсы / Минприроды.</b> Субсидии субъектам, цикл 2027–2029, приказ № 42 от 11.03.2026. В смете: 383 млн ₽.</p>
          <p><b>«Вода России».</b> Очистка стока и ливневая канализация. В смете: 75 млн ₽.</p>
          <p><b>Таксономия ВЭБ.РФ.</b> Маркировка, не источник денег. Закрывает потенциально весь проект: 1 911 млн ₽.</p>
        </div>
        <div class="fund regional">
          <h4>Региональное финансирование</h4>
          <p><b>Правительство области / УКС.</b> АИП. Прецедент: защита Туры у Мельникайте — 1,67 млрд ₽. В смете: 631 млн ₽.</p>
          <p><b>Администрация Тюмени.</b> ФКГС и голосование жителей. В смете: 514 млн ₽ активной зоны очередями.</p>
          <p><b>Казначейский инфраструктурный кредит.</b> До 15 лет, 3% годовых, погашение с третьего года.</p>
        </div>
        <div class="fund private">
          <h4>Частные инвестиции, КРТ</h4>
          <p>Застройщик строит публичную набережную и передает ее городу. «Страна Девелопмент» — набережная мкрн ДОКа 733 м. Эти метры нельзя повторно включать в бюджетную заявку. Закрывает часть мкрн ДОКа: берег 3,53 км и зону для активностей в районе жилой застройки.</p>
        </div>`,
    },
    {
      section: "Сценарии",
      html: `
        <p class="section-kicker">Сценарии</p>
        <h2>Сравнение сценариев по контурам</h2>
        <p class="note">Базовый сценарий — абсолютное значение. Низкий и высокий — отклонение от базового.</p>
        ${reportScenarioTable()}`,
    },
    {
      section: "Методология",
      html: `
        <p class="section-kicker">Методология</p>
        <h2>Методология оценки эффектов</h2>
        <p class="sub">Оценка выполнена по 2 пилотным территориям на горизонте 20 лет эксплуатации. Экономический, экологический и медико-социальный контуры рассматриваются раздельно. Суммирование разнородных показателей в единый интегральный эффект не применяется.</p>
        <article class="method-card tone-econ">
          <div class="kicker" style="color:#1f2d63">Экономика</div>
          <h3>Валовая добавленная стоимость и бюджетный эффект</h3>
          <p>Прямая ВДС строительства — локализованная часть CAPEX без НДС, умноженная на отраслевую долю добавленной стоимости. Эксплуатационные эффекты сюда не входят.</p>
          <p>Активность посетителей: жители пилотных территорий и 2% остального населения Тюмени, 8 посещений в год, 45% с расходами, средний чек 350 ₽. Налоги — по нагрузке строительства. Выплаты при подтоплении — только единовременная помощь.</p>
        </article>
        <article class="method-card tone-eco">
          <div class="kicker" style="color:#1f2d63">Экология</div>
          <h3>Поглощение углекислого газа и удержание стока</h3>
          <p>Считается только разница с сохранением существующей растительности. В базе дополнительные деревья — 10% проектного числа, приживаемость 85%, зрелость 0,6 за 20 лет.</p>
          <p>Дополнительное удержание стока — 8 мм в год на площадь зоны воздействия. При росте водонепроницаемых покрытий эффект может снижаться или менять знак.</p>
        </article>`,
    },
    {
      section: "Методология",
      html: `
        <article class="method-card tone-health">
          <div class="kicker">Здоровье</div>
          <h3>Предотвращённые потери здоровой жизни</h3>
          <p>DALY: годы жизни, потерянные из-за преждевременной смерти, плюс годы с нарушением здоровья. Основной результат не дисконтируется.</p>
          <p>YLL включает физическую активность, жару и PM2.5. YLD — только психическое здоровье. Последствия подтоплений и NO₂ в итог не входят.</p>
          <p>Полный эффект нарастает 5 лет по методике ВОЗ. Это сценарная оценка высокой неопределенности, не замена локальному эпидемиологическому исследованию.</p>
        </article>
        <h3>Ограничения</h3>
        <p class="note">Значения не заменяют проектно-сметную документацию, гидравлическое моделирование и эпидемиологическое исследование. Для инвестиционного расчета нужны состав работ, график строительства, параметры эксплуатации и подтверждение зоны подтопления.</p>
        <p class="foot">Источник расчетных значений — книга «Расчет_эффектов_Тюмень_20лет_CAPEX_OPEX.xlsx». Показатели, кроме геометрии территорий, имеют статус сценарной оценки. Оформление — по брендбуку «Тюмень 440. На правильном пути». Дата: ${reportEscape(reportDate())}.</p>`,
    },
  ];

  const total = specs.length;
  const pages = specs
    .map((spec, i) => {
      if (spec.cover) {
        return `<section class="pdf-page is-cover">
          <header class="cover">
            <div class="cover-logos">${logoRow}</div>
            <div class="kicker">Апробация Стандарта здоровой среды в населенных пунктах</div>
            <h1>Результаты и проекты для внедрения в г. Тюмень</h1>
            <div class="gold-line"></div>
            <p class="lede">Пилотные территории: мкрн Оброчное и мкрн ДОК.</p>
            <p class="lede">Отчет сформирован автоматически. Дата формирования - ${reportEscape(reportDate())}.</p>
            <p class="meta">Горизонт оценки: 20 лет. Цены: 01.01.2026. Источник: «Расчет_эффектов_Тюмень_20лет_CAPEX_OPEX.xlsx».</p>
          </header>
          <div class="pdf-body">${spec.html}</div>
          <div class="pdf-footer"><span>Сценарная оценка · ${reportEscape(reportDate())}</span><span>1 / ${total}</span></div>
        </section>`;
      }
      return pdfPage(i + 1, total, spec.section, spec.html, spec.cls);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Отчет · Апробация Стандарта здоровой среды · Тюмень</title>
  <style>${reportStyles()}</style>
</head>
<body>${pages}</body>
</html>`;
}

function waitForReportAssets(root, timeoutMs) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return Promise.resolve();
  return new Promise((resolve) => {
    let left = images.length;
    const done = () => {
      left -= 1;
      if (left <= 0) resolve();
    };
    const timer = setTimeout(resolve, timeoutMs);
    images.forEach((img) => {
      if (img.complete) {
        done();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    Promise.resolve().then(() => {
      if (left <= 0) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

async function collectReportAssets() {
  const [tumen, asi, atre, mapAll, mapP1, mapP2, mapPrk] = await Promise.all([
    reportAssetDataUrl("img/tumen440.png"),
    reportAssetDataUrl("img/asi.svg"),
    reportAssetDataUrl("img/atre.png"),
    reportAssetDataUrl(reportMapSrc("all", 1400, 720)),
    reportAssetDataUrl(reportMapSrc("p1", 980, 620)),
    reportAssetDataUrl(reportMapSrc("p2", 980, 620)),
    reportAssetDataUrl(reportMapSrc("prk", 1400, 780)),
  ]);
  return {
    tumen,
    asi,
    atre,
    floodChart: reportChartDataUrl("chart-flood"),
    maps: { all: mapAll, p1: mapP1, p2: mapP2, prk: mapPrk },
  };
}

function reportJsPdf() {
  const lib = window.jspdf || {};
  const Ctor = lib.jsPDF || window.jsPDF;
  if (typeof Ctor !== "function") throw new Error("jsPDF не загружен");
  return new Ctor({ unit: "mm", format: "a4", orientation: "portrait" });
}

function clearReportOverlay() {
  ["report-template-frame", "report-pdf-host"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function reportTemplateFrame() {
  clearReportOverlay();
  const frame = document.createElement("iframe");
  frame.id = "report-template-frame";
  frame.title = "Макет отчета A4";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    left: "-12000px",
    top: "0px",
    width: PDF_PAGE_W + "px",
    height: PDF_PAGE_H + "px",
    border: "0",
    margin: "0",
    padding: "0",
    opacity: "0",
    pointerEvents: "none",
    background: "#f1ece3",
    zIndex: "-1",
  });
  document.body.appendChild(frame);
  return frame;
}

function loadReportTemplate(html) {
  const frame = reportTemplateFrame();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Макет отчета не загрузился")), 12000);
    frame.onload = () => {
      clearTimeout(timer);
      resolve(frame.contentDocument);
    };
    frame.srcdoc = html;
  });
}

function showReportTemplatePage(doc, index) {
  const pages = Array.from(doc.querySelectorAll(".pdf-page"));
  pages.forEach((page, i) => {
    page.style.display = i === index ? "flex" : "none";
  });
  doc.documentElement.scrollTop = 0;
  doc.body.scrollTop = 0;
  return pages[index] || null;
}

function reportHtml2Canvas() {
  if (typeof html2canvas === "function") return html2canvas;
  if (typeof html2pdf === "function" && html2pdf().html2canvas) return html2pdf().html2canvas;
  return null;
}

async function canvasOfTemplatePage(el) {
  const rect = el.getBoundingClientRect();
  const opts = {
    scale: 2,
    width: PDF_PAGE_W,
    height: PDF_PAGE_H,
    windowWidth: PDF_PAGE_W,
    windowHeight: PDF_PAGE_H,
    x: 0,
    y: 0,
    scrollX: -rect.left,
    scrollY: -rect.top,
    useCORS: true,
    backgroundColor: "#f1ece3",
    logging: false,
    allowTaint: false,
  };
  const render = reportHtml2Canvas();
  if (render) return render(el, opts);
  if (typeof html2pdf !== "function") throw new Error("Библиотека PDF не загружена");
  return html2pdf().set({ html2canvas: opts }).from(el).toCanvas().get("canvas");
}

async function downloadReportPdf() {
  const status = document.getElementById("report-status");
  const btn = document.getElementById("report-print");
  if (status) status.textContent = "Формируется отчет PDF…";
  if (btn) btn.disabled = true;
  const filename = "Otchet_Tyumen_Standart_" + reportFileStamp() + ".pdf";
  const frame = reportTemplateFrame();
  try {
    const html = buildReportHtml(compute(), await collectReportAssets());
    const doc = await loadReportTemplate(html);
    await waitForReportAssets(doc, 8000);
    if (doc.fonts && doc.fonts.ready) {
      await Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
    }
    const count = doc.querySelectorAll(".pdf-page").length;
    if (!count) throw new Error("В макете нет страниц A4");
    const pdf = reportJsPdf();
    for (let i = 0; i < count; i += 1) {
      if (status) status.textContent = "Формируется отчет PDF… страница " + (i + 1) + " из " + count;
      const page = showReportTemplatePage(doc, i);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await canvasOfTemplatePage(page);
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }
    pdf.save(filename);
    if (status) status.textContent = "PDF сохранен: " + filename + " · " + count + " стр. A4 · " + reportDate() + ".";
  } finally {
    if (btn) btn.disabled = false;
    clearReportOverlay();
  }
}

function fillReportPane(m) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("report-area", fmt(m.area, 1) + " га");
  setText("report-capex", reportMoney(m.capexMln));
  setText("report-gva", reportMoney(m.n1.constructionGvaMln + m.n2.constructionGvaMln));
  setText("report-daly", fmt(m.daly20, 1));
}

function bindReportExport(id, download, fallbackMessage) {
  const button = document.getElementById(id);
  if (!button || button.dataset.bound === "1") return;
  button.dataset.bound = "1";
  button.addEventListener("click", () => {
    download().catch((err) => {
      const status = document.getElementById("report-status");
      if (status) status.textContent = fallbackMessage;
      console.error(err);
    });
  });
}

function bindReport() {
  clearReportOverlay();
  const exportDocx = typeof downloadReportDocx === "function" ? downloadReportDocx : downloadReportPdf;
  bindReportExport("report-print", exportDocx, "Не удалось сформировать Word. Обновите страницу и повторите действие.");
  if (typeof downloadReportPptx === "function") {
    bindReportExport(
      "report-pptx",
      downloadReportPptx,
      "Не удалось сформировать PowerPoint. Обновите страницу и повторите действие."
    );
  }
}

window.fillReportPane = fillReportPane;
window.bindReport = bindReport;
window.buildReportHtml = buildReportHtml;
window.downloadReportPdf = downloadReportPdf;
clearReportOverlay();
