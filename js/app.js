const PALETTE = {
  pine: "#1f2d63",
  moss: "#144992",
  leaf: "#b77717",
  river: "#5ba0d8",
  sand: "#dda13b",
  flood: "#f15c28",
  paper: "#f1ece3",
  ink: "#1f2d63",
};

const FUNDING_COLORS = {
  federal: "#5ba0d8",
  regional: "#1f2d63",
  private: "#dda13b",
};

const FUNDING_LABELS = {
  federal: "Федеральные субсидии",
  regional: "Бюджеты области и города",
  private: "Частные инвестиции, КРТ",
};

Chart.defaults.font.family = "Montserrat, sans-serif";
Chart.defaults.color = "#5a6480";
Chart.defaults.borderColor = "rgba(31,45,99,0.08)";
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

let charts = {};

function moneyMln(n) {
  if (Math.abs(n) >= 1000) return fmt(n / 1000, 2) + " млрд ₽";
  return fmt(n, 1) + " млн ₽";
}
window.moneyMln = moneyMln;

function yearsLabel(n) {
  const rounded = Math.round(n * 10) / 10;
  if (!Number.isInteger(rounded)) return fmt(rounded, 1) + " года";
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "год" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "года" : "лет";
  return fmt(rounded, 0) + " " + word;
}

function roundedMix(total, mix) {
  const raw = mix.map((item) => total * item.share);
  const values = raw.map(Math.floor);
  let rest = Math.round(total) - values.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, rest)
    .forEach(({ index }) => {
      values[index] += 1;
    });
  return values;
}

let mapRef = null;
let mapLayers = {};
let siteMaps = {};
let prkMap = null;

const POLY_STYLE = {
  color: "#dda13b",
  weight: 2,
  fillColor: "#144992",
  fillOpacity: 0.32,
};
const SHORE_STYLE = { color: "#5ba0d8", weight: 5, opacity: 0.95 };
const BRIDGE_STYLE = { color: "#f4742c", weight: 6, opacity: 0.95 };
const PRK_STYLE = { color: "#99479b", weight: 4, opacity: 0.92 };

function addTiles(map) {
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  }).addTo(map);
}

function boundsOf(which) {
  if (which === "p1") {
    return L.latLngBounds(GEO.p1).extend(L.latLngBounds(GEO.shoreOb).extend(GEO.bridge));
  }
  if (which === "p2") {
    return L.latLngBounds(GEO.p2).extend(GEO.shoreDok);
  }
  return L.latLngBounds([...GEO.p1, ...GEO.p2, ...GEO.shoreDok, ...GEO.shoreOb, ...GEO.bridge]);
}

function polygonBounds(which) {
  return L.latLngBounds(which === "p2" ? GEO.p2 : GEO.p1);
}

function boundsSpanMeters(bounds) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return {
    width: sw.distanceTo(L.latLng(sw.lat, ne.lng)),
    height: sw.distanceTo(L.latLng(ne.lat, sw.lng)),
  };
}

function equalScaleBounds(centerBounds, spanW, spanH) {
  const c = centerBounds.getCenter();
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((c.lat * Math.PI) / 180);
  const dLat = spanH / 2 / mPerDegLat;
  const dLng = spanW / 2 / mPerDegLng;
  return L.latLngBounds([c.lat - dLat, c.lng - dLng], [c.lat + dLat, c.lng + dLng]);
}

function drawPrk(map) {
  (GEO.prk || []).forEach((item) => {
    L.polyline(item.line, PRK_STYLE).bindTooltip(item.label, { sticky: true }).addTo(map);
  });
}

function drawSite(map, which, remember) {
  if (which === "p1" || which === "all") {
    const p1 = L.polygon(GEO.p1, POLY_STYLE)
      .bindTooltip("Часть 1 · мкрн Оброчное · 183,02 га", { sticky: true })
      .addTo(map);
    if (remember && which === "all") mapLayers.p1 = p1;
    L.polyline(GEO.shoreOb, SHORE_STYLE).bindTooltip("Берегоукрепление Оброчное · 1 510 м").addTo(map);
    L.polyline(GEO.bridge, BRIDGE_STYLE).bindTooltip("Пешеходный мост · 303 м").addTo(map);
  }
  if (which === "p2" || which === "all") {
    const p2 = L.polygon(GEO.p2, POLY_STYLE)
      .bindTooltip("Часть 2 · мкрн ДОК · 235,77 га", { sticky: true })
      .addTo(map);
    if (remember && which === "all") mapLayers.p2 = p2;
    L.polyline(GEO.shoreDok, SHORE_STYLE).bindTooltip("Берегоукрепление мкрн ДОК · 3 538 м").addTo(map);
  }
}

function boundsOfPrk() {
  const pts = [
    ...GEO.p1,
    ...GEO.p2,
    ...GEO.shoreDok,
    ...GEO.shoreOb,
    ...GEO.bridge,
    ...(GEO.prk || []).flatMap((item) => item.line),
  ];
  return L.latLngBounds(pts);
}

function syncMapSize(map, which, pad) {
  if (!map) return;
  map.invalidateSize();
  map.fitBounds(boundsOf(which), { padding: pad || [28, 28], maxZoom: which === "all" ? 15 : 17 });
}

function initMap() {
  const map = L.map("map", {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false,
  }).setView([57.16, 65.55], 12);
  mapRef = map;
  addTiles(map);
  drawSite(map, "all", true);

  map.whenReady(() => setTimeout(() => syncMapSize(map, "all"), 200));
  window.addEventListener("resize", () => {
    const pane = currentPane();
    if (pane === "obzor") map.invalidateSize();
    if (pane === "territorii") syncSiteMaps();
    if (pane === "itogi") syncPrkMap();
  });

  document.querySelectorAll(".map-tools button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".map-tools button").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      focusMap(btn.dataset.focus);
    });
  });
}

function syncPrkMap() {
  if (!prkMap) return;
  prkMap.invalidateSize();
  prkMap.fitBounds(boundsOfPrk(), { padding: [8, 8], maxZoom: 14 });
  prkMap.setZoom(prkMap.getZoom() + 1, { animate: false });
}

function initPrkMap() {
  const el = document.getElementById("map-prk");
  if (!el) return;
  const map = L.map("map-prk", {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false,
  }).setView([57.15, 65.55], 12);
  addTiles(map);
  drawPrk(map);
  drawSite(map, "all", false);
  prkMap = map;
  map.whenReady(() => setTimeout(syncPrkMap, 200));
}

