const PPTX_FONT = "Segoe UI";
const PPTX_C = {
  ink: "1F2D63",
  moss: "144992",
  sand: "DDA13B",
  river: "5BA0D8",
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
  soft: "D8D3C8",
};
const PPTX_W = 13.333;
const PPTX_H = 7.5;

function pptxLib() {
  const Lib = window.PptxGenJS;
  if (typeof Lib !== "function") throw new Error("Библиотека pptx не загружена");
  return Lib;
}

function pptxCreate() {
  const pptx = new (pptxLib())();
  pptx.defineLayout({ name: "TYUMEN", width: PPTX_W, height: PPTX_H });
  pptx.layout = "TYUMEN";
  pptx.author = "Тюмень 440";
  pptx.company = "АТРЭ";
  pptx.title = "Результаты апробации Стандарта · Тюмень";
  pptx.subject = "Сценарная оценка пилотных территорий";
  return pptx;
}

function pptxSlide(pptx, color) {
  const slide = pptx.addSlide();
  slide.background = { color: color || PPTX_C.paper };
  return slide;
}

function pptxPlain(text) {
  return String(text)
    .replace(/\u2082/g, "2")
    .replace(/\u00B2/g, "2")
    .replace(/\u2080/g, "0");
}

function pptxText(slide, text, opt) {
  const value = Array.isArray(text) ? text : pptxPlain(text);
  slide.addText(value, Object.assign({ fontFace: PPTX_FONT, margin: 0, color: PPTX_C.ink, lang: "ru-RU" }, opt));
}

function pptxChrome(slide, section) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: PPTX_W,
    h: 0.08,
    fill: { color: PPTX_C.sand },
  });
  pptxText(slide, "ТЮМЕНЬ · АПРОБАЦИЯ СТАНДАРТА", {
    x: 0.42,
    y: 0.16,
    w: 7.2,
    h: 0.26,
    fontSize: 10,
    bold: true,
    color: PPTX_C.mute,
  });
  pptxText(slide, section, {
    x: 7.4,
    y: 0.16,
    w: 5.5,
    h: 0.26,
    fontSize: 10,
    bold: true,
    color: PPTX_C.sand,
    align: "right",
  });
  slide.slideNumber = {
    x: 11.5,
    y: 7.14,
    w: 1.4,
    h: 0.24,
    fontFace: PPTX_FONT,
    fontSize: 10,
    color: PPTX_C.mute,
    align: "right",
  };
}

function pptxHeading(slide, kicker, title, note) {
  pptxText(slide, kicker.toUpperCase(), {
    x: 0.42,
    y: 0.5,
    w: 12.5,
    h: 0.24,
    fontSize: 11,
    bold: true,
    color: PPTX_C.sand,
  });
  pptxText(slide, title, {
    x: 0.42,
    y: 0.74,
    w: 12.5,
    h: 0.42,
    fontSize: 24,
    bold: true,
  });
  let y = 1.24;
  if (note) {
    const lines = Math.min(3, Math.max(1, Math.ceil(note.length / 125)));
    const h = lines * 0.28;
    pptxText(slide, note, {
      x: 0.42,
      y: 1.18,
      w: 12.5,
      h: h,
      fontSize: 13,
      color: PPTX_C.mute,
    });
    y = 1.22 + h;
  }
  return y;
}

function pptxCards(slide, items, y, h) {
  const gap = 0.12;
  const width = (12.5 - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const x = 0.42 + index * (width + gap);
    const dark = item.fill === PPTX_C.ink || item.fill === PPTX_C.moss;
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: width,
      h: h,
      fill: { color: item.fill || PPTX_C.cream },
      rectRadius: 0.06,
    });
    pptxText(slide, item.num, {
      x: x + 0.12,
      y: y + 0.1,
      w: width - 0.24,
      h: 0.4,
      fontSize: item.numSize || 16,
      bold: true,
      color: item.numColor || (dark ? PPTX_C.white : PPTX_C.ink),
    });
    pptxText(slide, item.lbl, {
      x: x + 0.12,
      y: y + 0.5,
      w: width - 0.24,
      h: h - 0.6,
      fontSize: item.lblSize || 11,
      color: item.lblColor || (dark ? PPTX_C.soft : PPTX_C.mute),
    });
  });
}

function pptxFitImage(slide, dataUrl, box, aspect) {
  if (!dataUrl) {
    pptxText(slide, "Изображение недоступно.", {
      x: box.x,
      y: box.y,
      w: box.w,
      h: 0.3,
      fontSize: 12,
      color: PPTX_C.mute,
    });
    return;
  }
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  slide.addImage({
    data: dataUrl,
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w: w,
    h: h,
  });
}

function pptxCell(text, opt) {
  const o = opt || {};
  return {
    text: pptxPlain(text),
    options: {
      fill: { color: o.fill || PPTX_C.cream },
      color: o.color || (o.fill === PPTX_C.ink ? PPTX_C.white : PPTX_C.ink),
      bold: !!o.bold,
      align: o.align || "left",
      valign: "middle",
      colspan: o.span,
      fontFace: PPTX_FONT,
      fontSize: o.size || 11,
      lang: "ru-RU",
    },
  };
}

function pptxTable(slide, rows, opt) {
  const options = {
    x: opt.x,
    y: opt.y,
    w: opt.w,
    colW: opt.colW,
    fontFace: PPTX_FONT,
    fontSize: opt.size || 11,
    color: PPTX_C.ink,
    border: { pt: 0.5, color: PPTX_C.line },
    valign: "middle",
    align: "left",
  };
  if (opt.margin != null) options.margin = opt.margin;
  slide.addTable(rows, options);
}

