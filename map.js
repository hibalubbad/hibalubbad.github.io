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

// -----------------------
// Layer Toggle Logic
// -----------------------
const baseLayers = {
  "Base Map": baseMap,
  "Satellite": satelliteMap
};

// create an empty group that will hold the markers
const quarryGroup = L.layerGroup().addTo(map);

// put that group in the layer-control overlay list
const overlays = { 'Quarries': quarryGroup };
L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map);


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

const quarryIcon = L.icon({
  iconUrl: 'quarry-icon.png',   // make sure the PNG is in the same folder
  iconSize:  [16, 16],
  iconAnchor:[8, 8],
  popupAnchor:[0, -8],
  // optional for retina displays:
  // iconRetinaUrl: 'quarry-icon@2x.png'
});



// 2.  Update the main filter layer to use that icon
function showQuarriesByRegion (region) {
  quarryGroup.clearLayers();                       // wipe previous markers

  const filtered = (region === 'all')
    ? quarriesData.features
    : quarriesData.features.filter(f => {
        const m = f.properties?.name?.match(/Region:\s*([^\n]+)/);
        return m && m[1].trim() === region;
      });

  L.geoJSON(
    { type: 'FeatureCollection', features: filtered },
    {
      /* ── draw BOTH the circle and the icon ─────────────────────── */
      pointToLayer: (feature, latlng) => {
        const colour = feature.properties['icon-color'] || '#a52714';

        // background circle (keeps your red / orange coding)
        const circle = L.circleMarker(latlng, {
          radius      : 12,
          fillColor   : colour,
          color       : '#000',   // thin outline
          weight      : 1,
          opacity     : 1,
          fillOpacity : feature.properties['icon-opacity'] ?? 0.8
        });

        // foreground pick-axe icon (no interaction needed)
        const icon   = L.marker(latlng, {
          icon        : quarryIcon,   // white PNG you generated
          interactive : false,        // so only the circle gets clicks
          zIndexOffset: 1000          // sit on top of the circle
        });

        // return them as one logical unit
        return L.layerGroup([circle, icon]);
      },

      /* ── optional popup on the *circle* ────────────────────────── */
      onEachFeature: (feature, layerGroup) => {
        if (feature.properties?.description) {
          // first child == the circleMarker (because we added it first)
          layerGroup.getLayers()[0].bindPopup(feature.properties.description.value);
        }
      }
    }
  ).addTo(quarryGroup);
}


// Generate and show initial layer
const regionList = extractRegions(quarriesData.features);
populateRegionFilter(regionList);
showQuarriesByRegion("all");

// ─── Wire up region filter radio buttons ─────────────────────
const regionForm = document.getElementById('region-form');
if (regionForm) {
  regionForm.addEventListener('change', e => {
    showQuarriesByRegion(e.target.value);
  });
}