function initSiteMaps() {
  ["p1", "p2"].forEach((key) => {
    const map = L.map("map-" + key, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([57.16, 65.55], 15);
    addTiles(map);
    drawSite(map, key);
    map.whenReady(() => setTimeout(syncSiteMaps, 200));
    siteMaps[key] = map;
  });
}

function syncSiteMaps() {
  const m1 = siteMaps.p1;
  const m2 = siteMaps.p2;
  if (!m1 || !m2) return;
  m1.invalidateSize();
  m2.invalidateSize();
  const b1 = polygonBounds("p1");
  const b2 = polygonBounds("p2");
  const s1 = boundsSpanMeters(b1);
  const s2 = boundsSpanMeters(b2);
  const pad = 1.2;
  const spanW = Math.max(s1.width, s2.width) * pad;
  const spanH = Math.max(s1.height, s2.height) * pad;
  const eq1 = equalScaleBounds(b1, spanW, spanH);
  const eq2 = equalScaleBounds(b2, spanW, spanH);
  m1.fitBounds(eq1, { animate: false, padding: [16, 16] });
  m2.fitBounds(eq2, { animate: false, padding: [16, 16] });
  const zoom = Math.min(m1.getZoom(), m2.getZoom());
  m1.setView(b1.getCenter(), zoom, { animate: false });
  m2.setView(b2.getCenter(), zoom, { animate: false });
}

function focusMap(which) {
  if (!mapRef) return;
  syncMapSize(mapRef, which);
}

function barList(el, rows) {
  el.innerHTML = rows
    .map(
      (r) => `
    <div class="bar-row">
      <span>${r.name}</span>
      <div class="bar-track"><div class="bar-fill ${r.tone || ""}" style="width:${r.pct}%"></div></div>
      <span>${r.val}</span>
    </div>`
    )
    .join("");
}

const doughnutCenterPlugin = {
  id: "doughnutCenter",
  afterDraw(chart) {
    const opts = chart.options.plugins && chart.options.plugins.doughnutCenter;
    if (!opts || !opts.text) return;
    const { ctx } = chart;
    const slice = chart.getDatasetMeta(0).data[0];
    if (!slice) return;
    const x = slice.x;
    const y = slice.y;
    const maxW = slice.innerRadius * 2 * 0.78;
    const lines = Array.isArray(opts.sub)
      ? opts.sub.filter(Boolean)
      : String(opts.sub || "")
          .split(/\s*\+\s*/)
          .map((part, i) => (i ? "+" + part : part))
          .filter(Boolean);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PALETTE.pine;
    let titleSize = 28;
    ctx.font = "800 " + titleSize + "px 'Druk Text Wide', Montserrat, sans-serif";
    while (titleSize > 18 && ctx.measureText(opts.text).width > maxW) {
      titleSize -= 1;
      ctx.font = "800 " + titleSize + "px 'Druk Text Wide', Montserrat, sans-serif";
    }
    const subSize = 11;
    const lineH = 14;
    const blockH = titleSize + (lines.length ? 8 + lines.length * lineH : 0);
    const titleY = y - blockH / 2 + titleSize / 2;
    ctx.fillText(opts.text, x, titleY);
    ctx.fillStyle = "#5a6480";
    ctx.font = "600 " + subSize + "px Montserrat, sans-serif";
    lines.forEach((line, i) => {
      ctx.fillText(line, x, titleY + titleSize / 2 + 10 + i * lineH);
    });
    ctx.restore();
  },
};

const FUND_DEV = {
  shoreM: 733,
  amenityM2: 8836,
};

window.fundingSplit = fundingSplit;
function fundingSplit(m) {
  const shoreAll = m.p1.shoreRub + m.p2.shoreRub;
  const stormTreat = m.p1.stormTreatRub + m.p2.stormTreatRub;
  const devShore = (FUND_DEV.shoreM / MODEL.parts.p2.shoreM) * m.p2.shoreRub;
  const activeM2 = m.p2.activeHa * 10000;
  const devAmenity = activeM2 > 0 ? (FUND_DEV.amenityM2 / activeM2) * m.p2.amenityRub : 0;
  const federal = shoreAll - devShore + stormTreat;
  const extra = devShore + devAmenity;
  const local = m.greenRub + (m.amenityRub - devAmenity) + m.bridgeRub;
  const total = m.capex;
  return {
    federalMln: federal / 1e6,
    extraMln: extra / 1e6,
    localMln: local / 1e6,
    totalMln: total / 1e6,
    outsideMln: (federal + extra) / 1e6,
    share: (federal + extra) / total,
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

function doughnut(id, labels, data, colors, center) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
    },
    plugins: center ? [doughnutCenterPlugin] : [],
    options: {
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } },
        doughnutCenter: center || {},
      },
    },
  });
}

function stackedFund(id, split) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels: split.articles.labels,
      datasets: [
        {
          label: FUNDING_LABELS.federal,
          data: split.articles.federal,
          backgroundColor: FUNDING_COLORS.federal,
          borderWidth: 0,
        },
        {
          label: FUNDING_LABELS.regional,
          data: split.articles.local,
          backgroundColor: FUNDING_COLORS.regional,
          borderWidth: 0,
        },
        {
          label: FUNDING_LABELS.private,
          data: split.articles.extra,
          backgroundColor: FUNDING_COLORS.private,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ctx.dataset.label + ": " + fmt(ctx.parsed.x, 0) + " млн ₽";
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: "млн ₽" },
          grid: { color: "rgba(31,45,99,0.06)" },
        },
        y: { stacked: true, grid: { display: false } },
      },
    },
  });
}

function fillFunding(m) {
  const split = fundingSplit(m);
  const shareEl = document.getElementById("fund-share");
  if (!shareEl) return;
  shareEl.textContent = fmt(split.share * 100, 0) + "%";
  document.getElementById("fund-outside").textContent = moneyMln(split.outsideMln);
  document.getElementById("fund-local").textContent = moneyMln(split.localMln);
  doughnut(
    "chart-fund-cover",
    [FUNDING_LABELS.federal, FUNDING_LABELS.regional, FUNDING_LABELS.private],
    [split.federalMln, split.localMln, split.extraMln],
    [FUNDING_COLORS.federal, FUNDING_COLORS.regional, FUNDING_COLORS.private],
    { text: fmt(split.share * 100, 0) + "%", sub: ["федбюджет", "+внебюджет"] }
  );
  stackedFund("chart-fund-articles", split);
  document.getElementById("fund-note").textContent =
    "Федерация: берегоукрепление, ливнёвка и очистка за вычетом участка застройщика — " +
    fmt(split.federalMln, 0) +
    " млн ₽. КРТ: " +
    FUND_DEV.shoreM +
    " м набережной мкрн ДОКа (" +
    fmt(split.devShoreMln, 0) +
    " млн ₽) и " +
    fmt(FUND_DEV.amenityM2 / 1000, 1) +
    " тыс. м² благоустройства (" +
    fmt(split.devAmenityMln, 0) +
    " млн ₽). Озеленение 766 млн ₽ и мост 174 млн ₽ профильного федерального источника не имеют.";
}

function hbar(id, labels, data, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: color, borderWidth: 0, barThickness: 18 }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(31,45,99,0.06)" },
          ticks: { callback: (v) => v },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

const stackedBarLabelPlugin = {
  id: "stackedBarLabel",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || meta.hidden) return;
      meta.data.forEach((bar, j) => {
        const value = Number(ds.data[j]);
        if (!value) return;
        const w = Math.abs(bar.x - bar.base);
        if (w < 44) return;
        ctx.save();
        const fill = String(ds.backgroundColor || "");
        ctx.fillStyle = fill.toLowerCase() === PALETTE.sand.toLowerCase() ? PALETTE.pine : "#faf8f4";
        ctx.font = "600 13px Montserrat, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fmt(value, 0), (bar.x + bar.base) / 2, bar.y);
        ctx.restore();
      });
    });
  },
};

function stackedHbar(id, parts) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels: [""],
      datasets: parts.map((part) => ({
        label: part.label,
        data: [part.value],
        backgroundColor: part.color,
        colorInk: part.ink || "#faf8f4",
        borderWidth: 0,
        barThickness: 36,
      })),
    },
    plugins: [stackedBarLabelPlugin],
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { boxWidth: 10, padding: 16 },
        },
        tooltip: {
          callbacks: {
            title: () => "",
            label(ctx) {
              return ctx.dataset.label + ": " + fmt(ctx.parsed.x, 1) + " млн ₽";
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          display: false,
          grid: { display: false },
        },
        y: {
          stacked: true,
          display: false,
          grid: { display: false },
        },
      },
    },
  });
}

