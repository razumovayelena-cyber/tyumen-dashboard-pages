/* Расчётная модель: Расчет_озеленение_благоустройство_Тюмень_озера_обновленный.xlsx.
   Единый горизонт NPV, эффектов здоровья и DALY — 20 лет.
   K5, K11, K12 — из листа «Здрав_Потери от болезней». Стресс от паводка (K6) исключён. */

const MODEL = {
  city: "Тюмень",
  population: 872077,
  parts: {
    p1: {
      name: "Часть 1",
      place: "мкрн Оброчное",
      blurb: "Массив у системы Оброчное–Кривое–Песьяное: зелёный буфер, берегоукрепление и пешеходный мост.",
      areaHa: 182.12,
      perimeterM: 7924,
      shoreM: 1507,
      residentsProtected: 5702,
      houses: 29,
    },
    p2: {
      name: "Часть 2",
      place: "мкрн ДОК",
      blurb: "Крупный массив в жилой зоне мкрн ДОК: повседневная рекреация, уличные кроны и берегоукрепление по Туре.",
      areaHa: 234.6,
      perimeterM: 8416,
      shoreM: 3528,
      residentsProtected: 9395,
      houses: 116,
    },
  },
  trees: {
    perHa: 200,
    price: 9120,
    companionPerHa: 1850000,
    mix: [
      { name: "Берёза повислая", share: 0.28, price: 7500, co2: 11 },
      { name: "Сосна обыкновенная", share: 0.22, price: 12500, co2: 14 },
      { name: "Лиственница сибирская", share: 0.17, price: 11500, co2: 15 },
      { name: "Рябина обыкновенная", share: 0.17, price: 6500, co2: 10 },
      { name: "Яблоня ягодная", share: 0.09, price: 7000, co2: 10 },
      { name: "Ива белая / ломкая", share: 0.05, price: 6000, co2: 16 },
      { name: "Ель сибирская", share: 0.02, price: 14000, co2: 9 },
    ],
    co2PerTree: 12.29,
  },
  amenity: {
    pathShare: 0.12,
    pathRubM2: 4500,
    flowerShare: 0.05,
    flowerRubM2: 2800,
    playgroundHa: 8,
    playgroundRub: 3500000,
    toiletHa: 12,
    toiletRub: 2200000,
    truckHa: 15,
    truckRub: 1200000,
    cafeHa: 20,
    cafeRub: 2500000,
    mafPerHa: 450000,
  },
  shore: {
    baseRubM: 45000,
    complexity: 1.15,
    extras: 0.12,
    stormRubM: 18000,
    stormShare: 1,
    treatmentEveryM: 2000,
    treatmentRub: 25000000,
    bridgeM: 302,
    bridgeW: 4,
    bridgeRubM2: 120000,
    bridgeK: 1.2,
  },
  eco: {
    lawnCo2T: 3.5,
    maturity: 0.6,
    carbonRubT: 3500,
    moistureM3Ha: 800,
    bufferShare: 0.35,
    peakCut: 0.25,
    floodRubM3: 120,
    coolC: 1.8,
    coolShare: 0.25,
    coolRub: 450,
    carKgKm: 0.17,
  },
  econ: {
    ticket: 350,
    payingShare: 0.45,
    cityKeep: 0.8,
    vasShare: 0.45,
    multiplier: 2.2,
    jobsPerObject: 2.5,
    jobsPer10Ha: 1.5,
    wage: 65000,
    ndfl: 0.13,
    ndflCity: 0.3,
    turnoverTax: 0.08,
    cityTaxShare: 0.22,
    housingM2: 4500000,
    housingRubM2: 120000,
    housingUplift: 0.015,
    housingAnnual: 0.1,
    years: 20,
    rate: 0.1,
    ramp: [0.4, 0.6, 0.8],
  },
  opex: {
    green: 0.03,
    amenity: 0.04,
    engineering: 0.02,
  },
  health: {
    residentsProtected: 5702 + 9395,
    floodProb: 0.1,
    preventShare: 0.15,
    illShare: 0.2,
    caseRub: 18696.74,
    houses: 29 + 116,
    housesCity: 800,
    sanitizeRub: 25000,
    payout: {
      aidPerPerson: 15675,
      peopleMin: 1,
      peopleWork: 3,
      propertyRub: 156750,
      repairM2: 80,
      repairRubM2: 9360,
      replaceM2: 54,
    },
    nearby: 40000,
    newActiveShare: 0.05,
    activeHealthRub: 9045.14,
    mentalUsd: 400,
    mentalRub: 9651.6,
    mentalShare: 0.2,
    coolHealthShare: 0.6,
    years: 20,
    dalyPA: 0.025,
    dalyMental: 0.008,
    dalyHeat: 0.00004,
  },
  visit: {
    attract: 0.4,
    visits: 8,
    tourists: 0.1,
    days: 300,
    peakK: 2.5,
    capacityPerHa: 70,
  },
  ncs: { perHaThous: 26555.59, k: 1.01 },
  flood: {
    danger: 850,
    record: 915,
    spring2026: 684,
    summerPeak: 896.5,
    series: [
      { d: "13.06", v: 381 },
      { d: "12.07", v: 650 },
      { d: "22.07", v: 762 },
      { d: "28.07", v: 877 },
      { d: "02.08", v: 896.5 },
      { d: "12.08", v: 848 },
      { d: "20.08", v: 796 },
      { d: "30.08", v: 740 },
    ],
    history: [
      { y: "1979", v: 915, t: "рекорд" },
      { y: "2016", v: 868, t: "весна" },
      { y: "2025", v: 612, t: "весна" },
      { y: "весна 2026", v: 684, t: "весна" },
      { y: "лето 2026", v: 897, t: "лето, 2-е место" },
    ],
  },
};

