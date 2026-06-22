/*
 * Dados de Adolescentes e Jovens no Brasil — dashboard
 *
 * Fonte dos dados: tabelas estatísticas do IBGE (inclui a PeNSE — Pesquisa
 * Nacional de Saúde do Escolar). Os arquivos .xls estão organizados por tema
 * nas pastas: Caracteristicas_Gerais/, Educacao/, Saude/, Trabalho/, PeNSE/.
 *
 * O servidor lê todas as planilhas uma vez na inicialização, converte cada
 * uma em matriz 2D e expõe via API:
 *   GET /api/catalog        -> lista de tabelas (id, categoria, título)
 *   GET /api/tables/:id     -> dados completos de uma tabela (planilhas + grid)
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const excelToJson = require("convert-excel-to-json");

const ROOT = __dirname;
const IGNORED_DIRS = new Set(["node_modules", "public", "docs", ".git"]);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "A" -> 0, "B" -> 1, ... "AA" -> 26
function colToIndex(letter) {
  let idx = 0;
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// convert-excel-to-json devolve cada linha como { A: .., B: .. }.
// Aqui transformamos numa matriz 2D (array de arrays) preservando as colunas.
function sheetToGrid(rowsObj) {
  let maxCol = 0;
  for (const row of rowsObj) {
    for (const key of Object.keys(row)) {
      const idx = colToIndex(key);
      if (idx > maxCol) maxCol = idx;
    }
  }
  return rowsObj.map((row) => {
    const arr = new Array(maxCol + 1).fill("");
    for (const [key, value] of Object.entries(row)) {
      arr[colToIndex(key)] = value;
    }
    return arr;
  });
}

function extractTitle(grid) {
  for (const row of grid) {
    const cell = row[0];
    if (typeof cell === "string" && cell.trim()) return cell.trim();
  }
  return "(sem título)";
}

function parseTable(entry) {
  const raw = excelToJson({ sourceFile: entry.filePath });
  const sheets = Object.entries(raw).map(([name, rowsObj]) => ({
    name,
    grid: sheetToGrid(rowsObj),
  }));
  const title = extractTitle(sheets.length ? sheets[0].grid : []);
  return {
    id: entry.id,
    category: entry.category,
    fileName: entry.fileName,
    title,
    sheets,
  };
}

// Varre as subpastas de temas e lista todos os .xls encontrados.
function buildCatalog() {
  const tables = [];
  for (const dirent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory() || IGNORED_DIRS.has(dirent.name) || dirent.name.startsWith(".")) {
      continue;
    }
    const dirPath = path.join(ROOT, dirent.name);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.toLowerCase().endsWith(".xls"))
      .sort();
    for (const file of files) {
      const id = slugify(`${dirent.name}-${file.replace(/\.xls$/i, "")}`);
      tables.push({ id, category: dirent.name, fileName: file, filePath: path.join(dirPath, file) });
    }
  }
  return tables;
}

// Carrega e processa todas as planilhas uma vez, na inicialização.
const catalog = buildCatalog();
const tablesById = new Map();
let failed = 0;
for (const entry of catalog) {
  try {
    tablesById.set(entry.id, parseTable(entry));
  } catch (err) {
    failed++;
    console.error(`Falha ao ler ${entry.fileName}: ${err.message}`);
  }
}
console.log(`${tablesById.size} tabelas carregadas (${failed} com falha).`);

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Catálogo leve (sem os dados das células) para montar o menu.
app.get("/api/catalog", (req, res) => {
  const list = [...tablesById.values()].map((t) => ({
    id: t.id,
    category: t.category,
    fileName: t.fileName,
    title: t.title,
  }));
  res.json(list);
});

// Dados completos de uma tabela (todas as planilhas, em matriz 2D).
app.get("/api/tables/:id", (req, res) => {
  const table = tablesById.get(req.params.id);
  if (!table) return res.status(404).json({ error: "Tabela não encontrada" });
  res.json(table);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ouvindo em http://localhost:${PORT}`));
