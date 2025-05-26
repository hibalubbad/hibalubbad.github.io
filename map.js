// -----------------------
// Base + Satellite Layers
// -----------------------
const baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
});

const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Imagery &copy; Esri'
});

const map = L.map('map', {
  center: [32.0, 35.3],
  zoom: 9,
  layers: [baseMap]
});

// -----------------------
// Dynamic Region Extraction + Filter UI
// -----------------------
function extractRegions(features) {
  const regionSet = new Set();

  features.forEach(f => {
    if (f.properties?.name) {
      const match = f.properties.name.match(/Region:\s*([A-Za-z\s]+?)\s*(?:\\n|Coordinates:|$)/);
      if (match) {
        regionSet.add(match[1].trim());
      }
    }
  });

  return Array.from(regionSet).sort();
}


function populateRegionFilter(regionList) {
  const form = document.getElementById('region-form');
  if (!form) return;

  form.innerHTML = '';
  form.innerHTML += `<label><input type="radio" name="region" value="all" checked> All</label><br>`;

  regionList.forEach(region => {
    const label = `<label><input type="radio" name="region" value="${region}"> ${region}</label><br>`;
    form.innerHTML += label;
  });
}

// -----------------------
// Quarry Layer & Region Filter Logic
// -----------------------
let currentLayer;

function showQuarriesByRegion(region) {
  if (currentLayer) {
    map.removeLayer(currentLayer);
  }

  const filteredFeatures = region === "all"
    ? quarriesData.features
    : quarriesData.features.filter(f => {
        const match = f.properties?.name?.match(/Region:\s*([^\n]+)/);
        return match && match[1].trim() === region;
      });

  currentLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
    onEachFeature: function (feature, layer) {
      if (feature.properties?.description) {
        layer.bindPopup(feature.properties.description.value);
      }
    },
pointToLayer: function (feature, latlng) {
  const color = feature.properties["icon-color"] || "#a52714";

  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: color,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: feature.properties["icon-opacity"] || 0.8
  });
}

  }).addTo(map);
}

// Generate and show initial layer
const regionList = extractRegions(quarriesData.features);
populateRegionFilter(regionList);
showQuarriesByRegion("all");

// Event listener for region selection
const regionForm = document.getElementById('region-form');
if (regionForm) {
  regionForm.addEventListener('change', (e) => {
    showQuarriesByRegion(e.target.value);
  });
}

// -----------------------
// Layer Toggle Logic
// -----------------------
const baseLayers = {
  "Base Map": baseMap,
  "Satellite": satelliteMap
};

const overlays = {
  "Quarries": currentLayer
};

const layerControl = L.control.layers(baseLayers, overlays, { collapsed: false });
layerControl.addTo(map);

map.whenReady(() => {
  const leafletLayerBox = document.querySelector('.leaflet-control-layers');
  const wrapper = document.getElementById('layer-box-wrapper');

  if (leafletLayerBox && wrapper) {
    wrapper.appendChild(leafletLayerBox);
    wrapper.style.position = 'absolute';
    wrapper.style.top = '160px';
    wrapper.style.left = '10px';
    wrapper.style.zIndex = '1001';
    wrapper.style.display = 'none';
  }
});

const toggleButton = document.getElementById('custom-layer-toggle');
if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    const wrapper = document.getElementById('layer-box-wrapper');
    wrapper.style.display = wrapper.style.display === 'block' ? 'none' : 'block';
  });
}