function pptxScenarioGroups() {
  const S = window.SCENARIOS;
  if (!S) return [];
  return [
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
        ["Дополнительное поглощение CO2 (углекислого газа) в год", S.co2.year, 1, "т/год"],
        ["Дополнительное поглощение CO2 (углекислого газа) за 20 лет", S.co2.y20, 0, "т"],
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
}

function pptxScenarioRows(groups) {
  const size = 9;
  const header = [
    pptxCell("Показатель", { fill: PPTX_C.ink, bold: true, size: size }),
    pptxCell("Низкий", { fill: PPTX_C.ink, bold: true, align: "right", size: size }),
    pptxCell("Базовый", { fill: PPTX_C.ink, bold: true, align: "right", size: size }),
    pptxCell("Высокий", { fill: PPTX_C.ink, bold: true, align: "right", size: size }),
    pptxCell("Ед.", { fill: PPTX_C.ink, bold: true, align: "right", size: size }),
  ];
  const rows = [header];
  groups.forEach((group) => {
    rows.push([pptxCell(group.title, { span: 5, fill: PPTX_C.pineSoft, bold: true, size: size })]);
    group.rows.forEach(([name, vals, digits, unit]) => {
      const base = vals[1];
      rows.push([
        pptxCell(name, { size: size }),
        pptxCell(reportScCell(vals[0], base, "low", digits), { align: "right", size: size }),
        pptxCell(reportScCell(vals[1], base, "base", digits), { align: "right", bold: true, size: size }),
        pptxCell(reportScCell(vals[2], base, "high", digits), { align: "right", size: size }),
        pptxCell(unit, { color: PPTX_C.mute, size: size, align: "right" }),
      ]);
    });
  });
  return rows;
}

function pptxHBars(slide, rows, box, color) {
  const max = Math.max.apply(null, rows.map((row) => row.v || 0).concat([1]));
  const rowH = box.h / Math.max(rows.length, 1);
  rows.forEach((row, index) => {
    const y = box.y + index * rowH;
    const labelW = box.w * 0.4;
    const trackW = box.w * 0.38;
    const trackX = box.x + labelW;
    pptxText(slide, row.name, {
      x: box.x,
      y: y,
      w: labelW - 0.06,
      h: rowH,
      fontSize: 10,
      valign: "middle",
    });
    slide.addShape("roundRect", {
      x: trackX,
      y: y + rowH * 0.32,
      w: trackW,
      h: 0.1,
      fill: { color: "E4DDD2" },
      rectRadius: 0.04,
    });
    slide.addShape("roundRect", {
      x: trackX,
      y: y + rowH * 0.32,
      w: Math.max(0.08, trackW * ((row.v || 0) / max)),
      h: 0.1,
      fill: { color: color || PPTX_C.moss },
      rectRadius: 0.04,
    });
    pptxText(slide, row.val, {
      x: trackX + trackW,
      y: y,
      w: box.w - labelW - trackW,
      h: rowH,
      fontSize: 10,
      bold: true,
      align: "right",
      valign: "middle",
    });
  });
}

function pptxFundCharts(slide, pptx, split, money, y) {
  const names = ["Федеральные субсидии", "Бюджеты области и города", "Частные инвестиции, КРТ"];
  const colors = [PPTX_C.river, PPTX_C.ink, PPTX_C.sand];
  const labels = split.articles.labels;
  const types = pptx.ChartType || {};
  const font = {
    catAxisLabelFontFace: PPTX_FONT,
    valAxisLabelFontFace: PPTX_FONT,
    legendFontFace: PPTX_FONT,
    catAxisLabelColor: PPTX_C.ink,
    valAxisLabelColor: PPTX_C.mute,
    legendColor: PPTX_C.ink,
    chartColors: colors,
    chartArea: { fill: { color: PPTX_C.paper } },
    plotArea: { fill: { color: PPTX_C.paper } },
  };
  pptxText(slide, "Структура капитальных затрат " + money(split.totalMln), {
    x: 0.42,
    y: y,
    w: 5.5,
    h: 0.26,
    fontSize: 12,
    color: PPTX_C.mute,
  });
  pptxText(slide, "По статьям сметы, млн ₽", {
    x: 6.2,
    y: y,
    w: 6.6,
    h: 0.26,
    fontSize: 12,
    color: PPTX_C.mute,
  });
  slide.addChart(
    types.doughnut || "doughnut",
    [{ name: "Источники", labels: names, values: [split.federalMln, split.localMln, split.extraMln] }],
    Object.assign({}, font, {
      x: 0.28,
      y: y + 0.22,
      w: 5.7,
      h: 2.78,
      holeSize: 68,
      showPercent: false,
      showValue: false,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 11,
      dataBorder: { pt: 0, color: PPTX_C.paper },
    })
  );
  pptxText(slide, fmt(split.share * 100, 0) + "%", {
    x: 1.85,
    y: y + 1.22,
    w: 2.5,
    h: 0.38,
    align: "center",
    fontSize: 20,
    bold: true,
  });
  pptxText(slide, "федбюджет + внебюджет", {
    x: 1.7,
    y: y + 1.58,
    w: 2.8,
    h: 0.24,
    align: "center",
    fontSize: 10,
    color: PPTX_C.mute,
  });
  slide.addChart(
    types.bar || "bar",
    [
      { name: names[0], labels: labels, values: split.articles.federal },
      { name: names[1], labels: labels, values: split.articles.local },
      { name: names[2], labels: labels, values: split.articles.extra },
    ],
    Object.assign({}, font, {
      x: 6.05,
      y: y + 0.22,
      w: 6.95,
      h: 2.78,
      barGrouping: "stacked",
      barDir: "bar",
      barGapWidthPct: 45,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 10,
      catAxisLabelFontSize: 11,
      valAxisLabelFontSize: 10,
      showValue: false,
      showValAxisTitle: true,
      valAxisTitle: "млн ₽",
      valAxisTitleFontFace: PPTX_FONT,
      valAxisTitleFontSize: 10,
      valAxisTitleColor: PPTX_C.mute,
      valAxisMinVal: 0,
      valGridLine: { color: "E4DDD2", size: 0.5 },
      catGridLine: { style: "none" },
      dataBorder: { pt: 0, color: PPTX_C.paper },
    })
  );
}

function pptxStackedBar(slide, parts, box) {
  const total = parts.reduce((sum, part) => sum + (part.v || 0), 0) || 1;
  let x = box.x;
  parts.forEach((part) => {
    const w = box.w * ((part.v || 0) / total);
    slide.addShape("rect", { x: x, y: box.y, w: Math.max(w, 0.02), h: box.h, fill: { color: part.color } });
    x += w;
  });
  parts.forEach((part, index) => {
    const itemW = box.w / parts.length;
    const itemX = box.x + index * itemW;
    slide.addShape("rect", {
      x: itemX,
      y: box.y + box.h + 0.1,
      w: 0.18,
      h: 0.12,
      fill: { color: part.color },
    });
    pptxText(slide, part.name + "  " + part.val, {
      x: itemX + 0.24,
      y: box.y + box.h + 0.04,
      w: itemW - 0.28,
      h: 0.24,
      fontSize: 11,
      valign: "middle",
    });
  });
}

function pptxCapexColumns(slide, y, blocks) {
  const gap = 0.16;
  const width = (12.5 - gap * 2) / 3;
  blocks.forEach((block, index) => {
    const x = 0.42 + index * (width + gap);
    const dark = block.fill === PPTX_C.moss;
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: width,
      h: 0.98,
      fill: { color: block.fill },
      rectRadius: 0.06,
    });
    pptxText(slide, block.title, {
      x: x + 0.14,
      y: y + 0.08,
      w: width - 0.28,
      h: 0.24,
      fontSize: 12,
      bold: true,
      color: dark ? PPTX_C.leaf : PPTX_C.ink,
    });
    pptxText(slide, block.sum, {
      x: x + 0.14,
      y: y + 0.32,
      w: width - 0.28,
      h: 0.3,
      fontSize: 18,
      bold: true,
      color: dark ? PPTX_C.white : PPTX_C.ink,
    });
    pptxText(slide, block.note, {
      x: x + 0.14,
      y: y + 0.64,
      w: width - 0.28,
      h: 0.26,
      fontSize: 11,
      color: dark ? PPTX_C.soft : PPTX_C.mute,
    });
    pptxHBars(slide, block.rows, { x: x + 0.14, y: y + 1.08, w: width - 0.28, h: block.rows.length * 0.36 }, block.bar);
  });
}

function pptxSourceRun(text, opt) {
  return { text: pptxPlain(text), options: Object.assign({ breakLine: true, color: PPTX_C.ink }, opt) };
}

