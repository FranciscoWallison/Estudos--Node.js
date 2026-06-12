// Front-end do mapa de calor das Chamadas da Polícia (Fortaleza).
// Busca os dados em /api/policecalls e renderiza com Leaflet + Leaflet.heat.

const FORTALEZA = [-3.7319, -38.5267];
const HEAT_OPTIONS = { radius: 18, blur: 22, maxZoom: 17, minOpacity: 0.3 };

const map = L.map("map", { center: FORTALEZA, zoom: 12 });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let allPoints = []; // [[lat, lng, typeIndex], ...]
let types = [];
let heat = null;
let visible = true;
let currentType = -1; // -1 = todos os tipos

const statusEl = document.getElementById("status");
const filterEl = document.getElementById("filter-type");
const toggleEl = document.getElementById("toggle-heatmap");

function render() {
  const filtered =
    currentType === -1
      ? allPoints
      : allPoints.filter((p) => p[2] === currentType);

  // Leaflet.heat espera [lat, lng, intensity].
  const heatData = filtered.map((p) => [p[0], p[1], 1]);

  if (heat) {
    map.removeLayer(heat);
  }
  heat = L.heatLayer(heatData, HEAT_OPTIONS);
  if (visible) {
    heat.addTo(map);
  }

  const label = currentType === -1 ? "todos os tipos" : types[currentType];
  statusEl.textContent = `${filtered.length.toLocaleString("pt-BR")} pontos · ${label}`;
}

async function init() {
  try {
    const res = await fetch("/api/policecalls");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    allPoints = data.points;
    types = data.types;

    // Enquadra o mapa nos limites reais dos dados (em vez de um zoom fixo).
    // Calculado em laço — spread de ~135 mil itens estouraria a pilha.
    if (allPoints.length) {
      let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity;
      for (const [lat, lng] of allPoints) {
        if (lat < latMin) latMin = lat;
        if (lat > latMax) latMax = lat;
        if (lng < lngMin) lngMin = lng;
        if (lng > lngMax) lngMax = lng;
      }
      map.fitBounds(
        [
          [latMin, lngMin],
          [latMax, lngMax],
        ],
        { padding: [20, 20] }
      );
    }

    types.forEach((t, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = t;
      filterEl.appendChild(opt);
    });

    render();
  } catch (err) {
    statusEl.textContent = "Erro ao carregar dados: " + err.message;
    console.error(err);
  }
}

filterEl.addEventListener("change", () => {
  currentType = Number(filterEl.value);
  render();
});

toggleEl.addEventListener("click", () => {
  visible = !visible;
  if (heat) {
    if (visible) {
      heat.addTo(map);
    } else {
      map.removeLayer(heat);
    }
  }
  toggleEl.textContent = visible ? "Ocultar heatmap" : "Mostrar heatmap";
});

init();