function lineFlood() {
  const id = "chart-flood";
  if (charts[id]) charts[id].destroy();
  const s = MODEL.flood.series;
  charts[id] = new Chart(document.getElementById(id), {
    type: "line",
    data: {
      labels: s.map((x) => x.d),
      datasets: [
        {
          label: "Уровень Туры, см",
          data: s.map((x) => x.v),
          borderColor: PALETTE.river,
          backgroundColor: "rgba(91,160,216,0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: PALETTE.pine,
        },
        {
          label: "ОЯ 850 см",
          data: s.map(() => MODEL.flood.danger),
          borderColor: PALETTE.flood,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: { min: 300, title: { display: true, text: "Уровень, см" } },
        x: { title: { display: true, text: "Дата (2026)" } },
      },
    },
  });
}

function moneyBars(id, labels, data, colors, unit = "млн ₽/год") {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: unit, data, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { title: { display: true, text: unit } },
        x: { ticks: { maxRotation: 40, minRotation: 0 } },
      },
    },
  });
}

const EFFECT_METHOD = {
  vas: {
    title: "Валовая добавленная стоимость (ВДС)",
    lead: "Оценка новой экономической активности, которую модель связывает с посещениями благоустроенной территории. Это не налог и не кассовый доход бюджета.",
    calc: [
      "Сначала считаются посещения части, затем доля платящих посетителей — 45%.",
      "Средний чек — 350 ₽. В городской оборот попадает 80% этой суммы.",
      "ВДС = городской оборот × 45% × мультипликатор 2,2: часть оборота становится добавленной стоимостью, остальное — промежуточное потребление и эффект смежных отраслей.",
    ],
    none: [
      "НДФЛ, оборотные налоги и прирост цены жилья сюда не входят — налоги показаны отдельной карточкой, жильё в блок не выводится.",
      "Оценка здоровья по числу визитов в модель не входит.",
    ],
  },
  taxes: {
    title: "Налоги в бюджет города",
    lead: "Оценка поступлений в городской бюджет от новых рабочих мест и оборота сервисов на благоустроенной территории. Это не вся налоговая база проекта и не кассовый прогноз казначейства.",
    calc: [
      "НДФЛ: фонд оплаты прямых рабочих мест × ставка 13% × доля города 30%.",
      "Оборотные налоги: городской оборот × 8% × доля города 22%.",
      "Карточка — сумма двух потоков за год.",
    ],
    none: [
      "Федеральная и областная доли НДФЛ сюда не входят.",
      "НДС, налог на имущество, земельный налог и капитализация жилья не считаются.",
      "Цифра не входит в NPV и в годовой эффект сценария: налоги частично пересекаются с ВДС.",
    ],
  },
  visits: {
    title: "Посещения в год",
    lead: "Расчётный поток визитов в благоустроенную зону этой части, не данные счётчиков на входе.",
    calc: [
      "Зона притяжения — 40% населения Тюмени.",
      "Норматив — 8 визитов на жителя зоны в год, плюс 10% туристических посещений.",
      "Поток делится между частями пропорционально площади территории.",
    ],
    none: [
      "Это не уникальные жители: один человек может дать несколько визитов.",
      "Ёмкость территории и пиковая нагрузка считаются отдельно и на карточку не выводятся.",
    ],
  },
  jobs: {
    title: "Прямые рабочие места",
    lead: "Ориентир занятости на объектах обслуживания и содержании активной зоны. Не занятость в строительстве.",
    calc: [
      "2,5 места на объект питания: фудтраки и кафе, число которых зависит от площади активной зоны.",
      "Плюс 1,5 места содержания на каждые 10 га активной зоны.",
    ],
    none: [
      "Подряд на берегоукрепление, посадки и разовые стройработы сюда не входят.",
      "Косвенные места в смежных отраслях не добавляются: их частично учитывает мультипликатор ВДС.",
    ],
  },
  co2: {
    title: "Поглощение CO₂",
    lead: "Физический объём углерода, который посадки этой части забирают из атмосферы за год. Это не деньги и не статья бюджета.",
    calc: [
      "Деревья: число посадок × 12,29 кг CO₂ на дерево в год.",
      "Газон и травостой: площадь озеленения × 3,5 т CO₂ с гектара в год.",
      "Коэффициент зрелости 0,6: молодые посадки ещё не работают в полную силу.",
    ],
    none: [
      "Рублёвая оценка (3 500 ₽/т) в эту карточку не входит.",
      "Снижение пикового стока — в экономике берега, не здесь.",
    ],
  },
  coolTemp: {
    title: "Снижение температуры",
    lead: "Допущение модели о локальной прохладе от посадок. Одинаково для обеих частей: это не измерение с метеостанции и не разница между Оброчным и мкрн ДОКом.",
    calc: [
      "Снижение температуры в модели — 1,8 °C.",
      "Ощущают эффект 25% жителей зоны притяжения; доля части — по площади.",
    ],
    none: [
      "Денежная оценка прохлады для здоровья — карточка в блоке «Здоровье».",
      "Это не прогноз летней жары по городу и не эффект берегоукрепления.",
    ],
  },
  peakMoney: {
    title: "Снижение пикового стока, млн ₽/год",
    lead: "Денежная оценка дополнительного объёма воды, который зелёный буфер удерживает в пик паводка. Это не выплата и не статья бюджета.",
    calc: [
      "Сначала считается физический объём: 35% площади озеленения работает как буфер, 800 м³ влаги с гектара, из них 25% срезает пик.",
      "Каждый кубометр оценивается в 120 ₽ избегаемого ущерба от подтопления.",
    ],
    none: [
      "Это эффект посадок (влагоудержание), не бетонного берега. В блоке берегоукрепления карточка стоит потому, что эффект относится к паводку.",
      "Лечение и санитарная обработка сюда не входят.",
    ],
  },
  peakM3: {
    title: "Снижение пикового стока, м³",
    lead: "Физический объём воды, который модель снимает с пика за счёт зелёного буфера этой части.",
    calc: [
      "Буфер — 35% площади озеленения части.",
      "Норматив влагоудержания — 800 м³ с гектара озеленения.",
      "Доля, относимая к срезанию пика, — 25%.",
    ],
    none: [
      "Это не расход воды водоканала и не объём берегоукрепления в кубометрах бетона.",
      "Денежная оценка того же объёма — соседняя карточка, 120 ₽/м³.",
    ],
  },
  amenityH: {
    title: "Физическая активность и психическое здоровье",
    lead: "Предотвращённые потери от малоподвижности и часть годового бремени стресса у новых регулярных пользователей парка. Стресс от паводка сюда не входит.",
    calc: [
      "Ближайшая зона — 40 000 жителей, делится между частями по площади.",
      "Новые регулярно активные — 5% этой зоны.",
      "Экономия здравоохранения — 9 045 ₽ на активного в год (прямые медзатраты с листа потерь от болезней).",
      "Психическое здоровье — 20% от годового бремени стресса 9 652 ₽ на активного: парк снимает часть потерь, не всё бремя.",
    ],
    none: [
      "Охлаждение и DALY не входят.",
      "Это не бюджет поликлиники и не выплата жителю.",
    ],
  },
  coolHealth: {
    title: "Охлаждающий эффект для здоровья",
    lead: "Медицинская доля денежной оценки прохлады посадок. Полный охлаждающий эффект больше: 40% модель относит к комфорту и энергосбережению, не к здоровью.",
    calc: [
      "Ощущают прохладу 25% жителей зоны притяжения, доля части — по площади.",
      "Снижение температуры в модели — 1,8 °C.",
      "Полная оценка — 450 ₽ с человека за каждый градус в год.",
      "На здоровье относится 60% этой суммы.",
    ],
    none: [
      "Комфорт жары и экономия на кондиционерах в эту карточку не входят.",
      "DALY от тепла считаются отдельно.",
    ],
  },
  amenity20: {
    title: "Активность и охлаждение за 20 лет",
    lead: "Накопленная за 20 лет сумма двух годовых потоков: активность и психическое здоровье плюс полный охлаждающий эффект, включая комфорт. Без дисконтирования.",
    calc: [
      "Годовая база = активность и психика + полный охлаждающий эффект (не только 60% здоровья).",
      "Первые три года эффект нарастает: 40%, 60%, 80%. Дальше 100%. Это 18,8 «эффективных» года, не 20 полных.",
    ],
    none: [
      "ВДС, CO₂, защита от подтопления и DALY сюда не входят.",
      "NPV это не является: ставка 10% здесь не применяется.",
    ],
  },
  daly: {
    title: "Предотвращённые потери здоровых лет жизни (DALY)",
    lead: "Индекс лет жизни, которые модель не теряет из‑за болезней и тепловой нагрузки благодаря озеленению и благоустройству. Это не рубли и не случаи заболеваний от паводка.",
    calc: [
      "Физическая активность: 0,025 DALY на нового активного жителя в год.",
      "Психическое здоровье: 0,008 DALY на нового активного жителя в год.",
      "Тепловая нагрузка: ощущающие охлаждение × 1,8 °C × 0,00004 DALY × доля здоровья 60%.",
      "Годовая сумма умножается на 18,8 эффективных лет (нарастание 40% → 60% → 80%).",
    ],
    none: [
      "Не складывается с рублёвыми карточками: это другая единица.",
      "Паводковые заболевания в индекс не входят.",
    ],
  },
  floodH: {
    title: "Защита от подтопления",
    lead: "Денежная оценка эффекта берегоукрепления для здоровья: почти вся сумма — лечение предотвращённых заболеваний. Санитарная обработка домов добавляет доли процента и отдельно не показывается.",
    calc: [
      "Случаи заболеваний — соседняя карточка × 18 697 ₽ на случай с листа «Потери от болезней».",
      "Плюс санитарная обработка: дома части × вероятность паводка 10% × доля предотвращения 15% × 25 000 ₽. На Оброчном это около 0,01 млн ₽, на мкрн ДОКе около 0,04 млн ₽.",
    ],
    none: [
      "Стресс от паводка из модели исключён.",
      "Городские выплаты по 800 домам сюда не входят.",
      "Снижение пикового стока — в экономике берега, не здесь.",
    ],
  },
  cases: {
    title: "Предотвращённые случаи заболеваний",
    lead: "Ожидаемое число случаев ОКИ, гепатита А, кожных реакций и обострений, которых не будет благодаря защите этой части.",
    calc: [
      "База — жители зоны защиты: Оброчное 5 702, мкрн ДОК 9 395. Не длина берега.",
      "Вероятность значимого паводка — 10% в год.",
      "Защита предотвращает 15% последствий.",
      "Доля жителей зоны с ущербом здоровью при паводке — 20%.",
    ],
    none: [
      "Это не госпитализации и не все обращения в поликлинику.",
      "Денежная оценка тех же случаев — карточка «защита от подтопления».",
    ],
  },
};

