const DOCX_FONT = "Montserrat";
const DOCX_C = {
  ink: "1F2D63",
  moss: "144992",
  sand: "DDA13B",
  river: "5BA0D8",
  flood: "F15C28",
  paper: "F1ECE3",
  leaf: "F2C682",
  white: "FAF8F4",
  mute: "5A6480",
  line: "C5CBD8",
  pineSoft: "E8EDF6",
  sandSoft: "F8EFDC",
  riverSoft: "E7F2FA",
  floodSoft: "FDE8E1",
  cream: "FAF8F4",
};

function docxLib() {
  const lib = window.docx;
  if (!lib || !lib.patchDocument) throw new Error("Библиотека docx не загружена");
  return lib;
}

function docxTwip() {
  return docxLib().convertMillimetersToTwip(174);
}

function docxRun(text, opt) {
  const D = docxLib();
  const o = opt || {};
  return new D.TextRun({
    text: String(text ?? ""),
    font: DOCX_FONT,
    size: o.size || 20,
    bold: !!o.bold,
    color: o.color || DOCX_C.ink,
  });
}

function docxPara(text, opt) {
  const D = docxLib();
  const o = opt || {};
  return new D.Paragraph({
    spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 },
    alignment: o.align,
    children: Array.isArray(text) ? text : [docxRun(text, o)],
  });
}

function docxBorders(color) {
  const D = docxLib();
  const edge = { style: D.BorderStyle.SINGLE, size: 4, color: color || DOCX_C.line };
  return { top: edge, bottom: edge, left: edge, right: edge };
}

function docxCell(text, opt) {
  const D = docxLib();
  const o = opt || {};
  const dark = o.fill === DOCX_C.ink || o.fill === DOCX_C.moss;
  const children = Array.isArray(text)
    ? text
    : [
        new D.Paragraph({
          alignment: o.align || D.AlignmentType.LEFT,
          spacing: { after: 0, before: 0 },
          children: [
            docxRun(text, {
              size: o.size || 18,
              bold: o.bold,
              color: o.color || (dark ? DOCX_C.paper : DOCX_C.ink),
            }),
          ],
        }),
      ];
  return new D.TableCell({
    width: o.width ? { size: o.width, type: D.WidthType.DXA } : undefined,
    columnSpan: o.span,
    shading: o.fill ? { type: D.ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: o.pad ?? 70, bottom: o.pad ?? 70, left: 90, right: 90 },
    verticalAlign: D.VerticalAlign.CENTER,
    borders: docxBorders(o.border || (o.fill === DOCX_C.ink ? DOCX_C.ink : DOCX_C.line)),
    children,
  });
}

function docxTable(rows, widths) {
  const D = docxLib();
  const total = widths.reduce((sum, w) => sum + w, 0);
  return new D.Table({
    width: { size: total, type: D.WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (cells) =>
        new D.TableRow({
          cantSplit: true,
          children: cells,
        })
    ),
  });
}

function docxStatTable(items, cols) {
  const columns = cols || 4;
  const unit = Math.floor(docxTwip() / columns);
  const widths = Array(columns).fill(unit);
  const rows = [];
  for (let i = 0; i < items.length; i += columns) {
    const slice = items.slice(i, i + columns);
    while (slice.length < columns) slice.push({ num: "", lbl: "" });
    rows.push(
      slice.map((item) =>
        docxCell(
          [
            docxPara(item.num, { size: 28, bold: true, after: 40 }),
            docxPara(item.lbl, { size: 16, color: DOCX_C.mute, after: 0 }),
          ],
          { width: unit, fill: item.fill || DOCX_C.cream }
        )
      )
    );
  }
  return docxTable(rows, widths);
}

function docxImage(dataUrl, width, height, name) {
  const D = docxLib();
  return new D.ImageRun({
    data: dataUrl,
    transformation: { width: width, height: height },
    altText: {
      name: name || "Picture",
      title: name || "Picture",
      description: name || "Picture",
    },
  });
}

function docxImagePara(dataUrl, width, height, name) {
  const D = docxLib();
  if (!dataUrl) return docxPara("Изображение недоступно.", { size: 18, color: DOCX_C.mute });
  return new D.Paragraph({
    spacing: { after: 80 },
    children: [docxImage(dataUrl, width, height, name || "Карта отчета")],
  });
}

function docxLoadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function docxRasterize(src, height) {
  const img = await docxLoadImage(src);
  if (!img) return "";
  const width = Math.max(1, Math.round((img.naturalWidth / Math.max(img.naturalHeight, 1)) * height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function docxParsePts(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter((pt) => pt.length === 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
}

async function docxComposeMap(kind, width, height, baseSrc) {
  const spec = reportMapSpec(kind);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#121a3a";
  ctx.fillRect(0, 0, width, height);
  if (baseSrc) {
    const img = await docxLoadImage(baseSrc);
    if (img) ctx.drawImage(img, 0, 0, width, height);
  }
  if (!spec) return canvas.toDataURL("image/png");
  spec.bbox = fitBboxToAspect(spec.bbox, width, height);
  spec.features.forEach((feature) => {
    const pts = docxParsePts(reportProjectPts(feature.pts, spec.bbox, width, height));
    if (pts.length < 2) return;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (feature.type === "poly") {
      ctx.closePath();
      ctx.fillStyle = "rgba(20,73,146,0.38)";
      ctx.fill();
      ctx.strokeStyle = "#dda13b";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (feature.label) {
        const [lat, lon] = reportCentroid(feature.pts);
        const label = docxParsePts(reportProjectPts([[lat, lon]], spec.bbox, width, height))[0];
        if (label) {
          ctx.font = "800 22px Montserrat, Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.lineWidth = 5;
          ctx.strokeStyle = "#1f2d63";
          ctx.fillStyle = "#faf8f4";
          ctx.strokeText(feature.label, label[0], label[1]);
          ctx.fillText(feature.label, label[0], label[1]);
        }
      }
      return;
    }
    ctx.strokeStyle = feature.type === "bridge" ? "#f4742c" : feature.type === "prk" ? "#99479b" : "#5ba0d8";
    ctx.lineWidth = feature.type === "bridge" ? 6 : feature.type === "prk" ? 4 : 5;
    ctx.lineCap = "round";
    ctx.stroke();
  });
  return canvas.toDataURL("image/png");
}

function docxMoney(n) {
  return typeof reportMoney === "function" ? reportMoney(n) : fmt(n, 1) + " млн ₽";
}

function docxArticleTable(title, sum, note, rows, tone) {
  const fill = tone === "sand" ? DOCX_C.sandSoft : tone === "river" ? DOCX_C.riverSoft : DOCX_C.pineSoft;
  const accent = tone === "sand" ? DOCX_C.sand : tone === "river" ? DOCX_C.river : DOCX_C.moss;
  const w = docxTwip();
  const widths = [Math.round(w * 0.62), Math.round(w * 0.38)];
  const body = [
    [docxCell(title, { span: 2, width: w, fill: accent, bold: true, size: 18, color: tone === "sand" || tone === "river" ? DOCX_C.ink : DOCX_C.paper })],
    [docxCell(sum, { span: 2, width: w, fill: fill, bold: true, size: 28 })],
    [docxCell(note, { span: 2, width: w, fill: fill, size: 16, color: DOCX_C.mute })],
  ];
  rows.forEach((row) => {
    body.push([
      docxCell(row.name, { width: widths[0], fill: DOCX_C.cream }),
      docxCell(row.val, { width: widths[1], fill: DOCX_C.cream, align: docxLib().AlignmentType.RIGHT, bold: true }),
    ]);
  });
  return docxTable(body, [w]);
}

function docxScenarioPatches() {
  const S = window.SCENARIOS;
  const w = docxTwip();
  const widths = [Math.round(w * 0.42), Math.round(w * 0.14), Math.round(w * 0.14), Math.round(w * 0.16), Math.round(w * 0.14)];
  if (!S) return [docxPara("Сценарная таблица недоступна.", { color: DOCX_C.mute })];
  const groups = [
    {
      title: "Здоровье",
      rows: [
        ["YLL (потерянные годы жизни) в год", S.health.yllYear, 2, "YLL"],
        ["YLD (годы жизни с нарушением здоровья) в год", S.health.yldYear, 3, "YLD"],
        ["DALY (потерянные годы здоровой жизни) в год", S.health.dalyYear, 2, "DALY"],
        ["DALY (потерянные годы здоровой жизни) за 20 лет", S.health.daly20, 1, "DALY"],
        ["DALY (потерянные годы здоровой жизни) на 1 000 жителей", S.health.dalyPer1000, 2, "DALY/1000"],
      ],
    },
    {
      title: "Экология",
      rows: [
        ["Дополнительное поглощение CO₂ (углекислого газа) в год", S.co2.year, 1, "т/год"],
        ["Дополнительное поглощение CO₂ (углекислого газа) за 20 лет", S.co2.y20, 0, "т"],
        ["Дополнительное удержание стока в год", S.runoff.year, 0, "м³/год"],
        ["Дополнительное удержание стока за 20 лет", S.runoff.y20, 0, "м³"],
      ],
    },
    {
      title: "Защита от подтопления",
      rows: [
        ["Предотвращённый EAD (ожидаемый среднегодовой ущерб), прокси", S.flood.eadAvoided, 3, "млн ₽/год"],
        ["PV (приведённая стоимость) предотвращённого EAD, 20 лет", S.flood.eadPv20, 2, "млн ₽"],
        ["Минимальные выплаты бюджета", S.flood.payoutYear, 2, "млн ₽/год"],
      ],
    },
    {
      title: "Экономика строительства",
      rows: [
        ["Прямая ВДС (валовая добавленная стоимость) строительства", S.economy.constructionGva, 0, "млн ₽"],
        ["Временная занятость", S.economy.jobs, 0, "чел.-лет"],
        ["Налоги и взносы строительства", S.economy.fiscal, 0, "млн ₽"],
      ],
    },
  ];
  const rows = [
    [
      docxCell("Показатель", { width: widths[0], fill: DOCX_C.ink, bold: true }),
      docxCell("Низкий, к базе", { width: widths[1], fill: DOCX_C.ink, bold: true, align: docxLib().AlignmentType.RIGHT }),
      docxCell("Базовый", { width: widths[2], fill: DOCX_C.ink, bold: true, align: docxLib().AlignmentType.RIGHT }),
      docxCell("Высокий, к базе", { width: widths[3], fill: DOCX_C.ink, bold: true, align: docxLib().AlignmentType.RIGHT }),
      docxCell("Ед.", { width: widths[4], fill: DOCX_C.ink, bold: true }),
    ],
  ];
  groups.forEach((group) => {
    rows.push([docxCell(group.title, { span: 5, width: w, fill: DOCX_C.pineSoft, bold: true })]);
    group.rows.forEach(([name, vals, digits, unit]) => {
      const base = vals[1];
      rows.push([
        docxCell(name, { width: widths[0], size: 16 }),
        docxCell(reportScCell(vals[0], base, "low", digits), { width: widths[1], size: 16, align: docxLib().AlignmentType.RIGHT }),
        docxCell(reportScCell(vals[1], base, "base", digits), { width: widths[2], size: 16, bold: true, align: docxLib().AlignmentType.RIGHT }),
        docxCell(reportScCell(vals[2], base, "high", digits), { width: widths[3], size: 16, align: docxLib().AlignmentType.RIGHT }),
        docxCell(unit, { width: widths[4], size: 16, color: DOCX_C.mute }),
      ]);
    });
  });
  return [docxTable(rows, widths)];
}

function docxTextPatch(text, opt) {
  return { type: docxLib().PatchType.PARAGRAPH, children: [docxRun(text, opt)] };
}

function docxBlockPatch(children) {
  return { type: docxLib().PatchType.DOCUMENT, children: children };
}

function docxCapexBlock(part, rows, totalLabel) {
  const w = docxTwip();
  const widths = [Math.round(w * 0.4), Math.round(w * 0.3), Math.round(w * 0.3)];
  const stack = [
    { name: "Озеленение", val: fmt(part.greenRub / 1e6, 1), fill: DOCX_C.moss, color: DOCX_C.paper },
    { name: "Благоустройство", val: fmt(part.amenityRub / 1e6, 1), fill: DOCX_C.sand, color: DOCX_C.ink },
    { name: "Инженерная защита", val: fmt(part.engRub / 1e6, 1), fill: DOCX_C.river, color: DOCX_C.ink },
  ];
  const children = [
    docxPara(totalLabel, { size: 32, bold: true, after: 120 }),
    docxTable(
      [
        stack.map((item, i) =>
          docxCell(item.name + " · " + item.val, {
            width: widths[i],
            fill: item.fill,
            color: item.color,
            bold: true,
            size: 16,
          })
        ),
      ],
      widths
    ),
    docxPara("", { after: 80 }),
  ];
  rows.forEach((block) => {
    children.push(docxPara(block.title, { size: 22, bold: true, color: block.color, before: 160, after: 40 }));
    children.push(docxPara(block.sum, { size: 26, bold: true, after: 40 }));
    children.push(docxPara(block.note, { size: 16, color: DOCX_C.mute, after: 80 }));
    const lineW = [Math.round(w * 0.7), Math.round(w * 0.3)];
    children.push(
      docxTable(
        block.rows.map((row) => [
          docxCell(row.name, { width: lineW[0] }),
          docxCell(row.val, { width: lineW[1], bold: true, align: docxLib().AlignmentType.RIGHT }),
        ]),
        lineW
      )
    );
  });
  return children;
}

async function collectDocxMedia(assets) {
  const maps = assets.maps || {};
  const [logoTumen, logoAsi, logoAtre, mapAll, mapP1, mapP2, mapPrk] = await Promise.all([
    docxRasterize(assets.tumen, 56),
    docxRasterize(assets.asi, 40),
    docxRasterize(assets.atre, 40),
    docxComposeMap("all", 1280, 660, maps.all),
    docxComposeMap("p1", 1280, 720, maps.p1),
    docxComposeMap("p2", 1280, 720, maps.p2),
    docxComposeMap("prk", 1400, 780, maps.prk),
  ]);
  return { logoTumen, logoAsi, logoAtre, mapAll, mapP1, mapP2, mapPrk, floodChart: assets.floodChart || "" };
}

function buildDocxPatches(m, media) {
  const D = docxLib();
  const split = reportFunding(m);
  const p1 = m.p1;
  const p2 = m.p2;
  const date = reportDate();
  const logoRuns = [];
  [
    [media.logoTumen, 92, 48],
    [media.logoAsi, 88, 34],
    [media.logoAtre, 72, 34],
  ].forEach(([src, w, h], i) => {
    if (!src) return;
    if (i) logoRuns.push(docxRun("   ", { size: 20 }));
    logoRuns.push(docxImage(src, w, h, "Логотип " + (i + 1)));
  });

  const fundArticles = split.articles.labels.map((label, i) => {
    const fed = split.articles.federal[i];
    const loc = split.articles.local[i];
    const priv = split.articles.extra[i];
    return [label, fmt(fed, 1), fmt(loc, 1), fmt(priv, 1), fmt(fed + loc + priv, 1)];
  });
  const tw = docxTwip();
  const fundW = [Math.round(tw * 0.28), Math.round(tw * 0.18), Math.round(tw * 0.18), Math.round(tw * 0.18), Math.round(tw * 0.18)];

  return {
    report_date: docxTextPatch(date, { size: 18, color: DOCX_C.mute }),
    cover_logos: {
      type: D.PatchType.PARAGRAPH,
      children: logoRuns.length ? logoRuns : [docxRun("Тюмень 440", { size: 22, bold: true, color: DOCX_C.leaf })],
    },
    cover_formed: {
      type: D.PatchType.PARAGRAPH,
      children: [
        docxRun("Отчет сформирован автоматически. Дата формирования - " + date, {
          size: 22,
          color: "D8D3C8",
        }),
      ],
    },
    cover_stats: docxBlockPatch([
      docxStatTable([
        { num: fmt(m.area, 2) + " га", lbl: "площадь пилотных территорий" },
        { num: fmt(m.shoreM / 1000, 2) + " км", lbl: "линия берегоукрепления" },
        { num: fmtInt(m.p1.trees + m.p2.trees), lbl: "сценарное число деревьев" },
        { num: docxMoney(m.capexMln), lbl: "капитальные затраты без НДС" },
      ]),
    ]),
    map_all: docxBlockPatch([docxImagePara(media.mapAll, 640, 330, "Обзорная карта")]),
    analysis_cards: docxBlockPatch([
      docxTable(
        [
          [
            docxCell(
              [docxPara("Устойчивый рост ОПЖ", { size: 18, bold: true, color: DOCX_C.paper, after: 60 }), docxPara("Рост связан со снижением смертности от инфекций и от внешних причин, включая ДТП. Кроме того, экономический рост в городе создает дополнительные стимулы у населения к сохранению здоровья.", { size: 16, color: "D8D3C8", after: 0 })],
              { width: Math.round(tw / 3), fill: DOCX_C.ink }
            ),
            docxCell(
              [docxPara("Риски города — рост заболеваемости хроническими болезнями", { size: 18, bold: true, color: DOCX_C.ink, after: 60 }), docxPara("Увеличение ОПЖ «упирается» в хронические болезни (диабет, гипертония), а также в заболеваемость органов дыхания.", { size: 16, color: DOCX_C.ink, after: 0 })],
              { width: Math.round(tw / 3), fill: DOCX_C.sand }
            ),
            docxCell(
              [docxPara("Среда — ключевой резерв для роста ОПЖ", { size: 18, bold: true, color: DOCX_C.paper, after: 60 }), docxPara("Хронические болезни плохо поддаются только медицинской терапии — они во многом зависят от среды и повседневных привычек.", { size: 16, color: "D8D3C8", after: 0 })],
              { width: Math.round(tw / 3), fill: DOCX_C.moss }
            ),
          ],
        ],
        [Math.round(tw / 3), Math.round(tw / 3), Math.round(tw / 3)]
      ),
    ]),
    analysis_strong: docxBlockPatch([
      docxStatTable([
        { num: "73,6 ⇒ 77,0", lbl: "ОПЖ при рождении, лет", fill: DOCX_C.pineSoft },
        { num: "51,5 ⇒ 62,9%", lbl: "доля занимающихся спортом", fill: DOCX_C.pineSoft },
        { num: "4,2 ⇒ 2,5", lbl: "младенческая смертность, на 1 000 родившихся", fill: DOCX_C.pineSoft },
        { num: "8,6 ⇒ 5,8", lbl: "смертность от ДТП, на 100 тыс.", fill: DOCX_C.pineSoft },
      ]),
    ]),
    analysis_risks: docxBlockPatch([
      docxStatTable([
        { num: "42,5 ⇒ 67,8", lbl: "сахарный диабет, общая заболеваемость, на 1 000", fill: DOCX_C.sandSoft },
        { num: "9,6 ⇒ 28,6", lbl: "первичная артериальная гипертензия, на 1 000", fill: DOCX_C.sandSoft },
        { num: "152,9 ⇒ 275,5", lbl: "болезни органов дыхания, первичная заболеваемость, на 1 000", fill: DOCX_C.sandSoft },
        { num: "1 510 ⇒ 1 741", lbl: "ожирение детей 0–17, на 100 тыс.", fill: DOCX_C.sandSoft },
      ]),
    ]),
    analysis_mixed: docxBlockPatch([
      docxStatTable([
        { num: "425 ⇒ 379", lbl: "смертность от ССЗ, на 100 тыс.", fill: DOCX_C.riverSoft },
        { num: "18,8 ⇒ 20,7", lbl: "доля старше трудоспособного возраста, %", fill: DOCX_C.riverSoft },
        { num: "55 ⇒ 90 м²", lbl: "зелень на жителя по городу", fill: DOCX_C.riverSoft },
        { num: "143 ⇒ 151", lbl: "смертность от новообразований, на 100 тыс.", fill: DOCX_C.riverSoft },
      ]),
    ]),
    flood_timeline: docxBlockPatch([
      docxStatTable([
        { num: "915 см", lbl: "1979 · абсолютный рекорд" },
        { num: "868 см", lbl: "2016 · весна" },
        { num: "684 см", lbl: "весна 2026 · без ЧС" },
        { num: "896–897 см", lbl: "лето 2026 · режим ЧС с 28 июля", fill: DOCX_C.floodSoft },
      ]),
    ]),
    flood_chart: docxBlockPatch([docxImagePara(media.floodChart, 640, 220, "Уровень Туры")]),
    flood_damage: docxBlockPatch([
      docxStatTable([
        { num: "151", lbl: "жилых домов в зоне подтопления" },
        { num: "2 056", lbl: "приусадебных участков" },
        { num: "412 + 153", lbl: "жилых и садовых домов к санобработке в городе" },
        { num: "29", lbl: "населённых пунктов в зоне подтопления" },
      ]),
    ]),
    solutions_blocks: docxBlockPatch([
      docxTable(
        [
          [
            docxCell(
              [
                docxPara("Решение 1 · Берегоукрепление", { size: 16, bold: true, color: DOCX_C.moss, after: 40 }),
                docxPara("Строительство защитных сооружений для защиты от наводнений для двух наиболее уязвимых микрорайонов города.", { size: 18, after: 80 }),
                docxPara(fmtInt(m.prot) + " жителей зоны защиты", { size: 20, bold: true, after: 20 }),
                docxPara(fmt(m.floodMln, 3) + " млн ₽/год — EAD (ожидаемый среднегодовой ущерб), прокси", { size: 16, color: DOCX_C.mute, after: 0 }),
              ],
              { width: Math.round(tw / 2), fill: DOCX_C.pineSoft }
            ),
            docxCell(
              [
                docxPara("Решение 2 · Благоустройство и озеленение рекреационных территорий", { size: 16, bold: true, color: DOCX_C.sand, after: 40 }),
                docxPara("Обеспечение 15-минутной доступности лесопарковых территорий для пеших прогулок.", { size: 18, after: 80 }),
                docxPara(fmt(m.co2, 1) + " т CO₂/год", { size: 20, bold: true, after: 20 }),
                docxPara(fmt(m.dalyYear, 2) + " DALY/год — частичный сценарный эффект здоровья", { size: 16, color: DOCX_C.mute, after: 0 }),
              ],
              { width: Math.round(tw / 2), fill: DOCX_C.sandSoft }
            ),
          ],
        ],
        [Math.round(tw / 2), Math.round(tw / 2)]
      ),
    ]),
    map_p1: docxBlockPatch([docxImagePara(media.mapP1, 640, 360, "мкрн Оброчное")]),
    stats_p1: docxBlockPatch([
      docxStatTable([
        { num: fmtInt(m.h1.nearby), lbl: "постоянных жителей" },
        { num: fmtInt(m.h1.houses), lbl: "объектов, верхняя граница" },
        { num: fmt(p1.greenHa, 1) + " га", lbl: "озеленение" },
        { num: fmtInt(p1.trees), lbl: "деревьев" },
        { num: "1,51 км", lbl: "берегоукрепления" },
        { num: "303 м", lbl: "пешеходный мост" },
        { num: docxMoney(p1.total / 1e6), lbl: "CAPEX части" },
        { num: docxMoney(m.f1.opex) + "/год", lbl: "OPEX" },
      ]),
    ]),
    map_p2: docxBlockPatch([docxImagePara(media.mapP2, 640, 360, "мкрн ДОК")]),
    stats_p2: docxBlockPatch([
      docxStatTable(
        [
          { num: fmtInt(m.h2.nearby), lbl: "постоянных жителей" },
          { num: fmtInt(m.h2.houses), lbl: "объектов, верхняя граница" },
          { num: fmt(p2.greenHa, 1) + " га", lbl: "озеленение" },
          { num: fmtInt(p2.trees), lbl: "деревьев" },
          { num: "3,53 км", lbl: "берегоукрепления" },
          { num: docxMoney(p2.total / 1e6), lbl: "CAPEX части" },
          { num: docxMoney(m.f2.opex) + "/год", lbl: "OPEX" },
        ],
        4
      ),
    ]),
    capex_dok: docxBlockPatch(
      docxCapexBlock(p2, [
        { title: "Озеленение", sum: docxMoney(p2.greenRub / 1e6), note: fmt(p2.greenHa, 1) + " га · " + fmtInt(p2.trees) + " деревьев", color: DOCX_C.moss, rows: reportGreenRows(p2) },
        { title: "Благоустройство", sum: docxMoney(p2.amenityRub / 1e6), note: fmt(p2.activeHa, 1) + " га интенсивного использования", color: DOCX_C.sand, rows: reportAmenityRows(p2) },
        { title: "Инженерная защита", sum: docxMoney(p2.engRub / 1e6), note: "Берег, ливневая канализация, очистка стока", color: DOCX_C.river, rows: reportEngRows(p2, false) },
      ], docxMoney(p2.total / 1e6))
    ),
    capex_ob: docxBlockPatch(
      docxCapexBlock(p1, [
        { title: "Озеленение", sum: docxMoney(p1.greenRub / 1e6), note: fmt(p1.greenHa, 1) + " га · " + fmtInt(p1.trees) + " деревьев", color: DOCX_C.moss, rows: reportGreenRows(p1) },
        { title: "Благоустройство", sum: docxMoney(p1.amenityRub / 1e6), note: fmt(p1.activeHa, 1) + " га интенсивного использования", color: DOCX_C.sand, rows: reportAmenityRows(p1) },
        { title: "Инженерная защита", sum: docxMoney(p1.engRub / 1e6), note: "Берег, ливневая канализация, очистка, мост", color: DOCX_C.river, rows: reportEngRows(p1, true) },
      ], docxMoney(p1.total / 1e6))
    ),
    capex_compare: docxBlockPatch([
      docxTable(
        [
          [
            docxCell("", { width: Math.round(tw * 0.34), fill: DOCX_C.ink }),
            docxCell("мкрн ДОК", { width: Math.round(tw * 0.22), fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell("мкрн Оброчное", { width: Math.round(tw * 0.22), fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell("Итого", { width: Math.round(tw * 0.22), fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
          ],
          [
            docxCell("Озеленение, млн ₽", { width: Math.round(tw * 0.34) }),
            docxCell(fmt(p2.greenRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(p1.greenRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(m.greenRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
          ],
          [
            docxCell("Благоустройство, млн ₽", { width: Math.round(tw * 0.34) }),
            docxCell(fmt(p2.amenityRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(p1.amenityRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(m.amenityRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
          ],
          [
            docxCell("Инженерная защита, млн ₽", { width: Math.round(tw * 0.34) }),
            docxCell(fmt(p2.engRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(p1.engRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(m.engRub / 1e6, 1), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
          ],
          [
            docxCell("CAPEX всего, млн ₽", { width: Math.round(tw * 0.34), fill: DOCX_C.pineSoft, bold: true }),
            docxCell(fmt(p2.total / 1e6, 1), { width: Math.round(tw * 0.22), fill: DOCX_C.pineSoft, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell(fmt(p1.total / 1e6, 1), { width: Math.round(tw * 0.22), fill: DOCX_C.pineSoft, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell(fmt(m.capexMln, 1), { width: Math.round(tw * 0.22), fill: DOCX_C.pineSoft, bold: true, align: D.AlignmentType.RIGHT }),
          ],
          [
            docxCell("На 1 га территории, млн ₽/га", { width: Math.round(tw * 0.34) }),
            docxCell(fmt(p2.total / 1e6 / MODEL.parts.p2.areaHa, 2), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(p1.total / 1e6 / MODEL.parts.p1.areaHa, 2), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
            docxCell(fmt(m.capexMln / m.area, 2), { width: Math.round(tw * 0.22), align: D.AlignmentType.RIGHT }),
          ],
        ],
        [Math.round(tw * 0.34), Math.round(tw * 0.22), Math.round(tw * 0.22), Math.round(tw * 0.22)]
      ),
    ]),
    ncs_note: docxTextPatch(
      "НЦС-референс полного озеленения парка на " +
        fmt(m.greenHa, 0) +
        " га — около " +
        fmt(m.ncsMln / 1000, 1) +
        " млрд ₽. Компонентный метод (" +
        fmt(m.greenRub / 1e6, 0) +
        " млн ₽) — " +
        fmt((m.greenRub / 1e6 / m.ncsMln) * 100, 0) +
        "% от НЦС.",
      { size: 18, color: DOCX_C.mute }
    ),
    fund_stats: docxBlockPatch([
      docxStatTable(
        [
          { num: fmt(split.share * 100, 0) + "%", lbl: "доля сметы не из бюджетов субъекта и муниципалитета", fill: DOCX_C.riverSoft },
          { num: docxMoney(split.outsideMln), lbl: "федеральные субсидии и КРТ застройщика", fill: DOCX_C.pineSoft },
          { num: docxMoney(split.localMln), lbl: "остаётся за областью и городом", fill: DOCX_C.sandSoft },
        ],
        3
      ),
    ]),
    fund_table: docxBlockPatch([
      docxTable(
        [
          [
            docxCell("Статья, млн ₽", { width: fundW[0], fill: DOCX_C.ink, bold: true }),
            docxCell("Федеральные субсидии", { width: fundW[1], fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell("Область и город", { width: fundW[2], fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell("КРТ", { width: fundW[3], fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
            docxCell("Итого", { width: fundW[4], fill: DOCX_C.ink, bold: true, align: D.AlignmentType.RIGHT }),
          ],
        ].concat(
          fundArticles.map((row) =>
            row.map((value, i) =>
              docxCell(value, {
                width: fundW[i],
                align: i ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT,
                bold: i === 4,
              })
            )
          )
        ),
        fundW
      ),
    ]),
    fund_note: docxTextPatch(
      "Федерация: берегоукрепление, ливневка и очистка за вычетом участка застройщика — " +
        fmt(split.federalMln, 0) +
        " млн ₽. КРТ: 733 м набережной мкрн ДОКа (" +
        fmt(split.devShoreMln, 0) +
        " млн ₽) и 8,8 тыс. м² благоустройства (" +
        fmt(split.devAmenityMln, 0) +
        " млн ₽). Озеленение и мост профильного федерального источника не имеют.",
      { size: 18, color: DOCX_C.mute }
    ),
    fund_cards: docxBlockPatch([
      docxPara("Федеральное финансирование", { size: 22, bold: true, color: DOCX_C.moss, before: 80 }),
      docxPara("Росводресурсы / Минприроды. Субсидии субъектам, цикл 2027–2029, приказ № 42 от 11.03.2026. В смете: 383 млн ₽."),
      docxPara("«Вода России». Очистка стока и ливневая канализация. В смете: 75 млн ₽."),
      docxPara("Таксономия ВЭБ.РФ. Маркировка, не источник денег. Закрывает потенциально весь проект: 1 911 млн ₽."),
      docxPara("Региональное финансирование", { size: 22, bold: true, color: DOCX_C.ink, before: 160 }),
      docxPara("Правительство области / УКС. АИП. Прецедент: защита Туры у Мельникайте — 1,67 млрд ₽. В смете: 631 млн ₽."),
      docxPara("Администрация Тюмени. ФКГС и голосование жителей. В смете: 514 млн ₽ активной зоны очередями."),
      docxPara("Казначейский инфраструктурный кредит. До 15 лет, 3% годовых, погашение с третьего года."),
      docxPara("Частные инвестиции, КРТ", { size: 22, bold: true, color: DOCX_C.sand, before: 160 }),
      docxPara(
        "Застройщик строит публичную набережную и передает ее городу. «Страна Девелопмент» — набережная мкрн ДОКа 733 м. Эти метры нельзя повторно включать в бюджетную заявку. Закрывает часть мкрн ДОКа: берег 3,53 км и зону для активностей в районе жилой застройки."
      ),
    ]),
    scenario_table: docxBlockPatch(docxScenarioPatches()),
    method_cards: docxBlockPatch([
      docxCellToBlock(DOCX_C.leaf, DOCX_C.ink, "Экономика", "Валовая добавленная стоимость и бюджетный эффект", [
        "Прямая ВДС строительства — локализованная часть CAPEX без НДС, умноженная на отраслевую долю добавленной стоимости. Эксплуатационные эффекты сюда не входят.",
        "Активность посетителей: жители пилотных территорий и 2% остального населения Тюмени, 8 посещений в год, 45% с расходами, средний чек 350 ₽. Налоги — по нагрузке строительства. Выплаты при подтоплении — только единовременная помощь.",
      ]),
      docxPara("", { after: 80 }),
      docxCellToBlock(DOCX_C.river, DOCX_C.ink, "Экология", "Поглощение углекислого газа и удержание стока", [
        "Считается только разница с сохранением существующей растительности. В базе дополнительные деревья — 10% проектного числа, приживаемость 85%, зрелость 0,6 за 20 лет.",
        "Дополнительное удержание стока — 8 мм в год на площадь зоны воздействия. При росте водонепроницаемых покрытий эффект может снижаться или менять знак.",
      ]),
      docxPara("", { after: 80 }),
      docxCellToBlock(DOCX_C.moss, DOCX_C.paper, "Здоровье", "Предотвращённые потери здоровой жизни", [
        "DALY: годы жизни, потерянные из-за преждевременной смерти, плюс годы с нарушением здоровья. Основной результат не дисконтируется.",
        "YLL включает физическую активность, жару и PM2.5. YLD — только психическое здоровье. Последствия подтоплений и NO₂ в итог не входят.",
        "Полный эффект нарастает 5 лет по методике ВОЗ. Это сценарная оценка высокой неопределенности, не замена локальному эпидемиологическому исследованию.",
      ]),
    ]),
    method_foot: docxTextPatch(
      "Источник расчетных значений — книга «Расчет_эффектов_Тюмень_20лет_CAPEX_OPEX.xlsx». Показатели, кроме геометрии территорий, имеют статус сценарной оценки. Оформление — по брендбуку «Тюмень 440. На правильном пути», шрифт Montserrat (SIL OFL). Дата: " +
        date +
        ".",
      { size: 16, color: DOCX_C.mute }
    ),
  };
}

function docxCellToBlock(fill, color, kicker, title, lines) {
  const w = docxTwip();
  return docxTable(
    [
      [
        docxCell(
          [
            docxPara(kicker, { size: 16, bold: true, color: fill === DOCX_C.moss ? DOCX_C.leaf : DOCX_C.ink, after: 40 }),
            docxPara(title, { size: 22, bold: true, color: color, after: 80 }),
          ].concat(lines.map((line) => docxPara(line, { size: 18, color: color, after: 60 }))),
          { width: w, fill: fill, border: fill }
        ),
      ],
    ],
    [w]
  );
}

async function loadDocxTemplate() {
  const res = await fetch("report/Tyumen_440_shablon.docx?v=20260914-auto3");
  if (!res.ok) throw new Error("Не найден шаблон Word");
  return new Uint8Array(await res.arrayBuffer());
}

async function sanitizeDocxBytes(bytes) {
  if (typeof JSZip !== "function") return bytes;
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((name) => name.endsWith(".xml") && !zip.files[name].dir);
  for (const name of names) {
    let text = await zip.file(name).async("string");
    let n = 0;
    text = text.replace(/<wp:docPr([^>]*)\/?>/g, (_, attrs) => {
      n += 1;
      attrs = String(attrs || "").replace(/\/$/, "").replace(/\s+id="\d+"/, "");
      if (!/\sname="/.test(attrs)) attrs += ' name="Picture ' + n + '"';
      return '<wp:docPr id="' + n + '"' + attrs + "/>";
    });
    text = text.replace(/(<w:rPr>[\s\S]*?<\/w:rPr>)<w:rPr>[\s\S]*?<\/w:rPr>/g, "$1");
    zip.file(name, text);
  }
  return zip.generateAsync({
    type: "uint8array",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

function saveDocxBlob(bytes, filename) {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}

function setReportExportBusy(busy) {
  ["report-print", "report-pptx"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = busy;
  });
}

async function downloadReportDocx() {
  const status = document.getElementById("report-status");
  if (status) status.textContent = "Формируется отчет Word…";
  setReportExportBusy(true);
  const filename = "Otchet_Tyumen_Standart_" + reportFileStamp() + ".docx";
  try {
    const [template, assets] = await Promise.all([loadDocxTemplate(), collectReportAssets()]);
    if (status) status.textContent = "Подставляются карты и цифры модели…";
    const media = await collectDocxMedia(assets);
    const raw = await docxLib().patchDocument(template, {
      keepOriginalStyles: false,
      patches: buildDocxPatches(compute(), media),
    });
    const bytes = await sanitizeDocxBytes(raw);
    saveDocxBlob(bytes, filename);
    if (status) {
      status.textContent =
        "Word сохранен: " +
        filename +
        " · шаблон брендбука «Тюмень 440», шрифт Montserrat · " +
        reportDate() +
        ".";
    }
  } finally {
    setReportExportBusy(false);
  }
}

window.downloadReportDocx = downloadReportDocx;
window.buildDocxPatches = buildDocxPatches;