function pptxSourceColumns(slide, y) {
  const columns = [
    {
      fill: PPTX_C.riverSoft,
      kickerColor: PPTX_C.moss,
      kicker: "Федеральное финансирование",
      title: "Субсидии, нацпроект и зелёная маркировка",
      cards: [
        {
          kicker: "Росводресурсы / Минприроды",
          title: "Защита от наводнений и иных негативных воздействий вод",
          note: "Субсидии субъектам на 2026–2028 гг. Заявка области и заключение территориального органа. Цикл на 2027–2029 годы открыт приказом Росводресурсов № 42 от 11.03.2026.",
          meta: "Закрывает берегоукрепление и инженерную защиту. В смете: 383 млн ₽ (берег 292 + ливневая канализация 91).",
        },
        {
          kicker: "Минприроды / Росводресурсы",
          title: "Федеральный проект «Вода России»",
          note: "Нацпроект «Экологическое благополучие». К 2030 году — снижение неочищенного сброса на 15%. Акцент на очистные сооружения, русла и укрепление берегов. Озёра Оброчное–Кривое–Песьяное и участок Туры нужно включить в перечень водных объектов субъекта.",
          meta: "Закрывает очистку стока и ливневую канализацию. В смете: 75 млн ₽ на три блока очистки, плюс берег и ливнёвка в связке с защитой от наводнений.",
        },
        {
          kicker: "ВЭБ.РФ · постановление Правительства РФ № 1587",
          title: "Таксономия зелёных и адаптационных проектов",
          note: "П. 6.1.2 — экологичное дноуглубление и берегоукрепление; раздел 7 — ландшафты, реки, водоёмы. Сама таксономия средств не выделяет: это маркировка для зелёного кредита или облигаций.",
          meta: "Закрывает потенциально весь проект. В смете: 1 911 млн ₽ как «зелёный» проект после верификации эффекта.",
        },
      ],
    },
    {
      fill: PPTX_C.pineSoft,
      kickerColor: PPTX_C.ink,
      kicker: "Региональное финансирование",
      title: "Бюджет области, город и казначейский кредит",
      cards: [
        {
          kicker: "Правительство Тюменской области",
          title: "Региональный бюджет и УКС области",
          note: "Адресная инвестиционная программа, подряд через государственное казённое учреждение УКС. Прецедент: инженерная защита Туры у улицы Мельникайте / озера Круглое — 1,67 млрд ₽ (2024–2025).",
          meta: "Закрывает гидротехнику и мост. В смете: 631 млн ₽ (гидротехника 457 + мост 174).",
        },
        {
          kicker: "Администрация Тюмени",
          title: "Муниципальная программа благоустройства",
          note: "Региональный проект ФКГС, городской бюджет и голосование жителей. мкрн Оброчное и мкрн ДОК нужно внести в перечень голосования на 2027 год и далее как серию объектов, а не как один объект площадью 417 га.",
          meta: "Закрывает очереди благоустройства, не гидротехнические сооружения. В смете: 514 млн ₽ активной зоны — очередями, не одним объектом.",
        },
        {
          kicker: "Федеральное казначейство / субъект",
          title: "Казначейский инфраструктурный кредит",
          note: "До 15 лет, 3% годовых, погашение с третьего года. При срыве графика ставка до 6%. Нужен отбор президиумом комиссии по региональному развитию.",
          meta: "Закрывает региональную долю берега, моста и сетей.",
        },
      ],
    },
    {
      fill: PPTX_C.sandSoft,
      kickerColor: "8A5A12",
      kicker: "Частное финансирование",
      title: "Обязательства застройщика и КРТ",
      cards: [
        {
          kicker: "Город и застройщик",
          title: "Комплексное развитие территории и обязательства застройщика",
          note: "Застройщик строит публичную набережную и передаёт её городу. Уже в работе: «Страна Девелопмент» — набережная мкрн ДОКа 733 м; «Брусника» и «Страна Девелопмент» — левый берег около 140 тыс. м². Эти метры нельзя повторно включать в бюджетную заявку.",
          meta: "Закрывает часть мкрн ДОКа: берег 3,53 км и зону для активностей в районе жилой застройки.",
        },
      ],
    },
  ];
  const gap = 0.12;
  const h = 5.72;
  const width = (12.5 - gap * (columns.length - 1)) / columns.length;
  columns.forEach((column, index) => {
    const x = 0.42 + index * (width + gap);
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: width,
      h: h,
      fill: { color: column.fill },
      rectRadius: 0.06,
    });
    const runs = [
      pptxSourceRun(column.kicker, { bold: true, fontSize: 10, color: column.kickerColor }),
      pptxSourceRun(column.title, { bold: true, fontSize: 12 }),
    ];
    column.cards.forEach((card) => {
      runs.push(pptxSourceRun(card.kicker, { bold: true, fontSize: 10, color: column.kickerColor, paraSpaceBefore: 6 }));
      runs.push(pptxSourceRun(card.title, { bold: true, fontSize: 11 }));
      runs.push(pptxSourceRun(card.note, { fontSize: 10 }));
      runs.push(pptxSourceRun(card.meta, { fontSize: 10, bold: true }));
    });
    slide.addText(runs, {
      x: x + 0.12,
      y: y + 0.1,
      w: width - 0.24,
      h: h - 0.18,
      fontFace: PPTX_FONT,
      margin: 0,
      lang: "ru-RU",
      valign: "top",
      paraSpaceAfter: 1,
    });
  });
}

function pptxNarrative(slide, items, y) {
  const gap = 0.16;
  const width = (12.5 - gap * (items.length - 1)) / items.length;
  const h = 4.85;
  items.forEach((item, index) => {
    const x = 0.42 + index * (width + gap);
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: width,
      h: h,
      fill: { color: item.fill },
      rectRadius: 0.06,
    });
    const runs = [
      { text: item.kicker, options: { bold: true, fontSize: 12, color: item.kickerColor, breakLine: true } },
      { text: item.title, options: { bold: true, fontSize: 16, color: item.color, breakLine: true } },
    ];
    item.lines.forEach((line, lineIndex) => {
      runs.push({
        text: line,
        options: { fontSize: 12, color: item.color, breakLine: lineIndex < item.lines.length - 1 },
      });
    });
    slide.addText(runs, {
      x: x + 0.16,
      y: y + 0.16,
      w: width - 0.32,
      h: h - 0.32,
      fontFace: PPTX_FONT,
      margin: 0,
      lang: "ru-RU",
      valign: "top",
      paraSpaceAfter: 8,
    });
  });
}