Object.assign(EFFECT_METHOD, {
  vas: {
    title: "Прямая валовая добавленная стоимость",
    lead: "Сценарная оценка прямой ВДС строительства и эксплуатации за 20 лет.",
    calc: ["Локализованный выпуск умножен на долю ВДС строительства 48,18%.", "Учтены строительство и оценочный OPEX за 20 лет."],
    none: ["Косвенная и индуцированная ВДС не включены.", "Налоги и предотвращённый ущерб не суммируются с ВДС."],
  },
  taxes: {
    title: "Налоги и страховые взносы",
    lead: "Сценарный бюджетный эффект строительства и 20 лет эксплуатации.",
    calc: ["Налоговая нагрузка строительства — 14,4% локализованного выпуска.", "Страховые взносы — 5,0%."],
    none: ["Распределение по уровням бюджетной системы не рассчитано."],
  },
  visitorGva: {
    title: "ВДС от расходов посетителей",
    lead: "Отдельный сценарный контур экономики парков; не включён в ВДС строительства и эксплуатации.",
    calc: [
      "Потенциальные посетители: 15 097 жителей пилотных территорий плюс 2% остальных жителей Тюмени.",
      "8 посещений на человека в год; 45% посещений сопровождаются расходами; средний чек — 350 ₽.",
      "Прямая ВДС = расходы × 80% локального оборота × 45% доли ВДС.",
      "Показанная итоговая ВДС включает сценарный мультипликатор 2,2.",
    ],
    none: [
      "Туристическая надбавка 10% не применялась.",
      "Мультипликатор не подтверждён официальной таблицей «затраты–выпуск».",
    ],
  },
  constructionGva: {
    title: "Прямая ВДС строительства",
    lead: "Добавленная стоимость, создаваемая непосредственно на инвестиционной стадии проекта.",
    calc: [
      "Компонентный CAPEX без НДС умножен на локализацию 80% и долю ВДС строительства 48,18%.",
      "При строительстве за один год показатель соответствует ВДС строительства за год.",
    ],
    none: [
      "ВДС эксплуатации и расходы посетителей не включены.",
      "Без календаря строительства показатель относится ко всей инвестиционной стадии.",
    ],
  },
  visits: {
    title: "Затраты труда проекта",
    lead: "Сумма инвестиционных и эксплуатационных человеко-лет за горизонт модели.",
    calc: ["Локализованный выпуск умножен на 0,324079 чел.-года на 1 млн ₽ в ценах 2026 года."],
    none: ["Это не посещаемость парка и не число постоянных рабочих мест."],
  },
  jobs: {
    title: "Временная занятость строительства",
    lead: "Сценарная занятость инвестиционной стадии в человеко-годах.",
    calc: ["Локализованный строительный выпуск умножен на отраслевой коэффициент занятости."],
    none: ["Постоянная эксплуатационная занятость показана отдельно в книге."],
  },
  co2: {
    title: "Дополнительное чистое поглощение CO₂",
    lead: "Сценарная разница между вариантами с проектом и без проекта.",
    calc: ["Учтены только 10% чисто дополнительных деревьев, приживаемость 85% и зрелость 60%."],
    none: ["Существующий лес и газон не записаны в эффект проекта.", "Выбросы строительства и обслуживания не вычтены."],
  },
  coolTemp: {
    title: "Накопленное поглощение CO₂",
    lead: "Сумма сценарного дополнительного чистого поглощения за 20 лет.",
    calc: ["Среднегодовой поток умножен на 20 лет."],
    none: ["Это не запас углерода и не измеренное снижение температуры."],
  },
  peakMoney: {
    title: "EAD (ожидаемый среднегодовой ущерб)",
    lead: "EAD (ожидаемый среднегодовой ущерб). Здесь показан нижний сценарный прокси предотвращённого эффекта.",
    calc: ["Минимальные восстановительные затраты × вероятность события 10% × предотвращаемая доля 15%."],
    none: ["Без карт глубин и кривых ущерба это не полная оценка ожидаемого среднегодового ущерба."],
  },
  peakM3: {
    title: "Дополнительное удержание стока",
    lead: "Сценарная разница относительно существующего леса и кустарника.",
    calc: ["Базовый сценарий: 8 мм/год × площадь зоны воздействия × 10 м³ на мм·га."],
    none: ["Низкий сценарий допускает ухудшение из-за новых покрытий."],
  },
  amenityH: {
    title: "YLL — годы потерянной жизни",
    lead: "Сценарная оценка предотвращённых лет потерянной жизни.",
    calc: ["Включены физическая активность, жара и PM2.5."],
    none: ["Подтопления и NO₂ в итог не включены."],
  },
  coolHealth: {
    title: "YLD — годы жизни с нарушением здоровья",
    lead: "Сценарная оценка лет жизни с инвалидностью.",
    calc: ["Включён только канал психического здоровья."],
    none: ["YLD жары, загрязнения и физической активности не рассчитаны."],
  },
  amenity20: {
    title: "DALY — годы потерянной здоровой жизни за 20 лет",
    lead: "Частичный сценарный результат высокой неопределённости.",
    calc: ["DALY = YLL + YLD: потери из-за преждевременной смерти плюс годы жизни с нарушением здоровья.", "Применено линейное формирование эффекта в течение 5 лет."],
    none: ["Основной результат здоровья не дисконтирован."],
  },
  daly: {
    title: "Статус оценки DALY",
    lead: "Расчёт частичный и сценарный, а не наблюдаемый эффект.",
    calc: ["Базовый сценарий включает физическую активность, психику, жару и PM2.5."],
    none: ["DALY от подтоплений не рассчитаны; NO₂ исключён из-за двойного учёта."],
  },
  floodH: {
    title: "Минимальные предотвращённые выплаты",
    lead: "Сценарная оценка только единовременной помощи.",
    calc: ["15 тыс. ₽ × сценарный охват × вероятность события × предотвращаемая доля."],
    none: ["Имущественные выплаты и полный экономический ущерб не включены."],
  },
  cases: {
    title: "Здоровье при подтоплениях",
    lead: "Расчёт не выполнен из-за недостатка данных.",
    calc: ["Нужны отдельные вероятности травм, инфекций и психических исходов, длительность и disability weights."],
    none: ["Единая доля заболевших из старой модели не применялась."],
  },
});

