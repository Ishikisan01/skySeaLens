const API_BASE_URL = window.SKYSEALENS_API_BASE_URL || "";
const REFRESH_MS = 10_000;

const statusEl = document.getElementById("status");
const lastUpdateEl = document.getElementById("lastUpdate");
const errorEl = document.getElementById("error");

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  center: [45, 26],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

function bboxFromMap() {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

async function loadVessels() {
  try {
    errorEl.textContent = "";
    const bbox = bboxFromMap().join(",");
    const zoom = map.getZoom().toFixed(0);
    const resp = await fetch(`${API_BASE_URL}/api/v1/vessels?bbox=${bbox}&zoom=${zoom}`);
    if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
    const payload = await resp.json();
    statusEl.textContent = `${payload.count} vessels in view`;
    lastUpdateEl.textContent = `Last update: ${new Date().toLocaleTimeString()} (${payload.cache || "n/a"})`;
    renderVessels(payload.vessels || []);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function toFeature(v) {
  return {
    type: "Feature",
    properties: {
      mmsi: v.mmsi,
      name: v.name || "Unknown",
      sog: v.sog ?? "-",
      cog: v.cog ?? "-",
      heading: v.heading ?? "-",
      source: v.source,
      timestamp: v.timestamp
    },
    geometry: {
      type: "Point",
      coordinates: [v.lon, v.lat]
    }
  };
}

function renderVessels(vessels) {
  const sourceId = "vessels";
  const data = {
    type: "FeatureCollection",
    features: vessels.map(toFeature)
  };

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterRadius: 42,
      clusterMaxZoom: 9
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#0477bf",
        "circle-radius": ["step", ["get", "point_count"], 14, 100, 18, 500, 22]
      }
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12
      }
    });

    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#ea580c",
        "circle-radius": 4
      }
    });

    map.on("click", "unclustered-point", async (e) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const detail = await fetch(`${API_BASE_URL}/api/v1/vessels/${p.mmsi}`).then((r) => (r.ok ? r.json() : p));
      new maplibregl.Popup()
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(
          `<strong>${detail.name || "Unknown"}</strong><br/>MMSI: ${detail.mmsi}<br/>Speed: ${
            detail.sog ?? "-"
          } kn<br/>Heading: ${detail.heading ?? "-"}<br/>Last seen: ${new Date(detail.timestamp).toLocaleString()}`
        )
        .addTo(map);
    });
  } else {
    map.getSource(sourceId).setData(data);
  }
}

map.on("load", () => {
  loadVessels();
  setInterval(loadVessels, REFRESH_MS);
});

map.on("moveend", loadVessels);
