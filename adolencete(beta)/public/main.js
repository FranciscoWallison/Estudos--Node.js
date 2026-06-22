// Front-end do dashboard de dados do IBGE sobre adolescentes e jovens.
// Consome /api/catalog e /api/tables/:id e renderiza tabelas + gráficos.

const CATEGORY_LABELS = {
  Caracteristicas_Gerais: "Características Gerais",
  Educacao: "Educação",
  Saude: "Saúde",
  Trabalho: "Trabalho",
  PeNSE: "PeNSE",
};

let catalog = [];
let current = null; // tabela selecionada (dados completos)
let chart = null;

const menuEl = document.getElementById("menu");
const searchEl = document.getElementById("search");
const welcomeEl = document.getElementById("welcome");
const contentEl = document.getElementById("content");
const titleEl = document.getElementById("table-title");
const metaEl = document.getElementById("table-meta");
const tablesEl = document.getElementById("tables");
const chartRowEl = document.getElementById("chart-row");
const chartTypeEl = document.getElementById("chart-type");
const chartEmptyEl = document.getElementById("chart-empty");
const chartCanvas = document.getElementById("chart");

function isNum(v) {
  return typeof v === "number" && isFinite(v);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function labelOf(category) {
  return CATEGORY_LABELS[category] || category;
}

async function loadCatalog() {
  try {
    catalog = await (await fetch("/api/catalog")).json();
    renderMenu();
  } catch (err) {
    menuEl.innerHTML = `<div class="text-danger p-3 small">Erro ao carregar catálogo: ${escapeHtml(err.message)}</div>`;
  }
}

function renderMenu(filter = "") {
  const f = filter.trim().toLowerCase();
  const groups = {};
  for (const t of catalog) {
    if (f && !`${t.title} ${t.fileName}`.toLowerCase().includes(f)) continue;
    (groups[t.category] = groups[t.category] || []).push(t);
  }

  const cats = Object.keys(groups).sort();
  menuEl.innerHTML = "";
  if (!cats.length) {
    menuEl.innerHTML = `<div class="text-muted p-3 small">Nenhuma tabela encontrada.</div>`;
    return;
  }

  cats.forEach((cat, idx) => {
    const items = groups[cat]
      .map(
        (t) =>
          `<button class="list-group-item list-group-item-action text-start small" data-id="${t.id}">${escapeHtml(
            t.title
          )}</button>`
      )
      .join("");
    const collapseId = "acc-" + idx;
    const open = idx === 0 || f;
    menuEl.insertAdjacentHTML(
      "beforeend",
      `<div class="accordion-item">
         <h2 class="accordion-header">
           <button class="accordion-button ${open ? "" : "collapsed"}" type="button"
                   data-bs-toggle="collapse" data-bs-target="#${collapseId}">
             ${escapeHtml(labelOf(cat))}
             <span class="badge bg-secondary ms-2">${groups[cat].length}</span>
           </button>
         </h2>
         <div id="${collapseId}" class="accordion-collapse collapse ${open ? "show" : ""}">
           <div class="list-group list-group-flush">${items}</div>
         </div>
       </div>`
    );
  });

  menuEl.querySelectorAll("button[data-id]").forEach((btn) =>
    btn.addEventListener("click", () => {
      menuEl
        .querySelectorAll("button[data-id]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectTable(btn.dataset.id);
    })
  );
}

async function selectTable(id) {
  try {
    current = await (await fetch("/api/tables/" + id)).json();
  } catch (err) {
    alert("Erro ao carregar a tabela: " + err.message);
    return;
  }
  welcomeEl.classList.add("d-none");
  contentEl.classList.remove("d-none");
  titleEl.textContent = current.title;
  metaEl.textContent = `${labelOf(current.category)} · ${current.fileName} · ${current.sheets.length} planilha(s)`;
  renderTables();
  setupChart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTables() {
  tablesEl.innerHTML = "";
  current.sheets.forEach((sheet) => {
    const body = sheet.grid
      .map((row) => {
        const cells = row
          .map((c) => {
            const txt = c === "" || c == null ? "" : escapeHtml(c);
            return isNum(c) ? `<td class="text-end">${txt}</td>` : `<td>${txt}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const heading =
      current.sheets.length > 1
        ? `<h6 class="mt-3 text-muted">Planilha: ${escapeHtml(sheet.name)}</h6>`
        : "";
    tablesEl.insertAdjacentHTML(
      "beforeend",
      `${heading}
       <div class="table-responsive mb-4">
         <table class="table table-sm table-bordered table-hover align-middle data-table">
           <tbody>${body}</tbody>
         </table>
       </div>`
    );
  });
}

// --- Gráfico ----------------------------------------------------------------

// Linhas "plotáveis": rótulo de texto na 1ª coluna + ao menos 2 números depois.
function findDataRows(grid) {
  const out = [];
  grid.forEach((row, i) => {
    const label = row[0];
    const nums = row.slice(1).filter(isNum);
    if (typeof label === "string" && label.trim() && nums.length >= 2) out.push(i);
  });
  return out;
}

// Cabeçalho das colunas: a linha (antes dos dados) com mais células de texto.
function findHeaderRow(grid, firstDataRow) {
  let best = -1;
  let bestCount = 0;
  for (let i = 0; i < firstDataRow; i++) {
    const count = grid[i]
      .slice(1)
      .filter((v) => typeof v === "string" && v.trim()).length;
    if (count > bestCount) {
      bestCount = count;
      best = i;
    }
  }
  return best;
}

function setupChart() {
  const grid = current.sheets[0].grid;
  const dataRows = findDataRows(grid);

  chartRowEl.innerHTML = "";
  if (!dataRows.length) {
    chartEmptyEl.classList.remove("d-none");
    chartCanvas.classList.add("d-none");
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  chartEmptyEl.classList.add("d-none");
  chartCanvas.classList.remove("d-none");
  dataRows.forEach((i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(grid[i][0]);
    chartRowEl.appendChild(opt);
  });
  drawChart();
}

function drawChart() {
  const grid = current.sheets[0].grid;
  const dataRows = findDataRows(grid);
  if (!dataRows.length) return;

  const rowIdx = Number(chartRowEl.value);
  const headerRow = findHeaderRow(grid, dataRows[0]);
  const dataRow = grid[rowIdx];

  const labels = [];
  const values = [];
  for (let c = 1; c < dataRow.length; c++) {
    if (!isNum(dataRow[c])) continue;
    const h = headerRow >= 0 ? grid[headerRow][c] : "";
    labels.push(h !== "" && h != null ? String(h) : "Coluna " + c);
    values.push(dataRow[c]);
  }

  if (chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: chartTypeEl.value,
    data: {
      labels,
      datasets: [
        {
          label: String(grid[rowIdx][0]),
          data: values,
          backgroundColor: "rgba(13, 110, 253, 0.6)",
          borderColor: "rgba(13, 110, 253, 1)",
          borderWidth: 1,
          fill: chartTypeEl.value === "line" ? false : true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

chartRowEl.addEventListener("change", drawChart);
chartTypeEl.addEventListener("change", drawChart);
searchEl.addEventListener("input", () => renderMenu(searchEl.value));

loadCatalog();