function fillEffectMethod(topic) {
  const item = EFFECT_METHOD[topic];
  const title = document.getElementById("effect-method-title");
  const body = document.getElementById("effect-method-body");
  if (!item || !title || !body) return false;
  title.textContent = item.title;
  const none = item.none
    ? `<h4 class="modal-h">Чего в этой цифре нет</h4><ul class="method-list">${item.none
        .map((x) => `<li>${x}</li>`)
        .join("")}</ul>`
    : "";
  const foot = item.foot ? `<p class="footnote">${item.foot}</p>` : "";
  body.innerHTML = `
    <p class="note">${item.lead}</p>
    <h4 class="modal-h">Что считает модель</h4>
    <ul class="method-list">${item.calc.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${none}
    ${foot}`;
  return true;
}

function fillStatGrid(el, rows) {
  if (!el) return;
  el.innerHTML = rows
    .map(
      (r) => `
    <div class="stat${r.wide ? " wide" : ""}${r.info ? " has-info" : ""}">
      ${
        r.info
          ? `<button type="button" class="method-btn stat-info" data-open="effect-method" data-topic="${r.info}" aria-label="Информация">i</button>`
          : ""
      }
      <div class="num">${r.num}</div>
      <div class="lbl">${r.lbl}</div>
    </div>`
    )
    .join("");
}

function fillPartEffects(key, partN, partH, partE, partF) {
  fillStatGrid(document.getElementById("econ-amenity-" + key), [
    { num: moneyMln(partN.constructionGvaMln), lbl: "прямая ВДС строительства; при реализации за 1 год — ВДС/год", info: "constructionGva" },
    { num: moneyMln(partN.visitorGvaMln), lbl: "ВДС от посещения благоустроенных парков в год, включая мультипликатор 2,2", info: "visitorGva" },
    { num: moneyMln(partN.budget), lbl: "налоги и страховые взносы за 20 лет", info: "taxes" },
    { num: fmtInt(partN.visitorPopulation), lbl: "потенциальных посетителей парка", info: "visitorGva" },
    { num: fmtInt(partN.visitorVisitsYear), lbl: "посещений парка в год", info: "visitorGva" },
    { num: moneyMln(partN.visitorSpendMln), lbl: "расходы посетителей в год", info: "visitorGva" },
  ]);
  fillStatGrid(document.getElementById("econ-shore-" + key), [
    { num: fmt(partH.floodH, 3), lbl: "предотвращённые минимальные бюджетные выплаты, млн ₽/год", info: "floodH" },
    { num: fmt(partE.peakCut, 0), lbl: "дополнительное удержание стока, м³/год", info: "peakM3" },
  ]);
  fillStatGrid(document.getElementById("eco-" + key), [
    { num: fmt(partE.co2, 1), lbl: "дополнительное чистое поглощение CO₂, т/год", info: "co2" },
    { num: fmt(partF.amenityGreen20, 1), lbl: "накопленное поглощение CO₂ за 20 лет, т", info: "coolTemp" },
  ]);
  fillStatGrid(document.getElementById("health-amenity-" + key), [
    { num: fmt(partH.amenityH, 2), lbl: "YLL — предотвращённые потерянные годы жизни в год", info: "amenityH" },
    { num: fmt(partH.coolHealth, 3), lbl: "YLD — предотвращённые годы с нарушением здоровья в год", info: "coolHealth" },
    { num: fmt(partF.daly20, 1), lbl: "DALY — предотвращённые потери здоровой жизни за 20 лет", info: "amenity20" },
  ]);
}

function fillGreen(el, part) {
  if (!el) return;
  const tree0 = part.trees * MODEL.trees.price;
  const companion0 = part.greenHa * MODEL.trees.companionPerHa;
  const raw = tree0 + companion0;
  const scale = raw ? part.greenRub / raw : 1;
  const rows = [
    ["Посадки деревьев", tree0 * scale],
    ["Сопутствующие посадки", companion0 * scale],
  ];
  const max = Math.max(...rows.map((r) => r[1]), 1);
  barList(
    el,
    rows.map(([name, v]) => ({
      name,
      pct: (v / max) * 100,
      val: fmt(v / 1e6, 0) + " млн",
    }))
  );
}

function fillAmenity(el, part) {
  if (!el) return;
  const rows = [
    ["Дорожки", part.pathRub],
    ["Клумбы", part.flowerRub],
    ["Детские площадки", part.playgroundRub],
    ["МАФ и свет", part.mafRub],
    ["Туалеты", part.toiletRub],
    ["Питание (фудтраки и кафе)", part.truckRub + part.cafeRub],
  ];
  const max = Math.max(...rows.map((r) => r[1]), 1);
  barList(
    el,
    rows.map(([name, v]) => ({
      name,
      pct: (v / max) * 100,
      val: fmt(v / 1e6, 0) + " млн",
    }))
  );
}