function annuity(n, r) {
  return r === 0 ? n : (1 - Math.pow(1 + r, -n)) / r;
}

function rampFactor(n, r, ramp) {
  let factor = 0;
  for (let year = 1; year <= n; year += 1) {
    const share = year <= ramp.length ? ramp[year - 1] : 1;
    factor += share / Math.pow(1 + r, year);
  }
  return factor;
}

function rampYears(n, ramp) {
  let years = 0;
  for (let year = 1; year <= n; year += 1) {
    years += year <= ramp.length ? ramp[year - 1] : 1;
  }
  return years;
}

function roundup(x) {
  return Math.ceil(x - 1e-12);
}

function partCapex(areaHa, shoreM, withBridge) {
  const a = MODEL.amenity;
  const t = MODEL.trees;
  const s = MODEL.shore;
  const greenHa = areaHa * STATE.greenShare;
  const activeHa = areaHa * STATE.activeShare;
  const trees = greenHa * t.perHa;
  const greenRub = trees * t.price + greenHa * t.companionPerHa;

  const activeM2 = activeHa * 10000;
  const pathRub = activeM2 * a.pathShare * a.pathRubM2;
  const flowerRub = activeM2 * a.flowerShare * a.flowerRubM2;
  const playgrounds = roundup(activeHa / a.playgroundHa);
  const toilets = roundup(activeHa / a.toiletHa);
  const trucks = roundup(activeHa / a.truckHa);
  const cafes = roundup(activeHa / a.cafeHa);
  const playgroundRub = playgrounds * a.playgroundRub;
  const toiletRub = toilets * a.toiletRub;
  const truckRub = trucks * a.truckRub;
  const cafeRub = cafes * a.cafeRub;
  const mafRub = activeHa * a.mafPerHa;
  const amenityRub =
    pathRub + flowerRub + playgroundRub + toiletRub + truckRub + cafeRub + mafRub;

  const unitShore = s.baseRubM * s.complexity * (1 + s.extras);
  const shoreRub = shoreM * unitShore;
  const stormRub = shoreM * s.stormShare * s.stormRubM;
  const treatmentN = shoreM === 0 ? 0 : roundup(shoreM / s.treatmentEveryM);
  const treatmentRub = treatmentN * s.treatmentRub;
  const bridgeRub = withBridge ? s.bridgeM * s.bridgeW * s.bridgeRubM2 * s.bridgeK : 0;

  return {
    greenHa,
    activeHa,
    trees,
    greenRub,
    amenityRub,
    shoreRub,
    stormRub,
    treatmentRub,
    treatmentN,
    bridgeRub,
    engRub: shoreRub + stormRub + treatmentRub + bridgeRub,
    total: greenRub + amenityRub + shoreRub + stormRub + treatmentRub + bridgeRub,
    playgrounds,
    toilets,
    trucks,
    cafes,
    objects: trucks + cafes,
    pathM2: activeM2 * a.pathShare,
    flowerM2: activeM2 * a.flowerShare,
    pathRub,
    flowerRub,
    playgroundRub,
    toiletRub,
    truckRub,
    cafeRub,
    mafRub,
    stormTreatRub: stormRub + treatmentRub,
  };
}

const STATE = {
  greenShare: 0.5,
  activeShare: 0.15,
  attract: MODEL.visit.attract,
  visits: MODEL.visit.visits,
  housingUplift: MODEL.econ.housingUplift,
  preventShare: MODEL.health.preventShare,
  newActiveShare: MODEL.health.newActiveShare,
  scenario: "city",
  effectScenario: "base",
};

