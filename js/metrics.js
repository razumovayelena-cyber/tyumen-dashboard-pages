/* Яндекс Метрика: цели дашборда и диагностика загрузки ресурсов. */
(function setupYandexMetrikaGoals() {
  const COUNTER_ID = 112546302;

  function reachGoal(goal, params) {
    if (typeof window.ym !== "function") return;
    window.ym(COUNTER_ID, "reachGoal", goal, params || undefined);
  }

  function sectionFromHash() {
    const id = (window.location.hash || "#obzor").slice(1).split("-")[0];
    return id || "obzor";
  }

  function trackSection() {
    reachGoal("section_view", { section: sectionFromHash() });
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    const button = event.target.closest("button");

    if (link && link.hash) {
      reachGoal("section_navigation", { section: link.hash.slice(1) });
    }

    if (button && button.id === "report-print") {
      reachGoal("report_export", { format: "docx" });
    }

    if (button && button.id === "report-pptx") {
      reachGoal("report_export", { format: "pptx" });
    }

    if (button && button.matches(".map-tools button")) {
      reachGoal("territory_select", { territory: button.dataset.focus || "all" });
    }

    if (button && button.matches("#scenarii .chip")) {
      reachGoal("scenario_select", { scenario: button.dataset.sc || "" });
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("#scenarii input[type='range']")) {
      reachGoal("dashboard_filter", { filter: event.target.id });
    }
  });

  window.addEventListener("hashchange", trackSection);
  trackSection();

  window.addEventListener("error", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLScriptElement ||
      target instanceof HTMLLinkElement ||
      target instanceof HTMLImageElement
    ) {
      reachGoal("resource_error", { resource: target.src || target.href || "" });
    }
  }, true);
})();