function fillEng(el, part, withBridge) {
  if (!el) return;
  const items = [
    { name: "Берегоукрепление", v: part.shoreRub, tone: "river" },
    { name: "Ливневая канализация и очистка", v: part.stormTreatRub, tone: "" },
  ];
  if (withBridge && part.bridgeRub) {
    items.push({ name: "Пешеходный мост", v: part.bridgeRub, tone: "sand" });
  }
  const max = Math.max(...items.map((i) => i.v), 1);
  barList(
    el,
    items.map((i) => ({
      name: i.name,
      pct: (i.v / max) * 100,
      val: fmt(i.v / 1e6, 0) + " млн",
      tone: i.tone,
    }))
  );
}

function scPick(values, key) {
  return values[scenarioIndex(key)];
}

function scFmtSigned(n, digits, suffix) {
  const text = fmt(Math.abs(n), digits) + (suffix || "");
  return n < 0 ? "−" + text : text;
}

function scFmtDelta(n, digits) {
  if (Object.is(n, 0) || Math.abs(n) < 5 * Math.pow(10, -digits - 1)) {
    return fmt(0, digits);
  }
  return (n > 0 ? "+" : "−") + fmt(Math.abs(n), digits);
}

function fillScenarios() {
  const S = SCENARIOS;
  const key = STATE.effectScenario || "base";
  const lead = document.getElementById("sc-lead");
  const kpis = document.getElementById("sc-kpis");
  const table = document.getElementById("sc-table");
  if (!lead || !kpis || !table) return;

  lead.textContent = S.leads[key];

  const kpiRows = [
    { label: "предотвращённые DALY (потерянные годы здоровой жизни) за 20 лет", value: scPick(S.health.daly20, key), text: fmt(scPick(S.health.daly20, key), 1) },
    { label: "дополнительное поглощение CO₂ (углекислого газа) за 20 лет", value: scPick(S.co2.y20, key), text: fmt(scPick(S.co2.y20, key), 0) + " т" },
    { label: "дополнительное удержание стока за 20 лет", value: scPick(S.runoff.y20, key), text: scFmtSigned(scPick(S.runoff.y20, key), 0, " м³") },
    { label: "предотвращённый EAD (ожидаемый среднегодовой ущерб), прокси", value: scPick(S.flood.eadAvoided, key), text: fmt(scPick(S.flood.eadAvoided, key), 3) + " млн ₽/год" },
    { label: "минимальные предотвращённые выплаты", value: scPick(S.flood.payoutYear, key), text: fmt(scPick(S.flood.payoutYear, key), 2) + " млн ₽/год" },
    { label: "прямая ВДС (валовая добавленная стоимость) строительства", value: scPick(S.economy.constructionGva, key), text: moneyMln(scPick(S.economy.constructionGva, key)) },
  ];
  kpis.innerHTML = kpiRows
    .map(
      (row) => `
    <div class="stat${row.value < 0 ? " is-neg" : ""}">
      <div class="num">${row.text}</div>
      <div class="lbl">${row.label}</div>
    </div>`
    )
    .join("");

  const groups = [
    {
      title: "Здоровье",
      tone: "health",
      rows: [
        { name: "YLL (потерянные годы жизни) в год", vals: S.health.yllYear, digits: 2, unit: "YLL" },
        { name: "YLD (годы жизни с нарушением здоровья) в год", vals: S.health.yldYear, digits: 3, unit: "YLD" },
        { name: "DALY (потерянные годы здоровой жизни) в год", vals: S.health.dalyYear, digits: 2, unit: "DALY" },
        { name: "DALY (потерянные годы здоровой жизни) за 20 лет", vals: S.health.daly20, digits: 1, unit: "DALY" },
        { name: "DALY (потерянные годы здоровой жизни) на 1 000 жителей", vals: S.health.dalyPer1000, digits: 2, unit: "DALY/1000" },
      ],
    },
    {
      title: "Экология",
      tone: "eco",
      rows: [
        { name: "Дополнительное поглощение CO₂ (углекислого газа) в год", vals: S.co2.year, digits: 1, unit: "т/год" },
        { name: "Дополнительное поглощение CO₂ (углекислого газа) за 20 лет", vals: S.co2.y20, digits: 0, unit: "т" },
        { name: "Дополнительное удержание стока в год", vals: S.runoff.year, digits: 0, unit: "м³/год" },
        { name: "Дополнительное удержание стока за 20 лет", vals: S.runoff.y20, digits: 0, unit: "м³" },
      ],
    },
    {
      title: "Защита от подтопления",
      tone: "flood",
      rows: [
        { name: "Предотвращённый EAD (ожидаемый среднегодовой ущерб), прокси", vals: S.flood.eadAvoided, digits: 3, unit: "млн ₽/год" },
        { name: "PV (приведённая стоимость) предотвращённого EAD (ожидаемый среднегодовой ущерб), 20 лет", vals: S.flood.eadPv20, digits: 2, unit: "млн ₽" },
        { name: "Минимальные выплаты бюджета", vals: S.flood.payoutYear, digits: 2, unit: "млн ₽/год" },
      ],
    },
    {
      title: "Экономика строительства",
      tone: "econ",
      rows: [
        { name: "Прямая ВДС (валовая добавленная стоимость) строительства", vals: S.economy.constructionGva, digits: 0, unit: "млн ₽" },
        { name: "Временная занятость", vals: S.economy.jobs, digits: 0, unit: "чел.-лет" },
        { name: "Налоги и взносы строительства", vals: S.economy.fiscal, digits: 0, unit: "млн ₽" },
      ],
    },
  ];

  const keys = ["low", "base", "high"];
  const head = `
    <thead>
      <tr>
        <th>Показатель</th>
        <th class="num sc-col" data-sc="low">Низкий<br><span class="sc-delta-hint">к базовому</span></th>
        <th class="num sc-col" data-sc="base">Базовый</th>
        <th class="num sc-col" data-sc="high">Высокий<br><span class="sc-delta-hint">к базовому</span></th>
        <th>Ед.</th>
      </tr>
    </thead>`;
  const body = groups
    .map((group) => {
      const title = `<tr class="sc-group"><td colspan="5">${group.title}</td></tr>`;
      const rows = group.rows
        .map((row) => {
          const base = row.vals[1];
          const cells = keys
            .map((k, i) => {
              const raw = row.vals[i];
              const value = k === "base" ? raw : raw - base;
              const text = k === "base" ? (raw < 0 ? scFmtSigned(raw, row.digits) : fmt(raw, row.digits)) : scFmtDelta(value, row.digits);
              const tone = value < 0 ? " is-neg" : value > 0 && k !== "base" ? " is-pos" : "";
              return `<td class="num sc-col${tone}" data-sc="${k}">${text}</td>`;
            })
            .join("");
          return `<tr><td>${row.name}</td>${cells}<td>${row.unit}</td></tr>`;
        })
        .join("");
      return `<tbody class="sc-block tone-${group.tone}">${title}${rows}</tbody>`;
    })
    .join("");
  table.dataset.sc = key;
  table.innerHTML = head + body;
}

