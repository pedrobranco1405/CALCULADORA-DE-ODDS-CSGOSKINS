(function () {
  "use strict";

  const PANEL_ID = "csgoskins-odds-panel";
  const TOGGLE_ID = "csgoskins-odds-toggle";
  const SHOW_CHANCES_CLASS = "ContainerGroupedItem--show-chances";
  const EPSILON = 0.000001;
  let lastRenderSignature = "";

  function parseMoney(value) {
    if (!value) return null;

    const match = String(value).match(/(?:R\$\s*)?(?:US\$\s*)?(?:\$|\u20ac|\u00a3)?\s*(\d+(?:[.,]\d+)?)/);
    if (!match) return null;

    return Number(match[1].replace(",", "."));
  }

  function parsePercent(value) {
    if (!value) return null;

    const match = String(value).match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (!match) return null;

    return Number(match[1].replace(",", "."));
  }

  function formatMoney(value, currencySymbol) {
    if (!Number.isFinite(value)) return "-";
    return `${currencySymbol}${value.toFixed(2)}`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    return `${value.toFixed(3).replace(/\.?0+$/, "")}%`;
  }

  function detectCurrencySymbol(text) {
    if (text.includes("R$")) return "R$";
    if (text.includes("\u20ac")) return "\u20ac";
    if (text.includes("\u00a3")) return "\u00a3";
    return "$";
  }

  function findCasePrice(lines) {
    const openLine = lines.find((line) => /open for/i.test(line));
    if (openLine) {
      const openPrice = parseMoney(openLine);
      if (openPrice !== null) return openPrice;
    }

    const titleIndex = lines.findIndex((line) => /case$/i.test(line));
    if (titleIndex >= 0) {
      for (let index = titleIndex + 1; index < Math.min(lines.length, titleIndex + 8); index += 1) {
        const price = parseMoney(lines[index]);
        if (price !== null) return price;
      }
    }

    return null;
  }

  function revealOddsDetails() {
    const cards = document.querySelectorAll(".ContainerGroupedItem.item_item");
    let changed = 0;

    for (const card of cards) {
      if (card.classList.contains(SHOW_CHANCES_CLASS)) continue;

      card.classList.add(SHOW_CHANCES_CLASS);
      changed += 1;
    }

    return changed;
  }

  function extractItemsFromText() {
    const text = document.body.innerText || "";
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const currencySymbol = detectCurrencySymbol(text);
    const casePrice = findCasePrice(lines);
    const items = [];
    let currentName = "";

    for (const line of lines) {
      if (line.includes(" | ") && !line.includes("Price Range Odds")) {
        currentName = line.replace(/^#+\s*/, "").trim();
        continue;
      }

      const row = line.match(/^([A-Z]{2}|ST\s+[A-Z]{2})\s+((?:R\$\s*)?(?:US\$\s*)?(?:\$|\u20ac|\u00a3)?\s*\d+(?:[.,]\d+)?)\s+\d+\s*-\s*\d+\s+(\d+(?:[.,]\d+)?)%$/i);
      if (!row || !currentName) continue;

      const price = parseMoney(row[2]);
      const odds = Number(row[3].replace(",", "."));
      if (price === null || !Number.isFinite(odds)) continue;

      items.push({
        name: currentName,
        wear: row[1].toUpperCase(),
        price,
        odds
      });
    }

    return { casePrice, currencySymbol, items };
  }

  function calculateStats(casePrice, items) {
    const stats = {
      totalOdds: 0,
      profitOdds: 0,
      breakEvenOdds: 0,
      lossOdds: 0,
      expectedValue: 0
    };

    for (const item of items) {
      stats.totalOdds += item.odds;
      stats.expectedValue += item.price * (item.odds / 100);

      if (item.price > casePrice + EPSILON) {
        stats.profitOdds += item.odds;
      } else if (Math.abs(item.price - casePrice) <= EPSILON) {
        stats.breakEvenOdds += item.odds;
      } else {
        stats.lossOdds += item.odds;
      }
    }

    stats.expectedProfit = stats.expectedValue - casePrice;
    stats.returnRate = casePrice > 0 ? (stats.expectedValue / casePrice) * 100 : 0;

    return stats;
  }

  function getDataSignature(data) {
    return JSON.stringify({
      casePrice: data.casePrice,
      currencySymbol: data.currencySymbol,
      items: data.items.map((item) => [
        item.name,
        item.wear,
        item.price,
        item.odds
      ])
    });
  }

  function createPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="csgoskins-odds-header">
        <strong>Odds da caixa</strong>
        <button type="button" aria-label="Fechar painel">x</button>
      </div>
      <div class="csgoskins-odds-content">Calculando...</div>
    `;

    panel.querySelector("button").addEventListener("click", () => {
      panel.classList.add("is-hidden");
      getToggle().hidden = false;
    });

    document.documentElement.appendChild(panel);
    return panel;
  }

  function getToggle() {
    let toggle = document.getElementById(TOGGLE_ID);
    if (toggle) return toggle;

    toggle = document.createElement("button");
    toggle.id = TOGGLE_ID;
    toggle.type = "button";
    toggle.textContent = "Odds";
    toggle.hidden = true;
    toggle.addEventListener("click", () => {
      createPanel().classList.remove("is-hidden");
      toggle.hidden = true;
    });

    document.documentElement.appendChild(toggle);
    return toggle;
  }

  function renderPanel(data) {
    const panel = createPanel();
    const content = panel.querySelector(".csgoskins-odds-content");
    const signature = getDataSignature(data);

    if (signature === lastRenderSignature) return;

    if (data.casePrice === null || data.items.length === 0) {
      lastRenderSignature = signature;
      content.innerHTML = `
        <p class="csgoskins-odds-warning">
          Nao consegui ler preco e odds desta caixa. Abra uma pagina de caixa com a lista "Case contents" visivel.
        </p>
      `;
      return;
    }

    const stats = calculateStats(data.casePrice, data.items);
    const sortedItems = [...data.items].sort((a, b) => b.price - a.price);
    const tableWrap = content.querySelector(".csgoskins-odds-table-wrap");
    const previousTableScroll = tableWrap ? tableWrap.scrollTop : 0;

    lastRenderSignature = signature;
    content.innerHTML = `
      <div class="csgoskins-odds-grid">
        <div><span>Preco</span><strong>${formatMoney(data.casePrice, data.currencySymbol)}</strong></div>
        <div><span>Valor esperado</span><strong>${formatMoney(stats.expectedValue, data.currencySymbol)}</strong></div>
        <div><span>EV</span><strong class="${stats.expectedProfit >= 0 ? "is-good" : "is-bad"}">${formatMoney(stats.expectedProfit, data.currencySymbol)}</strong></div>
        <div><span>Retorno</span><strong>${formatPercent(stats.returnRate)}</strong></div>
      </div>
      <div class="csgoskins-odds-bars" aria-label="Resumo de probabilidades">
        <div><span>Lucro</span><strong class="is-good">${formatPercent(stats.profitOdds)}</strong></div>
        <div><span>Empate</span><strong>${formatPercent(stats.breakEvenOdds)}</strong></div>
        <div><span>Perda</span><strong class="is-bad">${formatPercent(stats.lossOdds)}</strong></div>
      </div>
      <p class="csgoskins-odds-note">Odds somadas: ${formatPercent(stats.totalOdds)}. Lucro = skin acima do preco da caixa.</p>
      <div class="csgoskins-odds-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Skin</th>
              <th>Preco</th>
              <th>Odds</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map((item) => {
              const result = item.price > data.casePrice + EPSILON
                ? "Lucro"
                : Math.abs(item.price - data.casePrice) <= EPSILON
                  ? "Empate"
                  : "Perda";
              const resultClass = result === "Lucro" ? "is-good" : result === "Perda" ? "is-bad" : "";

              return `
                <tr>
                  <td>${escapeHtml(item.name)} <small>${escapeHtml(item.wear)}</small></td>
                  <td>${formatMoney(item.price, data.currencySymbol)}</td>
                  <td>${formatPercent(item.odds)}</td>
                  <td class="${resultClass}">${result}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    const nextTableWrap = content.querySelector(".csgoskins-odds-table-wrap");
    if (nextTableWrap) {
      nextTableWrap.scrollTop = previousTableScroll;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let renderTimer = null;
  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      const changed = revealOddsDetails();

      window.setTimeout(() => {
        renderPanel(extractItemsFromText());
      }, changed > 0 ? 100 : 0);
 4   }, 250);
  }

  scheduleRender();

  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
