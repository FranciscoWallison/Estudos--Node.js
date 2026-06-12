/*
 * Mapa de calor — Chamadas da Polícia (Fortaleza)
 *
 * Fonte dos dados (policecalls.csv):
 *   Portal:   Dados Abertos da Prefeitura de Fortaleza (dados.fortaleza.ce.gov.br)
 *   Dataset:  "Chamadas da Polícia" — https://dados.fortaleza.ce.gov.br/dataset/chamadas_policia
 *   Órgão:    CITINOVA (Fundação de Ciência, Tecnologia e Inovação de Fortaleza)
 *   Download: https://dados.fortaleza.ce.gov.br/dataset/5fd98aaa-1e16-425a-9e42-2c580d5d156c/resource/e65d44e1-8cc4-4dd4-addc-eee741845c94/download/policecalls.csv
 *   Colunas:  date, type, lat, lng  (categorias: PROPERTY CRIMES, DISTURBING THE PEACE)
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

// Bounding box aproximado da região de Fortaleza. O CSV contém algumas
// coordenadas claramente inválidas (ex.: lat -85, lng +2) que precisam ser
// descartadas para não poluir o mapa de calor.
const FORTALEZA_BOUNDS = { latMin: -4.05, latMax: -3.6, lngMin: -38.75, lngMax: -38.35 };

// Carrega o CSV uma única vez, na inicialização, para um cache em memória.
// Formato compacto para reduzir o payload da API:
//   types  -> ["PROPERTY CRIMES", "DISTURBING THE PEACE"]
//   points -> [[lat, lng, typeIndex], ...]
function loadPoliceCalls(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const types = [];
  const typeIndex = new Map();
  const points = [];
  let dropped = 0;

  for (const row of rows) {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const inBounds =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= FORTALEZA_BOUNDS.latMin && lat <= FORTALEZA_BOUNDS.latMax &&
      lng >= FORTALEZA_BOUNDS.lngMin && lng <= FORTALEZA_BOUNDS.lngMax;

    if (!inBounds) {
      dropped++;
      continue;
    }

    const type = row.type || "UNKNOWN";
    let idx = typeIndex.get(type);
    if (idx === undefined) {
      idx = types.length;
      types.push(type);
      typeIndex.set(type, idx);
    }
    points.push([lat, lng, idx]);
  }

  return { types, points, dropped };
}

const CSV_PATH = path.join(__dirname, "policecalls.csv");
const data = loadPoliceCalls(CSV_PATH);
console.log(
  `Chamadas da Polícia: ${data.points.length} pontos carregados, ${data.dropped} outliers descartados.`
);
console.log(`Tipos: ${data.types.join(", ")}`);

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Dataset em formato compacto { types, points }. O filtro por tipo é feito
// no front-end a partir do typeIndex (sem necessidade de novo request).
app.get("/api/policecalls", (req, res) => {
  res.json({ types: data.types, points: data.points });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ouvindo em http://localhost:${PORT}`));