function compute() {
  const p1 = partCapex(MODEL.parts.p1.areaHa, MODEL.parts.p1.shoreM, true);
  const p2 = partCapex(MODEL.parts.p2.areaHa, MODEL.parts.p2.shoreM, false);
  const area = MODEL.parts.p1.areaHa + MODEL.parts.p2.areaHa;
  const share1 = MODEL.parts.p1.areaHa / area;
  const share2 = 1 - share1;

  const popA = MODEL.population * STATE.attract;
  const visits = popA * STATE.visits * (1 + MODEL.visit.tourists);
  const v1 = visits * share1;
  const v2 = visits * share2;
  const peak = (visits / MODEL.visit.days) * MODEL.visit.peakK;
  const cap = area * MODEL.visit.capacityPerHa;

  function eco(part, areaShare) {
    const rawTree = (part.trees * MODEL.trees.co2PerTree) / 1000;
    const rawLawn = part.greenHa * MODEL.eco.lawnCo2T;
    const co2 = (rawTree + rawLawn) * MODEL.eco.maturity;
    const bufferHa = part.greenHa * MODEL.eco.bufferShare;
    const moisture = part.greenHa * MODEL.eco.moistureM3Ha;
    const peakCut = bufferHa * MODEL.eco.moistureM3Ha * MODEL.eco.peakCut;
    const co2Mln = (co2 * MODEL.eco.carbonRubT) / 1e6;
    const floodMln = (peakCut * MODEL.eco.floodRubM3) / 1e6;
    return { co2, peakCut, moisture, co2Mln, floodMln, ecoMln: co2Mln + floodMln };
  }

  const e1 = eco(p1, share1);
  const e2 = eco(p2, share2);

  function econ(part, vis, areaShare) {
    const paying = vis * MODEL.econ.payingShare;
    const gross = (paying * MODEL.econ.ticket) / 1e6;
    const cityTurn = gross * MODEL.econ.cityKeep;
    const vas = cityTurn * MODEL.econ.vasShare * MODEL.econ.multiplier;
    const jobsObj = part.objects * MODEL.econ.jobsPerObject;
    const jobsKeep = (part.activeHa / 10) * MODEL.econ.jobsPer10Ha;
    const jobs = jobsObj + jobsKeep;
    const fot = (jobs * MODEL.econ.wage * 12) / 1e6;
    const ndflCity = fot * MODEL.econ.ndfl * MODEL.econ.ndflCity;
    const turnTaxCity = cityTurn * MODEL.econ.turnoverTax * MODEL.econ.cityTaxShare;
    const budget = ndflCity + turnTaxCity;
    const housingStock = (MODEL.econ.housingM2 * MODEL.econ.housingRubM2) / 1e6;
    const housingOnce = housingStock * STATE.housingUplift * areaShare;
    const housingYear = housingOnce * MODEL.econ.housingAnnual;
    const cityMetric = cityTurn + budget + housingYear;
    const cityNoHouse = cityTurn + budget;
    return { cityTurn, vas, jobs, budget, ndflCity, turnTaxCity, housingYear, cityMetric, cityNoHouse, gross };
  }

  const n1 = econ(p1, v1, share1);
  const n2 = econ(p2, v2, share2);

  function health(areaShare, part) {
    const prot = part.residentsProtected;
    const cases = prot * MODEL.health.floodProb * STATE.preventShare * MODEL.health.illShare;
    const treat = (cases * MODEL.health.caseRub) / 1e6;
    const sanitize =
      (part.houses * MODEL.health.floodProb * STATE.preventShare * MODEL.health.sanitizeRub) / 1e6;
    const floodH = treat + sanitize;
    const nearby = MODEL.health.nearby * areaShare;
    const active = nearby * STATE.newActiveShare;
    const phys = (active * MODEL.health.activeHealthRub) / 1e6;
    const mental = (active * MODEL.health.mentalRub * MODEL.health.mentalShare) / 1e6;
    const amenityH = phys + mental;
    const coolPeople = popA * MODEL.eco.coolShare * areaShare;
    const coolTotal = (coolPeople * MODEL.eco.coolC * MODEL.eco.coolRub) / 1e6;
    const coolHealth = coolTotal * MODEL.health.coolHealthShare;
    const dalyPA = active * MODEL.health.dalyPA;
    const dalyMental = active * MODEL.health.dalyMental;
    const dalyHeat =
      coolPeople * MODEL.eco.coolC * MODEL.health.dalyHeat * MODEL.health.coolHealthShare;
    return {
      prot,
      nearby,
      houses: part.houses,
      cases,
      floodH,
      active,
      amenityH,
      coolTotal,
      coolHealth,
      coolPeople,
      phys,
      mental,
      treat,
      sanitize,
      dalyPA,
      dalyMental,
      dalyHeat,
      dalyYear: dalyPA + dalyMental + dalyHeat,
      medicalNpv: treat + amenityH + coolHealth,
      total: floodH + amenityH + coolHealth,
    };
  }

  const h1 = health(share1, MODEL.parts.p1);
  const h2 = health(share2, MODEL.parts.p2);

  const pay = MODEL.health.payout;
  const payHouseMin = pay.peopleMin * pay.aidPerPerson;
  const payHouseWork = pay.peopleWork * pay.aidPerPerson + pay.propertyRub + pay.repairM2 * pay.repairRubM2;
  const payHouseMax = pay.peopleWork * pay.aidPerPerson + pay.propertyRub + pay.replaceM2 * MODEL.econ.housingRubM2;
  const payoutHouses = MODEL.health.housesCity;
  const payoutEventMin = (payoutHouses * payHouseMin) / 1e6;
  const payoutEventWork = (payoutHouses * payHouseWork) / 1e6;
  const payoutEventMax = (payoutHouses * payHouseMax) / 1e6;
  const payoutYearMin = payoutEventMin * MODEL.health.floodProb;
  const payoutYearWork = payoutEventWork * MODEL.health.floodProb;
  const payoutYearMax = payoutEventMax * MODEL.health.floodProb;

  const capex = p1.total + p2.total;
  const cityYear = n1.cityMetric + n2.cityMetric;
  const cityNoHouse = n1.cityNoHouse + n2.cityNoHouse;
  const vasYear = n1.vas + n2.vas;
  const ecoYear = e1.ecoMln + e2.ecoMln;
  const healthYear = h1.medicalNpv + h2.medicalNpv;
  const healthN = MODEL.health.years;
  const effectiveYears = rampYears(healthN, MODEL.econ.ramp);
  const benefitFactor = rampFactor(MODEL.econ.years, MODEL.econ.rate, MODEL.econ.ramp);
  const opexFactor = annuity(MODEL.econ.years, MODEL.econ.rate);
  const coolTotal = h1.coolTotal + h2.coolTotal;
  const coolHealth = h1.coolHealth + h2.coolHealth;
  const amenityHealthYear = h1.amenityH + h2.amenityH + coolHealth;
  const amenityGreenYear = h1.amenityH + h2.amenityH + coolTotal;
  const amenityGreen20 = amenityGreenYear * effectiveYears;
  const amenityGreenPV = amenityGreenYear * benefitFactor;
  const dalyYear = h1.dalyYear + h2.dalyYear;
  const daly20 = dalyYear * effectiveYears;
  const dalyPer1000 = MODEL.health.nearby > 0 ? (daly20 / MODEL.health.nearby) * 1000 : 0;
  const greenRub = p1.greenRub + p2.greenRub;
  const amenityRub = p1.amenityRub + p2.amenityRub;
  const engRub = p1.engRub + p2.engRub;
  const opexMln =
    (greenRub * MODEL.opex.green +
      amenityRub * MODEL.opex.amenity +
      engRub * MODEL.opex.engineering) /
    1e6;

  let benefits, label;
  if (STATE.scenario === "ops") {
    benefits = vasYear + ecoYear;
    label = "ВДС + экологические выгоды − OPEX";
  } else if (STATE.scenario === "city") {
    benefits = vasYear;
    label = "валовая добавленная стоимость − OPEX";
  } else {
    benefits = vasYear + ecoYear + healthYear;
    label = "ВДС + экология + медико-социальные выгоды − OPEX";
  }

  const annual = benefits - opexMln;
  const pvBenefits = benefits * benefitFactor;
  const pvOpex = opexMln * opexFactor;
  const pv = pvBenefits - pvOpex;
  const npv = pv - capex / 1e6;
  const payback = annual > 0 ? capex / 1e6 / annual : null;

  function partEffects(part, n, e, h, visits) {
    const opex =
      (part.greenRub * MODEL.opex.green +
        part.amenityRub * MODEL.opex.amenity +
        part.engRub * MODEL.opex.engineering) /
      1e6;
    let partBenefits;
    if (STATE.scenario === "ops") partBenefits = n.vas + e.ecoMln;
    else if (STATE.scenario === "city") partBenefits = n.vas;
    else partBenefits = n.vas + e.ecoMln + h.medicalNpv;
    const partAnnual = partBenefits - opex;
    return {
      opex,
      benefits: partBenefits,
      annual: partAnnual,
      npv: partBenefits * benefitFactor - opex * opexFactor - part.total / 1e6,
      payback: partAnnual > 0 ? part.total / 1e6 / partAnnual : null,
      amenityGreen20: (h.amenityH + h.coolTotal) * effectiveYears,
      daly20: h.dalyYear * effectiveYears,
      dalyPer1000: h.nearby > 0 ? (h.dalyYear * effectiveYears / h.nearby) * 1000 : 0,
      shoreYear: h.floodH + e.floodMln,
      visits,
    };
  }
  const f1 = partEffects(p1, n1, e1, h1, v1);
  const f2 = partEffects(p2, n2, e2, h2, v2);

  return {
    p1,
    p2,
    share1,
    share2,
    area,
    greenHa: p1.greenHa + p2.greenHa,
    activeHa: p1.activeHa + p2.activeHa,
    trees: p1.trees + p2.trees,
    shoreM: MODEL.parts.p1.shoreM + MODEL.parts.p2.shoreM,
    capex,
    capexMln: capex / 1e6,
    greenRub,
    amenityRub,
    engRub,
    shoreRub: p1.shoreRub + p2.shoreRub,
    stormRub: p1.stormRub + p2.stormRub + p1.treatmentRub + p2.treatmentRub,
    bridgeRub: p1.bridgeRub,
    visits,
    v1,
    v2,
    peak,
    cap,
    load: peak / cap,
    popA,
    e1,
    e2,
    co2: e1.co2 + e2.co2,
    peakCut: e1.peakCut + e2.peakCut,
    moisture: e1.moisture + e2.moisture,
    ecoYear,
    floodMln: e1.floodMln + e2.floodMln,
    co2Mln: e1.co2Mln + e2.co2Mln,
    n1,
    n2,
    cityYear,
    cityNoHouse,
    vasYear,
    jobs: n1.jobs + n2.jobs,
    budget: n1.budget + n2.budget,
    housingYear: n1.housingYear + n2.housingYear,
    cityTurn: n1.cityTurn + n2.cityTurn,
    vas: n1.vas + n2.vas,
    h1,
    h2,
    f1,
    f2,
    healthYear,
    cases: h1.cases + h2.cases,
    activePeople: h1.active + h2.active,
    floodH: h1.floodH + h2.floodH,
    amenityH: h1.amenityH + h2.amenityH,
    coolTotal,
    coolHealth,
    amenityHealthYear,
    amenityGreenYear,
    amenityGreen20,
    amenityGreenPV,
    dalyYear,
    daly20,
    dalyPer1000,
    treat: h1.treat + h2.treat,
    sanitize: h1.sanitize + h2.sanitize,
    housesProtect: MODEL.parts.p1.houses + MODEL.parts.p2.houses,
    payoutHouses,
    payoutEventMin,
    payoutEventWork,
    payoutEventMax,
    payoutYearMin,
    payoutYearWork,
    payoutYearMax,
    prot: h1.prot + h2.prot,
    shoreYear: h1.floodH + h2.floodH + e1.floodMln + e2.floodMln,
    benefits,
    opexMln,
    annual,
    label,
    pv,
    pvBenefits,
    pvOpex,
    npv,
    payback,
    benefitFactor,
    opexFactor,
    effectiveYears,
    ncsMln: ((p1.greenHa + p2.greenHa) * MODEL.ncs.perHaThous * 1000 * MODEL.ncs.k) / 1e6,
    playgrounds: p1.playgrounds + p2.playgrounds,
    toilets: p1.toilets + p2.toilets,
    trucks: p1.trucks + p2.trucks,
    cafes: p1.cafes + p2.cafes,
  };
}