function render() {
  const m = compute();
  fillScenarios();

  document.getElementById("char-p1").innerHTML = `
      <div><b>${fmtInt(m.h1.nearby)}</b><br>постоянных жителей</div>
      <div><b>${fmtInt(m.h1.houses)}</b><br>объектов — верхняя граница</div>`;
  document.getElementById("acts-p1").innerHTML = `
      <div><b>${fmt(m.p1.greenHa, 1)} га</b><br>озеленение</div>
      <div><b>${fmtInt(m.p1.trees)}</b><br>деревьев</div>
      <div><b>1,51 км</b><br>берегоукрепления</div>
      <div><b>303 м</b><br>пешеходный мост</div>`;
  document.getElementById("cost-p1").innerHTML = `
      <div><b>${moneyMln(m.p1.total / 1e6)}</b><br>CAPEX части</div>
      <div><b>${moneyMln(m.f1.opex)}/год</b><br>эксплуатационные расходы (OPEX)</div>`;
  fillPartEffects("p1", m.n1, m.h1, m.e1, m.f1);
  document.getElementById("char-p2").innerHTML = `
      <div><b>${fmtInt(m.h2.nearby)}</b><br>постоянных жителей</div>
      <div><b>${fmtInt(m.h2.houses)}</b><br>объектов — верхняя граница</div>`;
  document.getElementById("acts-p2").innerHTML = `
      <div><b>${fmt(m.p2.greenHa, 1)} га</b><br>озеленение</div>
      <div><b>${fmtInt(m.p2.trees)}</b><br>деревьев</div>
      <div><b>3,53 км</b><br>берегоукрепления</div>`;
  document.getElementById("cost-p2").innerHTML = `
      <div><b>${moneyMln(m.p2.total / 1e6)}</b><br>CAPEX части</div>
      <div><b>${moneyMln(m.f2.opex)}/год</b><br>эксплуатационные расходы (OPEX)</div>`;
  fillPartEffects("p2", m.n2, m.h2, m.e2, m.f2);
  fillReportPane(m);

  const capexParts = (part) => [
    { label: "Озеленение", value: part.greenRub / 1e6, color: PALETTE.moss },
    { label: "Благоустройство", value: part.amenityRub / 1e6, color: PALETTE.sand, ink: PALETTE.pine },
    { label: "Инженерная защита", value: part.engRub / 1e6, color: PALETTE.river },
  ];
  stackedHbar("chart-capex-p2", capexParts(m.p2));
  stackedHbar("chart-capex-p1", capexParts(m.p1));

  document.getElementById("capex-dok-total").textContent = moneyMln(m.p2.total / 1e6);
  document.getElementById("capex-ob-total").textContent = moneyMln(m.p1.total / 1e6);
  document.getElementById("green-sum-p2").textContent = moneyMln(m.p2.greenRub / 1e6);
  document.getElementById("green-sum-p1").textContent = moneyMln(m.p1.greenRub / 1e6);
  document.getElementById("amenity-sum-p2").textContent = moneyMln(m.p2.amenityRub / 1e6);
  document.getElementById("amenity-sum-p1").textContent = moneyMln(m.p1.amenityRub / 1e6);
  document.getElementById("eng-sum-p2").textContent = moneyMln(m.p2.engRub / 1e6);
  document.getElementById("eng-sum-p1").textContent = moneyMln(m.p1.engRub / 1e6);
  document.getElementById("green-note-p2").textContent =
    fmt(m.p2.greenHa, 1) + " га зоны посадок · " + fmtInt(m.p2.trees) + " деревьев";
  document.getElementById("green-note-p1").textContent =
    fmt(m.p1.greenHa, 1) + " га зоны посадок · " + fmtInt(m.p1.trees) + " деревьев";
  document.getElementById("amenity-note-p2").textContent = fmt(m.p2.activeHa, 1) + " га интенсивного использования";
  document.getElementById("amenity-note-p1").textContent = fmt(m.p1.activeHa, 1) + " га интенсивного использования";

  fillGreen(document.getElementById("green-bars-p2"), m.p2);
  fillGreen(document.getElementById("green-bars-p1"), m.p1);
  fillEng(document.getElementById("eng-bars-p2"), m.p2, false);
  fillEng(document.getElementById("eng-bars-p1"), m.p1, true);
  fillAmenity(document.getElementById("amenity-bars-p2"), m.p2);
  fillAmenity(document.getElementById("amenity-bars-p1"), m.p1);

  document.getElementById("tbl-capex").innerHTML = `
    <thead><tr><th></th><th>мкрн ДОК</th><th>мкрн Оброчное</th><th>Итого</th></tr></thead>
    <tbody>
      <tr><td>Озеленение, млн ₽</td><td class="num">${fmt(m.p2.greenRub / 1e6, 1)}</td><td class="num">${fmt(m.p1.greenRub / 1e6, 1)}</td><td class="num">${fmt(m.greenRub / 1e6, 1)}</td></tr>
      <tr><td>Благоустройство, млн ₽</td><td class="num">${fmt(m.p2.amenityRub / 1e6, 1)}</td><td class="num">${fmt(m.p1.amenityRub / 1e6, 1)}</td><td class="num">${fmt(m.amenityRub / 1e6, 1)}</td></tr>
      <tr><td>Инженерная защита, млн ₽</td><td class="num">${fmt(m.p2.engRub / 1e6, 1)}</td><td class="num">${fmt(m.p1.engRub / 1e6, 1)}</td><td class="num">${fmt(m.engRub / 1e6, 1)}</td></tr>
      <tr class="total"><td>CAPEX всего, млн ₽</td><td class="num">${fmt(m.p2.total / 1e6, 1)}</td><td class="num">${fmt(m.p1.total / 1e6, 1)}</td><td class="num">${fmt(m.capexMln, 1)}</td></tr>
      <tr><td>На 1 га территории, млн ₽/га</td><td class="num">${fmt(m.p2.total / 1e6 / MODEL.parts.p2.areaHa, 2)}</td><td class="num">${fmt(m.p1.total / 1e6 / MODEL.parts.p1.areaHa, 2)}</td><td class="num">${fmt(m.capexMln / m.area, 2)}</td></tr>
    </tbody>`;

  document.getElementById("ncs-note").textContent =
    `НЦС-референс полного озеленения парка на ${fmt(m.greenHa, 0)} га зоны посадок — около ${fmt(m.ncsMln / 1000, 1)} млрд ₽. Компонентный метод модели (${fmt(m.greenRub / 1e6, 0)} млн ₽) — ${fmt((m.greenRub / 1e6 / m.ncsMln) * 100, 0)}% от НЦС: лесопарковый состав, без полного паркового комплекса.`;

  fillFunding(m);

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("i-area", fmt(m.area, 1) + " га");
  setText("i-trees", fmtInt(m.trees));
  setText("i-shore", fmt(m.shoreM / 1000, 2) + " км");
  setText("i-capex", moneyMln(m.capexMln));
  setText("i-city", fmt(m.cityYear, 0));
  setText("i-npv", moneyMln(m.budget));
  setText("i-green20", fmt(m.co220, 1) + " т");
  setText("i-daly", fmt(m.daly20, 1));
  document.getElementById("i-shore-meta").innerHTML = `
    <div><b>${fmtInt(m.prot)}</b><br>жителей зоны защиты</div>
    <div><b>${fmt(m.floodMln, 3)} млн ₽/год</b><br>EAD (ожидаемый среднегодовой ущерб), прокси</div>
    <div><b>${fmt(m.peakCut, 0)} м³/год</b><br>дополнительное удержание стока</div>`;
  document.getElementById("i-amen-meta").innerHTML = `
    <div><b>${fmt(m.co2, 1)} т CO₂/год</b><br>дополнительное чистое поглощение</div>
    <div><b>${fmt(m.dalyYear, 2)} DALY/год</b><br>частичный сценарный эффект здоровья</div>
    <div><b>${fmt(m.dalyPer1000, 1)}</b><br>DALY на 1 000 за 20 лет</div>`;
}