async function buildReportPptx() {
  const m = compute();
  const assets = await collectReportAssets();
  const media = await collectDocxMedia(assets);
  const split = reportFunding(m);
  const p1 = m.p1;
  const p2 = m.p2;
  const date = reportDate();
  const money = (n) => (typeof reportMoney === "function" ? reportMoney(n) : fmt(n, 1) + " млн ₽");
  const pptx = pptxCreate();

  const cover = pptxSlide(pptx, PPTX_C.ink);
  const logoAsi = await docxRasterize(assets.asi, 344);
  const logos = [
    { src: assets.tumen, w: 0.62, h: 0.62 },
    { src: logoAsi, w: 0.96, h: 0.4 },
    { src: assets.atre, w: 1.05, h: 0.44 },
  ].filter((item) => item.src);
  let logoX = 0.5;
  const logoMid = 0.72;
  logos.forEach((logo) => {
    cover.addImage({ data: logo.src, x: logoX, y: logoMid - logo.h / 2, w: logo.w, h: logo.h });
    logoX += logo.w + 0.22;
  });
  if (!logos.length) {
    pptxText(cover, "Тюмень 440", { x: 0.5, y: 0.42, w: 4, h: 0.4, fontSize: 16, bold: true, color: PPTX_C.leaf });
  }
  pptxText(cover, "АПРОБАЦИЯ СТАНДАРТА ЗДОРОВОЙ СРЕДЫ В НАСЕЛЕННЫХ ПУНКТАХ", {
    x: 0.5,
    y: 1.35,
    w: 12.2,
    h: 0.28,
    fontSize: 12,
    bold: true,
    color: PPTX_C.leaf,
  });
  pptxText(cover, "Результаты и проекты для внедрения в г. Тюмень", {
    x: 0.5,
    y: 1.72,
    w: 11.5,
    h: 1.15,
    fontSize: 32,
    bold: true,
    color: PPTX_C.white,
  });
  cover.addShape("rect", { x: 0.5, y: 3.02, w: 1.7, h: 0.06, fill: { color: PPTX_C.sand } });
  pptxText(cover, "Пилотные территории: мкрн Оброчное и мкрн ДОК.", {
    x: 0.5,
    y: 3.2,
    w: 12,
    h: 0.3,
    fontSize: 15,
    color: PPTX_C.soft,
  });
  pptxText(cover, "Отчет сформирован автоматически. Дата формирования — " + date + ".", {
    x: 0.5,
    y: 3.52,
    w: 12,
    h: 0.26,
    fontSize: 13,
    color: PPTX_C.soft,
  });
  pptxText(cover, "Горизонт оценки: 20 лет. Цены: 01.01.2026.", {
    x: 0.5,
    y: 3.82,
    w: 12,
    h: 0.28,
    fontSize: 12,
    color: "B8B4AB",
  });
  pptxCards(
    cover,
    [
      { num: fmt(m.area, 2) + " га", lbl: "площадь пилотных территорий", fill: PPTX_C.white },
      { num: fmt(m.shoreM / 1000, 2) + " км", lbl: "линия берегоукрепления", fill: PPTX_C.white },
      { num: fmtInt(m.p1.trees + m.p2.trees), lbl: "сценарное число деревьев", fill: PPTX_C.white },
      { num: money(m.capexMln), lbl: "капитальные затраты без НДС", fill: PPTX_C.leaf },
    ],
    4.55,
    1.45
  );
  const contents = pptxSlide(pptx);
  pptxChrome(contents, "Состав");
  pptxHeading(contents, "Содержание", "Состав отчета");
  [
    "Обзор пилотных территорий и обзорная карта",
    "Результаты апробации",
    "Контекст апробации Стандарта: наводнение и природно-рекреационный каркас",
    "ПРК+Стандарт: решения для внедрения на пилотных территориях",
    "Эффекты от пилотов",
    "Структура вложений",
    "Потенциальные источники финансирования",
    "Методология оценки",
    "Сценарии эффектов",
  ].forEach((item, index) => {
    const y = 1.45 + index * 0.58;
    contents.addShape("roundRect", {
      x: 0.42,
      y: y,
      w: 0.46,
      h: 0.42,
      fill: { color: PPTX_C.ink },
      rectRadius: 0.04,
    });
    pptxText(contents, String(index + 1), {
      x: 0.42,
      y: y,
      w: 0.46,
      h: 0.42,
      fontSize: 14,
      bold: true,
      align: "center",
      valign: "middle",
      color: PPTX_C.white,
    });
    pptxText(contents, item, {
      x: 1.08,
      y: y,
      w: 11.4,
      h: 0.42,
      fontSize: 16,
      valign: "middle",
    });
  });

  const overview = pptxSlide(pptx);
  pptxChrome(overview, "Обзор");
  pptxHeading(
    overview,
    "Обзор",
    "Пилотные территории на карте города",
    "мкрн Оброчное — обеспечение пешего доступа к зеленой территории. мкрн ДОК — защита застройки от подтопления."
  );
  pptxFitImage(overview, media.mapAll, { x: 0.42, y: 1.85, w: 12.5, h: 4.75 }, 1280 / 660);
  pptxText(overview, "Контуры озеленения · берегоукрепление 5,05 км · пешеходный мост 303 м. Подложка: Esri, Maxar, Earthstar Geographics.", {
    x: 0.42,
    y: 6.7,
    w: 12.5,
    h: 0.28,
    fontSize: 11,
    color: PPTX_C.mute,
  });

  const analysis = pptxSlide(pptx);
  pptxChrome(analysis, "Результаты апробации");
  pptxHeading(
    analysis,
    "Результаты апробации",
    "Ключевые выводы по городу",
    "Результаты апробации основаны на анализе 231 показателя Стандарта. Период: 2016–2025 гг."
  );
  const findings = [
    {
      fill: PPTX_C.ink,
      title: "Устойчивый рост ОПЖ",
      text: "Рост связан со снижением смертности от инфекций и от внешних причин, включая ДТП. Кроме того, экономический рост в городе создает дополнительные стимулы у населения к сохранению здоровья.",
      color: PPTX_C.white,
      body: PPTX_C.soft,
    },
    {
      fill: PPTX_C.sand,
      title: "Риски города — рост заболеваемости хроническими болезнями",
      text: "Увеличение ОПЖ «упирается» в хронические болезни (диабет, гипертония), а также в заболеваемость органов дыхания.",
      color: PPTX_C.ink,
      body: PPTX_C.ink,
    },
    {
      fill: PPTX_C.moss,
      title: "Среда — ключевой резерв для роста ОПЖ",
      text: "Хронические болезни плохо поддаются только медицинской терапии — они во многом зависят от среды и повседневных привычек.",
      color: PPTX_C.white,
      body: PPTX_C.soft,
    },
  ];
  findings.forEach((card, index) => {
    const width = (12.5 - 0.24) / 3;
    const x = 0.42 + index * (width + 0.12);
    analysis.addShape("roundRect", { x: x, y: 1.9, w: width, h: 4.7, fill: { color: card.fill }, rectRadius: 0.06 });
    pptxText(analysis, card.title, {
      x: x + 0.18,
      y: 2.1,
      w: width - 0.36,
      h: 1.15,
      fontSize: 18,
      bold: true,
      color: card.color,
    });
    pptxText(analysis, card.text, {
      x: x + 0.18,
      y: 3.35,
      w: width - 0.36,
      h: 2.9,
      fontSize: 14,
      color: card.body,
    });
  });

  const indicators = pptxSlide(pptx);
  pptxChrome(indicators, "Результаты апробации");
  pptxHeading(indicators, "Результаты апробации", "Показатели города, 2016–2025");
  [
    {
      title: "Сильные стороны города",
      band: PPTX_C.ink,
      titleColor: PPTX_C.leaf,
      items: [
        { num: "73,6 ⇒ 77,0", lbl: "ОПЖ при рождении, лет" },
        { num: "51,5 ⇒ 62,9%", lbl: "доля занимающихся спортом" },
        { num: "4,2 ⇒ 2,5", lbl: "младенческая смертность, на 1 000 родившихся" },
        { num: "8,6 ⇒ 5,8", lbl: "смертность от ДТП, на 100 тыс." },
      ],
    },
    {
      title: "Явные риски и проблемы",
      band: PPTX_C.leaf,
      titleColor: PPTX_C.ink,
      items: [
        { num: "42,5 ⇒ 67,8", lbl: "сахарный диабет, общая заболеваемость, на 1 000" },
        { num: "9,6 ⇒ 28,6", lbl: "первичная артериальная гипертензия, на 1 000" },
        { num: "152,9 ⇒ 275,5", lbl: "болезни органов дыхания, первичная заболеваемость, на 1 000" },
        { num: "1 510 ⇒ 1 741", lbl: "ожирение детей 0–17, на 100 тыс." },
      ],
    },
    {
      title: "Неустойчивая картина",
      band: PPTX_C.moss,
      titleColor: PPTX_C.leaf,
      items: [
        { num: "425 ⇒ 379", lbl: "смертность от ССЗ, на 100 тыс." },
        { num: "18,8 ⇒ 20,7", lbl: "доля старше трудоспособного возраста, %" },
        { num: "55 ⇒ 90 м²", lbl: "зелень на жителя по городу" },
        { num: "143 ⇒ 151", lbl: "смертность от новообразований, на 100 тыс." },
      ],
    },
  ].forEach((band, index) => {
    const y = 1.32 + index * 1.88;
    indicators.addShape("roundRect", {
      x: 0.32,
      y: y,
      w: 12.7,
      h: 1.78,
      fill: { color: band.band },
      rectRadius: 0.06,
    });
    pptxText(indicators, band.title, {
      x: 0.48,
      y: y + 0.08,
      w: 12.2,
      h: 0.28,
      fontSize: 14,
      bold: true,
      color: band.titleColor,
    });
    pptxCards(
      indicators,
      band.items.map((item) => Object.assign({ fill: PPTX_C.white, numSize: 15, lblSize: 11 }, item)),
      y + 0.4,
      1.26
    );
  });

  const flood = pptxSlide(pptx);
  pptxChrome(flood, "Контекст");
  pptxHeading(
    flood,
    "Контекст апробации Стандарта",
    "Летнее наводнение 2026",
    "Летний подъём Туры — второй за историю наблюдений с 1891 года. Опасная отметка 850 см держалась около 17 суток."
  );
  pptxText(flood, "Отметки уровня", { x: 0.42, y: 1.85, w: 12, h: 0.28, fontSize: 14, bold: true });
  pptxCards(
    flood,
    [
      { num: "915 см", lbl: "1979 · абсолютный рекорд" },
      { num: "868 см", lbl: "2016 · весна" },
      { num: "684 см", lbl: "весна 2026 · без ЧС" },
      { num: "896–897 см", lbl: "лето 2026 · режим ЧС с 28 июля", fill: PPTX_C.floodSoft },
    ],
    2.2,
    1.4
  );
  pptxText(flood, "Ущерб от наводнения для г. Тюмени", {
    x: 0.42,
    y: 3.85,
    w: 12,
    h: 0.28,
    fontSize: 14,
    bold: true,
  });
  pptxText(flood, "Сводка по открытым источникам на конец августа 2026.", {
    x: 0.42,
    y: 4.15,
    w: 12,
    h: 0.24,
    fontSize: 12,
    color: PPTX_C.mute,
  });
  pptxCards(
    flood,
    [
      { num: "151", lbl: "жилых домов в зоне подтопления" },
      { num: "2 056", lbl: "приусадебных участков" },
      { num: "412 + 153", lbl: "жилых и садовых домов к санобработке в городе" },
      { num: "29", lbl: "населённых пунктов в зоне подтопления" },
    ],
    4.5,
    1.45
  );

  const chart = pptxSlide(pptx);
  pptxChrome(chart, "Контекст");
  pptxHeading(
    chart,
    "Контекст апробации Стандарта",
    "Уровень Туры, лето 2026",
    "Оперативные отметки по открытым сводкам. Красная линия на графике — порог опасного явления (ОЯ)."
  );
  pptxFitImage(chart, media.floodChart, { x: 0.42, y: 1.9, w: 12.5, h: 4.7 }, 640 / 220);

  const damage = pptxSlide(pptx);
  pptxChrome(damage, "Контекст");
  pptxHeading(
    damage,
    "Контекст апробации Стандарта",
    "Что пострадало",
    "Основной ущерб — имущество, участки, коммуникации и санитарное состояние. Погибших в открытых сводках по ЧС в Тюмени не сообщалось."
  );
  [
    "В городе уязвимы Старая Зарека, Береговая, мкрн ДОК и Лесобаза (Томская, Спартака, Верещагина, Сеченова, Барабинская), нижние ярусы набережной, СНТ «Родничок», «Дубрава», «Осень», «Берёзка» и др.",
    "Питьевая вода: Метелевский водозабор (~60% сети) не справился с потоком органики, которая сошла с затопленных полей; за 30 дней разобрано 3 378,5 м³ привозной воды, пик 235 м³/сутки.",
    "Замор рыбы ~400 т: кислород в Туре снизился до 0,8 мг/л при норме ~6 мг/л, урожай на подтопленных огородах признан непригодным.",
    "Эвакуация на пике: 53 человека (9 детей) 1 августа, позже по Богандинскому / Пышме — 66 чел.",
  ].forEach((line, index) => {
    const y = 1.78 + index * 1.25;
    damage.addShape("roundRect", { x: 0.42, y: y, w: 12.5, h: 1.14, fill: { color: PPTX_C.cream }, rectRadius: 0.06 });
    pptxText(damage, String(index + 1), {
      x: 0.58,
      y: y + 0.32,
      w: 0.5,
      h: 0.42,
      fontSize: 18,
      bold: true,
      color: PPTX_C.sand,
    });
    pptxText(damage, line, { x: 1.2, y: y + 0.12, w: 11.4, h: 0.9, fontSize: 14, valign: "middle" });
  });

  const prk = pptxSlide(pptx);
  pptxChrome(prk, "Контекст");
  pptxHeading(
    prk,
    "Контекст апробации Стандарта",
    "Природно-рекреационный каркас г. Тюмени",
    "Город уже развивает решения в области озеленения и благоустройства."
  );
  pptxFitImage(prk, media.mapPrk, { x: 0.42, y: 1.82, w: 12.5, h: 4.55 }, 1400 / 780);
  [
    { color: "99479B", label: "Природно-рекреационный каркас" },
    { color: PPTX_C.sand, label: "Пилотные территории" },
    { color: PPTX_C.river, label: "Берегоукрепление" },
    { color: "F4742C", label: "Пешеходный мост" },
  ].forEach((item, index) => {
    const x = 0.42 + index * 3.15;
    prk.addShape("rect", { x: x, y: 6.52, w: 0.38, h: 0.12, fill: { color: item.color } });
    pptxText(prk, item.label, { x: x + 0.48, y: 6.44, w: 2.55, h: 0.28, fontSize: 11, color: PPTX_C.ink, valign: "middle" });
  });

  function solutionSlide(kicker, title, note, band, titleColor, metrics, lines) {
    const slide = pptxSlide(pptx);
    pptxChrome(slide, "Решения");
    pptxHeading(slide, kicker, title, note);
    slide.addShape("roundRect", { x: 0.32, y: 1.85, w: 12.7, h: 1.7, fill: { color: band }, rectRadius: 0.06 });
    pptxCards(
      slide,
      metrics.map((item) => Object.assign({ fill: PPTX_C.white, numSize: 16, lblSize: 12 }, item)),
      2.05,
      1.32
    );
    lines.forEach((line, index) => {
      const y = 3.72 + index * 1.02;
      slide.addShape("roundRect", { x: 0.42, y: y, w: 12.5, h: 0.92, fill: { color: PPTX_C.cream }, rectRadius: 0.06 });
      pptxText(slide, line, { x: 0.62, y: y + 0.12, w: 12.1, h: 0.68, fontSize: 14, valign: "middle" });
    });
  }

  solutionSlide(
    "Решение 1",
    "Берегоукрепление",
    "Строительство защитных сооружений для защиты от наводнений для двух наиболее уязвимых микрорайонов города.",
    PPTX_C.moss,
    PPTX_C.leaf,
    [
      { num: fmtInt(m.prot), lbl: "жителей зоны защиты" },
      { num: fmt(m.floodMln, 3) + " млн ₽/год", lbl: "EAD (ожидаемый среднегодовой ущерб), прокси" },
      { num: fmt(m.peakCut, 0) + " м³/год", lbl: "дополнительное удержание стока" },
    ],
    [
      "Изменение климата и потепление увеличивают вероятность наводнений, при этом ряд новых районов города возводится на уязвимых территориях.",
      "15 097 жителей и 144 объекта — верхняя граница экспозиции до пространственной проверки зоны подтопления.",
      "Эффект от берегоукрепления носит и экономический, и социальный характер.",
    ]
  );
  solutionSlide(
    "Решение 2",
    "Благоустройство и озеленение рекреационных территорий",
    "Обеспечение 15-минутной доступности лесопарковых территорий для пеших прогулок.",
    PPTX_C.leaf,
    PPTX_C.ink,
    [
      { num: fmt(m.co2, 1) + " т CO2/год", lbl: "дополнительное чистое поглощение" },
      { num: fmt(m.dalyYear, 2) + " DALY/год", lbl: "частичный сценарный эффект здоровья" },
      { num: fmt(m.dalyPer1000, 1), lbl: "DALY на 1 000 жителей за 20 лет" },
    ],
    [
      "В городе нарастает проблема хронических неинфекционных заболеваний (ХНИЗ), которые существенно ограничивают и ОПЖ, и производительность труда.",
      "Не все районы города обеспечены зелеными территориями для пеших прогулок. Район «Оброчное» зажат между жилой застройкой и промышленными предприятиями.",
      "Для Оброчного необходимо строительство моста для доступа к комфортной лесопарковой зоне.",
    ]
  );

  function territorySlide(part, key, title, task, caption, stats, aspect) {
    const slide = pptxSlide(pptx);
    pptxChrome(slide, "Эффекты от пилотов");
    pptxHeading(slide, "Эффекты от пилотов", title, task);
    const map = key === "p1" ? media.mapP1 : media.mapP2;
    pptxFitImage(slide, map, { x: 0.42, y: 1.8, w: 8.15, h: 4.85 }, aspect);
    stats.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 8.75 + col * 2.15;
      const y = 1.8 + row * 1.2;
      slide.addShape("roundRect", { x: x, y: y, w: 2.05, h: 1.08, fill: { color: PPTX_C.cream }, rectRadius: 0.05 });
      pptxText(slide, item.num, { x: x + 0.08, y: y + 0.08, w: 1.9, h: 0.4, fontSize: 13, bold: true });
      pptxText(slide, item.lbl, { x: x + 0.08, y: y + 0.48, w: 1.9, h: 0.5, fontSize: 10, color: PPTX_C.mute });
    });
    pptxText(slide, caption, { x: 0.42, y: 6.75, w: 8.15, h: 0.28, fontSize: 11, color: PPTX_C.mute });
  }

  territorySlide(
    p1,
    "p1",
    "мкрн Оброчное",
    "Проблема: уязвимость к подтоплениям и недостаток обустроенных зеленых территорий для пеших прогулок (15-минутная доступность). Основная задача: обеспечение пешего доступа к зеленым территориям.",
    "Контур озеленения · берегоукрепление 1 510 м · пешеходный мост 303 м.",
    [
      { num: fmtInt(m.h1.nearby), lbl: "постоянных жителей" },
      { num: fmtInt(m.h1.houses), lbl: "объектов, верхняя граница" },
      { num: fmt(p1.greenHa, 1) + " га", lbl: "озеленение" },
      { num: fmtInt(p1.trees), lbl: "деревьев" },
      { num: "1,51 км", lbl: "берегоукрепления" },
      { num: "303 м", lbl: "пешеходный мост" },
      { num: money(p1.total / 1e6), lbl: "CAPEX части" },
      { num: money(m.f1.opex) + "/год", lbl: "OPEX" },
    ],
    1280 / 720
  );
  pilotEffects("мкрн Оброчное", m.n1, m.h1, m.e1, m.f1);
  territorySlide(
    p2,
    "p2",
    "мкрн ДОК",
    "Основная задача: защита застройки от подтопления.",
    "Контур озеленения · берегоукрепление 3 538 м.",
    [
      { num: fmtInt(m.h2.nearby), lbl: "постоянных жителей" },
      { num: fmtInt(m.h2.houses), lbl: "объектов, верхняя граница" },
      { num: fmt(p2.greenHa, 1) + " га", lbl: "озеленение" },
      { num: fmtInt(p2.trees), lbl: "деревьев" },
      { num: "3,53 км", lbl: "берегоукрепления" },
      { num: money(p2.total / 1e6), lbl: "CAPEX части" },
      { num: money(m.f2.opex) + "/год", lbl: "OPEX" },
    ],
    1280 / 720
  );
  pilotEffects("мкрн ДОК", m.n2, m.h2, m.e2, m.f2);

  function pptxGrid(slide, items, box, cols) {
    const gap = 0.1;
    const rows = Math.ceil(items.length / cols);
    const cardW = (box.w - gap * (cols - 1)) / cols;
    const cardH = (box.h - gap * (rows - 1)) / rows;
    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = box.x + col * (cardW + gap);
      const y = box.y + row * (cardH + gap);
      slide.addShape("roundRect", {
        x: x,
        y: y,
        w: cardW,
        h: cardH,
        fill: { color: PPTX_C.white },
        rectRadius: 0.05,
      });
      pptxText(slide, item.num, {
        x: x + 0.1,
        y: y + 0.08,
        w: cardW - 0.2,
        h: 0.34,
        fontSize: 15,
        bold: true,
      });
      pptxText(slide, item.lbl, {
        x: x + 0.1,
        y: y + 0.42,
        w: cardW - 0.2,
        h: cardH - 0.5,
        fontSize: 11,
        color: PPTX_C.mute,
      });
    });
  }

  function pilotEffects(title, n, h, e, f) {
    const econ = pptxSlide(pptx);
    pptxChrome(econ, "Эффекты от пилотов");
    pptxHeading(econ, "Эффекты от пилотов", title + " · экономика");
    econ.addShape("roundRect", {
      x: 0.32,
      y: 1.32,
      w: 12.7,
      h: 5.58,
      fill: { color: PPTX_C.leaf },
      rectRadius: 0.06,
    });
    pptxText(econ, "Экономика", {
      x: 0.48,
      y: 1.42,
      w: 12.2,
      h: 0.28,
      fontSize: 16,
      bold: true,
      color: PPTX_C.ink,
    });
    pptxText(econ, "ОЗЕЛЕНЕНИЕ И БЛАГОУСТРОЙСТВО", {
      x: 0.48,
      y: 1.74,
      w: 12.2,
      h: 0.22,
      fontSize: 11,
      bold: true,
      color: PPTX_C.ink,
    });
    pptxGrid(
      econ,
      [
        { num: money(n.constructionGvaMln), lbl: "прямая ВДС строительства; при реализации за 1 год — ВДС/год" },
        { num: money(n.visitorGvaMln), lbl: "ВДС от посещения благоустроенных парков в год, включая мультипликатор 2,2" },
        { num: money(n.budget), lbl: "налоги и страховые взносы за 20 лет" },
        { num: fmtInt(n.visitorPopulation), lbl: "потенциальных посетителей парка" },
        { num: fmtInt(n.visitorVisitsYear), lbl: "посещений парка в год" },
        { num: money(n.visitorSpendMln), lbl: "расходы посетителей в год" },
      ],
      { x: 0.48, y: 2.02, w: 12.38, h: 2.45 },
      3
    );
    pptxText(econ, "БЕРЕГОУКРЕПЛЕНИЕ", {
      x: 0.48,
      y: 4.58,
      w: 12.2,
      h: 0.22,
      fontSize: 11,
      bold: true,
      color: PPTX_C.ink,
    });
    pptxGrid(
      econ,
      [
        { num: fmt(h.floodH, 3) + " млн ₽/год", lbl: "предотвращённые минимальные бюджетные выплаты" },
        { num: fmt(e.peakCut, 0) + " м³/год", lbl: "дополнительное удержание стока" },
      ],
      { x: 0.48, y: 4.86, w: 12.38, h: 1.8 },
      2
    );

    const rest = pptxSlide(pptx);
    pptxChrome(rest, "Эффекты от пилотов");
    pptxHeading(rest, "Эффекты от пилотов", title + " · экология и здоровье");
    rest.addShape("roundRect", {
      x: 0.32,
      y: 1.32,
      w: 12.7,
      h: 2.45,
      fill: { color: PPTX_C.river },
      rectRadius: 0.06,
    });
    pptxText(rest, "Экология", {
      x: 0.48,
      y: 1.42,
      w: 12.2,
      h: 0.28,
      fontSize: 16,
      bold: true,
      color: PPTX_C.ink,
    });
    pptxGrid(
      rest,
      [
        { num: fmt(e.co2, 1) + " т/год", lbl: "дополнительное чистое поглощение CO2" },
        { num: fmt(f.amenityGreen20, 1) + " т", lbl: "накопленное поглощение CO2 за 20 лет" },
      ],
      { x: 0.48, y: 1.8, w: 12.38, h: 1.75 },
      2
    );
    rest.addShape("roundRect", {
      x: 0.32,
      y: 3.92,
      w: 12.7,
      h: 2.85,
      fill: { color: PPTX_C.moss },
      rectRadius: 0.06,
    });
    pptxText(rest, "Здоровье", {
      x: 0.48,
      y: 4.02,
      w: 6,
      h: 0.28,
      fontSize: 16,
      bold: true,
      color: PPTX_C.leaf,
    });
    pptxText(rest, "ОЗЕЛЕНЕНИЕ И БЛАГОУСТРОЙСТВО", {
      x: 6.4,
      y: 4.04,
      w: 6.2,
      h: 0.24,
      fontSize: 11,
      bold: true,
      color: PPTX_C.leaf,
      align: "right",
    });
    pptxGrid(
      rest,
      [
        { num: fmt(h.amenityH, 2), lbl: "YLL — предотвращённые потерянные годы жизни в год" },
        { num: fmt(h.coolHealth, 3), lbl: "YLD — предотвращённые годы с нарушением здоровья в год" },
        { num: fmt(f.daly20, 1), lbl: "DALY — предотвращённые потери здоровой жизни за 20 лет" },
      ],
      { x: 0.48, y: 4.42, w: 12.38, h: 2.1 },
      3
    );
  }

  function capexSlide(part, title, note, withBridge) {
    const slide = pptxSlide(pptx);
    pptxChrome(slide, "Инвестиции");
    const y = pptxHeading(slide, "Инвестиции в пилоты", title, note);
    pptxText(slide, money(part.total / 1e6) + " · CAPEX без НДС", {
      x: 0.42,
      y: y,
      w: 12.5,
      h: 0.32,
      fontSize: 18,
      bold: true,
    });
    pptxStackedBar(
      slide,
      [
        { name: "Озеленение", v: part.greenRub, val: money(part.greenRub / 1e6), color: PPTX_C.moss },
        { name: "Благоустройство", v: part.amenityRub, val: money(part.amenityRub / 1e6), color: PPTX_C.sand },
        { name: "Инженерная защита", v: part.engRub, val: money(part.engRub / 1e6), color: PPTX_C.river },
      ],
      { x: 0.42, y: y + 0.38, w: 12.5, h: 0.36 }
    );
    pptxCapexColumns(slide, y + 1.12, [
      {
        title: "Озеленение",
        sum: money(part.greenRub / 1e6),
        note: fmt(part.greenHa, 1) + " га · " + fmtInt(part.trees) + " деревьев",
        fill: PPTX_C.moss,
        bar: PPTX_C.moss,
        rows: reportGreenRows(part),
      },
      {
        title: "Благоустройство",
        sum: money(part.amenityRub / 1e6),
        note: fmt(part.activeHa, 1) + " га интенсивного использования",
        fill: PPTX_C.sand,
        bar: PPTX_C.sand,
        rows: reportAmenityRows(part),
      },
      {
        title: "Инженерная защита",
        sum: money(part.engRub / 1e6),
        note: withBridge ? "Берег, ливневая канализация, очистка, мост" : "Берег, ливневая канализация, очистка стока",
        fill: PPTX_C.river,
        bar: PPTX_C.river,
        rows: reportEngRows(part, withBridge),
      },
    ]);
  }

  capexSlide(p2, "Структура вложений · мкрн ДОК", "Компонентный CAPEX — нижняя оценка, без НДС. Берегоукрепление по Туре 3 538 м · без моста.", false);
  capexSlide(p1, "Структура вложений · мкрн Оброчное", "Берегоукрепление 1 510 м · пешеходный мост 303 м. Без НДС.", true);

  const compare = pptxSlide(pptx);
  pptxChrome(compare, "Инвестиции");
  pptxHeading(compare, "Инвестиции в пилоты", "Сравнение вложений по территориям");
  const compareRows = [
    ["", "мкрн ДОК", "мкрн Оброчное", "Итого"],
    ["Озеленение, млн ₽", fmt(p2.greenRub / 1e6, 1), fmt(p1.greenRub / 1e6, 1), fmt(m.greenRub / 1e6, 1)],
    ["Благоустройство, млн ₽", fmt(p2.amenityRub / 1e6, 1), fmt(p1.amenityRub / 1e6, 1), fmt(m.amenityRub / 1e6, 1)],
    ["Инженерная защита, млн ₽", fmt(p2.engRub / 1e6, 1), fmt(p1.engRub / 1e6, 1), fmt(m.engRub / 1e6, 1)],
    ["CAPEX всего, млн ₽", fmt(p2.total / 1e6, 1), fmt(p1.total / 1e6, 1), fmt(m.capexMln, 1)],
    [
      "На 1 га территории, млн ₽/га",
      fmt(p2.total / 1e6 / MODEL.parts.p2.areaHa, 2),
      fmt(p1.total / 1e6 / MODEL.parts.p1.areaHa, 2),
      fmt(m.capexMln / m.area, 2),
    ],
  ].map((row, rowIndex) =>
    row.map((value, col) =>
      pptxCell(value, {
        fill: rowIndex === 0 ? PPTX_C.ink : rowIndex === 4 ? PPTX_C.pineSoft : PPTX_C.cream,
        bold: rowIndex === 0 || rowIndex === 4 || col === 0,
        align: col ? "right" : "left",
      })
    )
  );
  pptxTable(compare, compareRows, { x: 0.42, y: 1.5, w: 12.5, colW: [4.4, 2.7, 2.7, 2.7], size: 13 });
  compare.addShape("roundRect", { x: 0.42, y: 5.15, w: 12.5, h: 1.45, fill: { color: PPTX_C.cream }, rectRadius: 0.06 });
  pptxText(
    compare,
    "НЦС-референс полного озеленения парка на " +
      fmt(m.greenHa, 0) +
      " га — около " +
      fmt(m.ncsMln / 1000, 1) +
      " млрд ₽. Компонентный метод (" +
      fmt(m.greenRub / 1e6, 0) +
      " млн ₽) — " +
      fmt((m.greenRub / 1e6 / m.ncsMln) * 100, 0) +
      "% от НЦС.",
    { x: 0.62, y: 5.4, w: 12.1, h: 0.95, fontSize: 15, color: PPTX_C.mute }
  );

  const fund = pptxSlide(pptx);
  pptxChrome(fund, "Финансирование");
  pptxHeading(
    fund,
    "Финансирование",
    "Потенциальные источники финансирования",
    "Потенциальные источники из федерального бюджета или внебюджетных средств."
  );
  pptxCards(
    fund,
    [
      { num: fmt(split.share * 100, 0) + "%", lbl: "доля сметы не из бюджетов субъекта и муниципалитета", fill: PPTX_C.riverSoft },
      { num: money(split.outsideMln), lbl: "федеральные субсидии и КРТ застройщика", fill: PPTX_C.pineSoft },
      { num: money(split.localMln), lbl: "остаётся за областью и городом", fill: PPTX_C.sandSoft },
    ],
    1.78,
    1.18
  );
  pptxFundCharts(fund, pptx, split, money, 3.12);
  pptxText(
    fund,
    "Федерация: берегоукрепление, ливневка и очистка за вычетом участка застройщика — " +
      fmt(split.federalMln, 0) +
      " млн ₽. КРТ: 733 м набережной мкрн ДОКа (" +
      fmt(split.devShoreMln, 0) +
      " млн ₽) и 8,8 тыс. м² благоустройства (" +
      fmt(split.devAmenityMln, 0) +
      " млн ₽). Озеленение и мост профильного федерального источника не имеют.",
    { x: 0.42, y: 6.28, w: 12.5, h: 0.72, fontSize: 11, color: PPTX_C.mute }
  );

  const sources = pptxSlide(pptx);
  pptxChrome(sources, "Финансирование");
  pptxHeading(sources, "Финансирование", "Как могут закрываться статьи сметы");
  pptxSourceColumns(sources, 1.28);

  const method = pptxSlide(pptx);
  pptxChrome(method, "Методология");
  pptxHeading(
    method,
    "Методология",
    "Методология оценки эффектов",
    "Оценка выполнена по 2 пилотным территориям на горизонте 20 лет эксплуатации. Экономический, экологический и медико-социальный контуры рассматриваются раздельно. Суммирование разнородных показателей в единый интегральный эффект не применяется."
  );
  pptxNarrative(
    method,
    [
      {
        fill: PPTX_C.leaf,
        kicker: "Экономика",
        kickerColor: PPTX_C.ink,
        title: "ВДС и бюджетный эффект",
        color: PPTX_C.ink,
        lines: [
          "Прямая ВДС строительства — локализованная часть CAPEX без НДС, умноженная на отраслевую долю добавленной стоимости. Эксплуатационные эффекты сюда не входят.",
          "Активность посетителей: жители пилотных территорий и 2% остального населения Тюмени, 8 посещений в год, 45% с расходами, средний чек 350 ₽. Налоги — по нагрузке строительства. Выплаты при подтоплении — только единовременная помощь.",
        ],
      },
      {
        fill: PPTX_C.river,
        kicker: "Экология",
        kickerColor: PPTX_C.ink,
        title: "CO2 и удержание стока",
        color: PPTX_C.ink,
        lines: [
          "Считается только разница с сохранением существующей растительности. В базе дополнительные деревья — 10% проектного числа, приживаемость 85%, зрелость 0,6 за 20 лет.",
          "Дополнительное удержание стока — 8 мм в год на площадь зоны воздействия. При росте водонепроницаемых покрытий эффект может снижаться или менять знак.",
        ],
      },
      {
        fill: PPTX_C.moss,
        kicker: "Здоровье",
        kickerColor: PPTX_C.leaf,
        title: "Потери здоровой жизни",
        color: PPTX_C.white,
        lines: [
          "DALY: годы жизни, потерянные из-за преждевременной смерти, плюс годы с нарушением здоровья. Основной результат не дисконтируется.",
          "YLL включает физическую активность, жару и PM2.5. YLD — только психическое здоровье. Последствия подтоплений и NO2 в итог не входят.",
          "Полный эффект нарастает 5 лет по методике ВОЗ. Это сценарная оценка высокой неопределенности.",
        ],
      },
    ],
    2.15
  );

  const scenarios = pptxSlide(pptx);
  pptxChrome(scenarios, "Сценарии");
  const scenarioY = pptxHeading(
    scenarios,
    "Сценарии",
    "Сравнение сценариев по контурам",
    "Базовый сценарий — абсолютное значение. Низкий и высокий — отклонение от базового: плюс означает больший эффект, минус — меньший."
  );
  const scenarioGroups = pptxScenarioGroups();
  if (!scenarioGroups.length) {
    pptxText(scenarios, "Сценарная таблица недоступна.", { x: 0.42, y: scenarioY, w: 12, h: 0.3, fontSize: 14, color: PPTX_C.mute });
  } else {
    pptxTable(scenarios, pptxScenarioRows(scenarioGroups), {
      x: 0.32,
      y: scenarioY + 0.06,
      w: 12.7,
      colW: [5.9, 1.7, 1.55, 1.9, 1.65],
      size: 9,
      margin: 3,
    });
  }

  return pptx;
}

async function downloadReportPptx() {
  const status = document.getElementById("report-status");
  if (status) status.textContent = "Формируется презентация PowerPoint…";
  if (typeof setReportExportBusy === "function") setReportExportBusy(true);
  const filename = "Otchet_Tyumen_Standart_" + reportFileStamp() + ".pptx";
  try {
    const pptx = await buildReportPptx();
    if (status) status.textContent = "Сохраняется файл PowerPoint…";
    await pptx.writeFile({ fileName: filename });
    if (status) {
      status.textContent =
        "PowerPoint сохранен: " + filename + " · те же разделы и цифры, что в отчете Word · " + reportDate() + ".";
    }
  } finally {
    if (typeof setReportExportBusy === "function") setReportExportBusy(false);
  }
}

window.buildReportPptx = buildReportPptx;
window.downloadReportPptx = downloadReportPptx;