/* Значения из книги «Расчет_эффектов_Тюмень_20лет_CAPEX_OPEX.xlsx».
   Дашборд показывает базовый сценарий книги; денежные контуры, DALY,
   углерод и сток не суммируются между собой. */
const WORKBOOK = {
  p1: {
    areaHa: 183.0192199768513,
    shoreM: 1510.054381745122,
    greenHa: 91.50960998842565,
    activeHa: 27.452882996527695,
    trees: 18301.92199768513,
    greenRubMln: 334.55444,
    amenityRubMln: 226.0555,
    shoreRubMln: 87.34572,
    stormTreatRubMln: 52.126,
    bridgeRubMln: 173.952,
    engRubMln: 313.42372,
    capexMln: 874.03366,
    opexMln: 25.3473276,
    gva20Mln: 532.2881615481633,
    constructionGvaMln: 336.8895267071448,
    constructionJobs: 226.604763599312,
    totalLabor20: 358.0373488997984,
    permanentFte: 6.57162926502432,
    fiscal20Mln: 214.3281289024,
    visitorPopulation: 13192.333600868926,
    visitorVisitsYear: 105538.6688069514,
    visitorSpendMln: 16.622340337094847,
    visitorDirectGvaMln: 5.984042521354145,
    visitorGvaMln: 13.16489354697912,
    visitorGva20Mln: 263.2978709395824,
    yllYear: 6.145539625044968,
    yldYear: 0.01248738,
    dalyYear: 6.158027005044968,
    daly20: 110.84448609080943,
    healthSavings20Mln: 0.0023601764016,
    co2Year: 11.471461688929063,
    co220: 229.42923377858125,
    runoffYear: 7320.768799074052,
    runoff20: 146415.37598148105,
    eadAvoidedMln: 0.09675,
    payoutYearMln: 0.25659,
    protected: 5702,
    objects: 29,
  },
  p2: {
    areaHa: 235.7707017899633,
    shoreM: 3538.01535402282,
    greenHa: 117.88535089498166,
    activeHa: 35.3656052684945,
    trees: 23577.07017899633,
    greenRubMln: 430.9602,
    amenityRubMln: 287.8275,
    shoreRubMln: 204.48288,
    stormTreatRubMln: 113.504,
    bridgeRubMln: 0,
    engRubMln: 317.98688,
    capexMln: 1036.77458,
    opexMln: 30.8016436,
    gva20Mln: 637.0618726998706,
    constructionGvaMln: 399.6167579612424,
    constructionJobs: 268.797495289456,
    totalLabor20: 428.5121489893664,
    permanentFte: 7.98573268499552,
    fiscal20Mln: 256.5157165504,
    visitorPopulation: 19044.266399131073,
    visitorVisitsYear: 152354.13119304858,
    visitorSpendMln: 23.99577566290515,
    visitorDirectGvaMln: 8.638479238645855,
    visitorGvaMln: 19.004654325020883,
    visitorGva20Mln: 380.09308650041766,
    yllYear: 10.12580581853691,
    yldYear: 0.02057505,
    dalyYear: 10.14638086853691,
    daly20: 182.6348556336644,
    healthSavings20Mln: 0.003888785916,
    co2Year: 14.777871817493109,
    co220: 295.5574363498622,
    runoffYear: 9430.828071598533,
    runoff20: 188616.56143197065,
    eadAvoidedMln: 0.0008355,
    payoutYearMln: 0.422775,
    protected: 9395,
    objects: 115,
  },
};