function bindModal() {
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      const dlg = document.getElementById(openBtn.dataset.open);
      if (!dlg || typeof dlg.showModal !== "function") return;
      if (openBtn.dataset.topic && !fillEffectMethod(openBtn.dataset.topic)) return;
      dlg.showModal();
      return;
    }
    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn) {
      const dlg = document.getElementById(closeBtn.dataset.close);
      if (dlg) dlg.close();
    }
  });
  document.querySelectorAll("dialog.modal").forEach((dlg) => {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  });
}

function bind() {
  bindModal();
  document.querySelectorAll("#scenarii .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#scenarii .chip").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      STATE.effectScenario = btn.dataset.sc;
      fillScenarios();
    });
  });

  const bindRange = (id, out, fn) => {
    const el = document.getElementById(id);
    const o = document.getElementById(out);
    if (!el) return;
    const apply = () => {
      fn(Number(el.value), o);
      render();
    };
    el.addEventListener("input", apply);
  };

  bindRange("s-attract", "o-attract", (v, o) => {
    STATE.attract = v / 100;
    o.textContent = v + "%";
  });
  bindRange("s-visits", "o-visits", (v, o) => {
    STATE.visits = v;
    o.textContent = String(v);
  });
  bindRange("s-house", "o-house", (v, o) => {
    STATE.housingUplift = v / 10 / 100;
    o.textContent = fmt(v / 10, 1) + "%";
  });
  bindRange("s-prev", "o-prev", (v, o) => {
    STATE.preventShare = v / 100;
    o.textContent = v + "%";
  });
  bindRange("s-green", "o-green", (v, o) => {
    STATE.greenShare = v / 100;
    o.textContent = v + "%";
  });
  bindRange("s-active", "o-active", (v, o) => {
    STATE.activeShare = v / 100;
    o.textContent = v + "%";
  });
  bindRange("s-new-active", "o-new-active", (v, o) => {
    STATE.newActiveShare = v / 100;
    o.textContent = v + "%";
  });

  bindItogiToc();
  bindNav();
  bindReport();
}

function hashId() {
  return (location.hash || "#obzor").slice(1);
}

function paneForId(id) {
  if (id === "karta") return "obzor";
  if (id === "zdorovie" || id === "effekty") return "scenarii";
  if (id === "problemy") return "itogi";
  const el = document.getElementById(id);
  if (!el) return "obzor";
  if (el.classList.contains("pane")) return el.id;
  const pane = el.closest(".pane");
  return pane ? pane.id : "obzor";
}

function currentPane() {
  return paneForId(hashId());
}

function hashTarget() {
  const id = hashId();
  const el = document.getElementById(id);
  if (!el || el.classList.contains("pane")) return null;
  return el;
}

function paneScroller(pane) {
  if (!pane) return null;
  if (pane.id === "itogi") return pane.querySelector(".itogi-scroll") || pane;
  return pane;
}

function itogiTocOffset() {
  return 12;
}

function scrollPaneTo(pane, target) {
  const scroller = paneScroller(pane);
  if (!scroller) return;
  if (!target || !pane.contains(target)) {
    scroller.scrollTop = 0;
    return;
  }
  const top =
    target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - itogiTocOffset();
  scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function headingSlug(text, index) {
  const slug = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return slug || "h" + index;
}

let itogiTocLockId = "";
let itogiTocLockTimer = 0;

function setItogiTocActive(id) {
  const toc = document.getElementById("itogi-toc");
  if (!toc) return;
  toc.querySelectorAll("a").forEach((a) => {
    const on = a.getAttribute("href") === "#" + id;
    a.classList.toggle("is-on", on);
    if (on) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}

function lockItogiToc(id) {
  itogiTocLockId = id;
  setItogiTocActive(id);
  window.clearTimeout(itogiTocLockTimer);
  itogiTocLockTimer = window.setTimeout(() => {
    itogiTocLockId = "";
    syncItogiToc();
  }, 800);
}

function bindItogiToc() {
  const pane = document.getElementById("itogi");
  const toc = document.getElementById("itogi-toc");
  if (!pane || !toc) return;

  const headings = [...pane.querySelectorAll("h2")];
  toc.replaceChildren();
  headings.forEach((h, index) => {
    if (!h.id) h.id = "itogi-" + headingSlug(h.textContent, index);
    const a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = (h.dataset.toc || h.textContent || "").trim();
    toc.appendChild(a);
  });

  toc.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    e.preventDefault();
    lockItogiToc(href.slice(1));
    goHash(href.slice(1));
  });

  const scroller = paneScroller(pane);
  if (scroller) {
    scroller.addEventListener("scroll", syncItogiToc, { passive: true });
    scroller.addEventListener("scrollend", () => {
      itogiTocLockId = "";
      syncItogiToc();
    });
  }
  window.addEventListener("resize", syncItogiToc);
}

function syncItogiToc() {
  const pane = document.getElementById("itogi");
  const toc = document.getElementById("itogi-toc");
  if (!pane || !toc || !pane.classList.contains("is-on")) return;
  if (itogiTocLockId) {
    setItogiTocActive(itogiTocLockId);
    return;
  }
  const scroller = paneScroller(pane);
  if (!scroller) return;
  const headings = [...pane.querySelectorAll("h2")];
  if (!headings.length) return;
  const scrollerTop = scroller.getBoundingClientRect().top;
  const marker = scrollerTop + 12;
  let current = headings[0];
  headings.forEach((h) => {
    if (h.getBoundingClientRect().top <= marker) current = h;
  });
  const last = headings[headings.length - 1];
  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  const lastTarget =
    last.getBoundingClientRect().top - scrollerTop + scroller.scrollTop - 12;
  if (maxScroll > 0 && scroller.scrollTop >= Math.min(Math.max(0, lastTarget), maxScroll) - 4) {
    current = last;
  }
  setItogiTocActive(current.id);
}

function goHash(id) {
  if (hashId() === id) showPane(paneForId(id));
  else location.hash = id;
}

function showPane(id) {
  document.querySelectorAll(".pane").forEach((el) => {
    el.classList.toggle("is-on", el.id === id);
  });
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const on = a.getAttribute("href") === "#" + id;
    a.classList.toggle("is-on", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const pane = document.getElementById(id);
  const target = hashTarget();
  if (pane) {
    const scroller = paneScroller(pane);
    if (target && pane.contains(target)) {
      requestAnimationFrame(() => {
        scrollPaneTo(pane, target);
        syncItogiToc();
      });
    } else if (scroller) {
      scroller.scrollTop = 0;
      syncItogiToc();
    }
  }
  requestAnimationFrame(() => {
    Object.values(charts).forEach((c) => {
      if (c && typeof c.resize === "function") c.resize();
    });
    if (id === "obzor" && mapRef) {
      mapRef.invalidateSize();
      setTimeout(() => mapRef.invalidateSize(), 80);
    }
    if (id === "territorii") {
      syncSiteMaps();
      setTimeout(syncSiteMaps, 80);
    }
    if (id === "itogi") {
      syncPrkMap();
      setTimeout(syncPrkMap, 80);
    }
  });
}

function bindNav() {
  document.querySelectorAll(".nav-links a, a.nav-logos, .map-tools a, a.jump-pane").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      e.preventDefault();
      goHash(href.slice(1));
    });
  });
  window.addEventListener("hashchange", () => showPane(currentPane()));
}

initMap();
initSiteMaps();
initPrkMap();
lineFlood();
bind();
showPane(currentPane());
render();