/* Сценарные итоги книги: сумма Оброчного и мкрн ДОК.
   Листы 07, 08a_Здоровье_сценарий, 09a_CO2_сценарий,
   10a_Сток_сценарий, 11a_Подтопл_сценарий. Контуры не суммируются. */
const SCENARIOS = {
  labels: { low: "Низкий", base: "Базовый", high: "Высокий" },
  leads: {
    low: "Консервативные допущения: меньше новых активных жителей, нет чисто дополнительных деревьев, сток может ухудшиться из-за покрытий.",
    base: "Рабочий сценарий: 5% новых активных, 10% дополнительных деревьев, 8 мм дополнительного удержания стока, защита 15%.",
    high: "Верхняя граница: выше доля активных жителей, больше дополнительных посадок и удержания стока, выше вероятность паводка и доля защиты.",
  },
  health: {
    yllYear: [2.5729619842399822, 16.27134544358188, 56.7181481458547],
    yldYear: [0, 0.033062430000000004, 0.13224972000000002],
    dalyYear: [2.5729619842399822, 16.30440787358188, 56.850397865854696],
    dalyPer1000: [0.1704286933986873, 1.0799766757357012, 3.7656751583662116],
    daly20: [46.31331571631968, 293.47934172447384, 1023.3071615853845],
    save20Rub: [0, 6248.962317600001, 24995.849270400005],
    newActiveShare: [0.025, 0.05, 0.1],
    walkRr: [0.96, 0.89, 0.83],
    mentalPif: [0, 0.08, 0.16],
    heatYll: [0.03809801017497963, 1.1301569961552098, 4.060919149141963],
    pm25Daly: [0, 1.199436590069169, 9.564541437607726],
  },
  co2: {
    extraShare: [0, 0.1, 0.25],
    survival: [0.75, 0.85, 0.95],
    maturity: [0.4, 0.6, 0.8],
    kgPerTree: [9.5, 12.29, 16],
    year: [0, 26.249333506422175, 127.31213621711166],
    y20: [0, 524.9866701284435, 2546.242724342233],
  },
  runoff: {
    additionalShare: [-0.05, 0.1, 0.25],
    deltaMm: [-2.85, 8, 22.75],
    year: [-5967.756385177108, 16751.596870672583, 47637.353600975155],
    y20: [-119355.12770354217, 335031.93741345167, 952747.0720195031],
  },
  flood: {
    prob: [0.05, 0.1, 0.2],
    avoidedShare: [0.05, 0.15, 0.3],
    recipientShare: [0.1, 0.2, 0.4],
    eadAvoided: [0.00823855000000001, 0.09758549999999996, 0.8092260000000003],
    eadPv20: [0.08088729832364147, 0.8693033367902548, 13.232004999714947],
    payoutYear: [0.056613750000000004, 0.679365, 5.43492],
  },
  economy: {
    labels: ["Консервативный", "Базовый", "Полная локализация"],
    localization: [0.6, 0.8, 1],
    gvaShare: [0.45, 0.48180285, 0.48180285],
    constructionGva: [515.9182248000001, 736.5062846683873, 920.6328558354841],
    jobs: [371.551694166576, 495.402258888768, 619.25282361096],
    fiscal: [222.41807913600002, 296.557438848, 370.69679856000005],
    ncsGva: 2595.471012364455,
  },
};

function scenarioIndex(key) {
  if (key === "low") return 0;
  if (key === "high") return 2;
  return 1;
}

Object.assign(MODEL.parts.p1, {
  areaHa: WORKBOOK.p1.areaHa,
  shoreM: WORKBOOK.p1.shoreM,
  houses: WORKBOOK.p1.objects,
});
Object.assign(MODEL.parts.p2, {
  areaHa: WORKBOOK.p2.areaHa,
  shoreM: WORKBOOK.p2.shoreM,
  houses: WORKBOOK.p2.objects,
});

function workbookPart(x) {
  const amenityScale = x === WORKBOOK.p1 ? 1 : 1.287983;
  const pathRub = 147.5172e6 * amenityScale;
  const flowerRub = 38.2452e6 * amenityScale;
  const playgroundRub = (x === WORKBOOK.p1 ? 14 : 17.5) * 1e6;
  const toiletRub = 6.6e6;
  const truckRub = (x === WORKBOOK.p1 ? 2.4 : 3.6) * 1e6;
  const cafeRub = 5e6;
  return {
    greenHa: x.greenHa,
    activeHa: x.activeHa,
    trees: x.trees,
    greenRub: x.greenRubMln * 1e6,
    amenityRub: x.amenityRubMln * 1e6,
    shoreRub: x.shoreRubMln * 1e6,
    stormTreatRub: x.stormTreatRubMln * 1e6,
    bridgeRub: x.bridgeRubMln * 1e6,
    engRub: x.engRubMln * 1e6,
    total: x.capexMln * 1e6,
    pathRub,
    flowerRub,
    playgroundRub,
    toiletRub,
    truckRub,
    cafeRub,
    mafRub: x.amenityRubMln * 1e6 -
      pathRub - flowerRub - playgroundRub - toiletRub - truckRub - cafeRub,
  };
}

function computeWorkbook() {
  const x1 = WORKBOOK.p1;
  const x2 = WORKBOOK.p2;
  const p1 = workbookPart(x1);
  const p2 = workbookPart(x2);
  const n1 = {
    vas: x1.gva20Mln, jobs: x1.constructionJobs, budget: x1.fiscal20Mln,
    constructionGvaMln: x1.constructionGvaMln,
    visitorPopulation: x1.visitorPopulation, visitorVisitsYear: x1.visitorVisitsYear,
    visitorSpendMln: x1.visitorSpendMln, visitorDirectGvaMln: x1.visitorDirectGvaMln,
    visitorGvaMln: x1.visitorGvaMln, visitorGva20Mln: x1.visitorGva20Mln,
  };
  const n2 = {
    vas: x2.gva20Mln, jobs: x2.constructionJobs, budget: x2.fiscal20Mln,
    constructionGvaMln: x2.constructionGvaMln,
    visitorPopulation: x2.visitorPopulation, visitorVisitsYear: x2.visitorVisitsYear,
    visitorSpendMln: x2.visitorSpendMln, visitorDirectGvaMln: x2.visitorDirectGvaMln,
    visitorGvaMln: x2.visitorGvaMln, visitorGva20Mln: x2.visitorGva20Mln,
  };
  const e1 = { co2: x1.co2Year, peakCut: x1.runoffYear, floodMln: x1.eadAvoidedMln };
  const e2 = { co2: x2.co2Year, peakCut: x2.runoffYear, floodMln: x2.eadAvoidedMln };
  const h1 = {
    nearby: x1.protected, prot: x1.protected, houses: x1.objects,
    amenityH: x1.yllYear, coolHealth: x1.yldYear,
    floodH: x1.payoutYearMln, cases: null,
  };
  const h2 = {
    nearby: x2.protected, prot: x2.protected, houses: x2.objects,
    amenityH: x2.yllYear, coolHealth: x2.yldYear,
    floodH: x2.payoutYearMln, cases: null,
  };
  const f1 = {
    opex: x1.opexMln, visits: x1.totalLabor20,
    amenityGreen20: x1.co220, daly20: x1.daly20,
  };
  const f2 = {
    opex: x2.opexMln, visits: x2.totalLabor20,
    amenityGreen20: x2.co220, daly20: x2.daly20,
  };
  const area = x1.areaHa + x2.areaHa;
  const capexMln = x1.capexMln + x2.capexMln;
  const gva20 = x1.gva20Mln + x2.gva20Mln;
  const fiscal20 = x1.fiscal20Mln + x2.fiscal20Mln;
  const daly20 = x1.daly20 + x2.daly20;
  const co220 = x1.co220 + x2.co220;
  const runoff20 = x1.runoff20 + x2.runoff20;
  const payoutYear = x1.payoutYearMln + x2.payoutYearMln;
  return {
    p1, p2, n1, n2, e1, e2, h1, h2, f1, f2,
    area,
    share1: x1.areaHa / area,
    share2: x2.areaHa / area,
    greenHa: x1.greenHa + x2.greenHa,
    activeHa: x1.activeHa + x2.activeHa,
    trees: x1.trees + x2.trees,
    shoreM: x1.shoreM + x2.shoreM,
    capex: capexMln * 1e6,
    capexMln,
    greenRub: p1.greenRub + p2.greenRub,
    amenityRub: p1.amenityRub + p2.amenityRub,
    engRub: p1.engRub + p2.engRub,
    shoreRub: p1.shoreRub + p2.shoreRub,
    stormRub: p1.stormTreatRub + p2.stormTreatRub,
    bridgeRub: p1.bridgeRub,
    opexMln: x1.opexMln + x2.opexMln,
    vasYear: gva20,
    cityYear: gva20,
    annual: gva20,
    label: "прямая ВДС строительства и эксплуатации за 20 лет",
    npv: gva20,
    payback: null,
    jobs: x1.constructionJobs + x2.constructionJobs,
    totalLabor20: x1.totalLabor20 + x2.totalLabor20,
    permanentFte: x1.permanentFte + x2.permanentFte,
    budget: fiscal20,
    visitorPopulation: x1.visitorPopulation + x2.visitorPopulation,
    visitorVisitsYear: x1.visitorVisitsYear + x2.visitorVisitsYear,
    visitorSpendMln: x1.visitorSpendMln + x2.visitorSpendMln,
    visitorDirectGvaMln: x1.visitorDirectGvaMln + x2.visitorDirectGvaMln,
    visitorGvaMln: x1.visitorGvaMln + x2.visitorGvaMln,
    visitorGva20Mln: x1.visitorGva20Mln + x2.visitorGva20Mln,
    visits: 0,
    co2: x1.co2Year + x2.co2Year,
    co220,
    peakCut: x1.runoffYear + x2.runoffYear,
    runoff20,
    ecoYear: x1.co2Year + x2.co2Year,
    floodMln: x1.eadAvoidedMln + x2.eadAvoidedMln,
    shoreYear: x1.eadAvoidedMln + x2.eadAvoidedMln,
    amenityH: x1.yllYear + x2.yllYear,
    coolHealth: x1.yldYear + x2.yldYear,
    dalyYear: x1.dalyYear + x2.dalyYear,
    daly20,
    dalyPer1000: daly20 / (x1.protected + x2.protected) * 1000,
    healthYear: x1.healthSavings20Mln + x2.healthSavings20Mln,
    amenityGreen20: co220,
    prot: x1.protected + x2.protected,
    housesProtect: x1.objects + x2.objects,
    cases: null,
    floodH: payoutYear,
    payoutYearWork: payoutYear,
    payoutEventMin: 0.05661375,
    payoutEventWork: 0.679365,
    payoutEventMax: 5.43492,
    treat: x1.eadAvoidedMln + x2.eadAvoidedMln,
    sanitize: payoutYear,
    coolTotal: x1.yldYear + x2.yldYear,
    moisture: x1.runoffYear + x2.runoffYear,
    activePeople: 754.85,
    co2Mln: 0,
    ncsMln: 5588.453959724,
  };
}

compute = computeWorkbook;

function fmt(n, d = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const x = Number(n);
  const s = x.toLocaleString("ru-RU", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return s;
}

function fmtInt(n) {
  return Math.round(n).toLocaleString("ru-RU");
}

window.MODEL = MODEL;
window.STATE = STATE;
window.SCENARIOS = SCENARIOS;
window.scenarioIndex = scenarioIndex;
window.compute = compute;
window.fmt = fmt;
window.fmtInt = fmtInt;
