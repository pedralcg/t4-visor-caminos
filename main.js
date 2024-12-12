// Main.js: Código optimizado y documentado para el visor web basado en OpenLayers.

import './style.css';
import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls, OverviewMap, Control, ScaleLine } from 'ol/control';
import { fromLonLat, transformExtent } from 'ol/proj';
import { Group as LayerGroup } from 'ol/layer';
import LayerSwitcher from 'ol-layerswitcher';
import { Style, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';

// Paleta de colores para los diferentes caminos.
const colores = {
  "Camino Francés": '#086EC6',
  "Caminos Andaluces": '#0A1464',
  "Caminos Catalanes": '#C2A54B',
  "Caminos de Galicia": '#5518AE',
  "Caminos del Centro": '#C780D7',
  "Caminos del Este": '#4C57FC',
  "Caminos del Norte": '#C45AD0',
  "Caminos del Sureste": '#5A70C5',
  "Caminos Insulares": '#9B380C',
  "Caminos Portugueses": '#285AA1',
  "Chemins vers Via des Piemonts": '#B00ACE',
  "Chemins vers Via Turonensis": '#C5B287',
  "Via Tolosana Arles": '#1A3017',
  "Voie des Piemonts": '#5F5B10',
  "Voie Turonensis - Paris": '#30BFB5'
};

// Estilo de selección (amarillo fosforito).
const highlightStyle = new Style({
  stroke: new Stroke({
    color: '#FFFF00',
    width: 4,
  }),
});

// Estilo predeterminado para las líneas basado en el atributo "agrupacion".
const defaultStyleFunction = (feature) => {
  const agrupacion = feature.get('agrupacion');
  return new Style({
    stroke: new Stroke({
      color: colores[agrupacion] || 'black',
      width: 3,
    }),
  });
};

// Configuración de capas base (OSM, PNOA, MTN50).
const baseLayers = [
  new TileLayer({
    source: new OSM(),
    visible: true,
    title: 'OSM',
    type: 'base',
  }),
  new TileLayer({
    source: new TileWMS({
      url: 'https://www.ign.es/wms-inspire/pnoa-ma?',
      params: { LAYERS: 'OI.OrthoimageCoverage', TILED: true },
      attributions: '© Instituto Geográfico Nacional',
    }),
    visible: false,
    title: 'PNOA',
    type: 'base',
  }),
  new TileLayer({
    source: new TileWMS({
      url: 'https://www.ign.es/wms/primera-edicion-mtn?',
      params: { LAYERS: 'MTN50', TILED: true },
      attributions: '© Instituto Geográfico Nacional',
    }),
    visible: false,
    title: 'MTN50',
    type: 'base',
  }),
];

const baseLayerGroup = new LayerGroup({
  title: 'Capas Base',
  layers: baseLayers,
});

// Capa vectorial para los Caminos de Santiago.
const caminosSource = new VectorSource({
  url: './data/caminos_santiago.geojson',
  format: new GeoJSON(),
});

const caminosLayer = new VectorLayer({
  source: caminosSource,
  title: 'Caminos de Santiago',
  style: defaultStyleFunction,
});

// Capa para el mapa guía.
const caminosLayerGuide = new VectorLayer({
  source: caminosSource,
  style: new Style({
    stroke: new Stroke({
      color: 'red',
      width: 1,
      lineDash: [4, 8],
    }),
  }),
});

// Configuración de la vista del mapa.
const mapView = new View({
  center: fromLonLat([-3.7, 40]),
  zoom: 6.8,
  maxZoom: 15,
  minZoom: 6,
});

// Extensiones geográficas predefinidas.
const extents = {
  spain: transformExtent([-11.0, 35.0, 5.0, 44.0], 'EPSG:4326', 'EPSG:3857'),
  laCoruna: transformExtent([-8.75, 42.70, -7.8, 43.45], 'EPSG:4326', 'EPSG:3857'),
};

// Configuración del mapa.
const map = new Map({
  target: 'map',
  layers: [baseLayerGroup, caminosLayer],
  view: mapView,
  controls: defaultControls().extend([
    new OverviewMap({
      collapsed: false,
      layers: [new TileLayer({ source: new OSM() }), caminosLayerGuide],
    }),
    new ScaleLine({
      units: 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 140,
    }),
  ]),
});

// Control para alternar capas.
map.addControl(
  new LayerSwitcher({
    activationMode: 'click',
    startActive: true,
    groupSelectStyle: 'group',
  })
);

// Botones personalizados para centrar el mapa en extensiones predefinidas.
class CustomZoomButton extends Control {
  constructor(label, extent, tooltip, position) {
    const button = document.createElement('button');
    button.innerHTML = label;
    button.title = tooltip;

    const element = document.createElement('div');
    element.className = `custom-zoom-button ${position}`;
    element.appendChild(button);

    super({ element });

    button.addEventListener('click', () => {
      map.getView().fit(extent, { duration: 1000 });
    });
  }
}

// Añadir los botones personalizados al mapa.
map.addControl(new CustomZoomButton('ES', extents.spain, 'Centrar el mapa en España', 'es'));
map.addControl(new CustomZoomButton('LC', extents.laCoruna, 'Centrar el mapa en La Coruña', 'lc'));

// Configuración del popup para mostrar atributos de las características seleccionadas.
const popupContainer = document.createElement('div');
popupContainer.className = 'ol-popup';

const popup = new Overlay({
  element: popupContainer,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10],
});

map.addOverlay(popup);

// Evento de clic en el mapa para manejar la selección de características.
let selectedFeature = null;

map.on('singleclick', (event) => {
  const features = map.getFeaturesAtPixel(event.pixel);

  if (selectedFeature) {
    selectedFeature.setStyle(defaultStyleFunction(selectedFeature));
    selectedFeature = null;
  }

  if (features && features.length > 0) {
    const feature = features[0];
    feature.setStyle(highlightStyle);
    selectedFeature = feature;

    const properties = feature.getProperties();
    popup.getElement().innerHTML = `
      <strong>Nombre:</strong> ${properties.nombre || 'Desconocido'}<br>
      <strong>Longitud:</strong> ${properties.longitud || 'Desconocida'} km<br>
      <strong>Agrupación:</strong> ${properties.agrupacion || 'Desconocida'}
    `;
    popup.setPosition(event.coordinate);
  } else {
    popup.setPosition(undefined);
  }
});

// Actualizar la leyenda dinámicamente.
function actualizarLeyenda() {
  const legendDiv = document.getElementById('legend');
  legendDiv.innerHTML = '<h3>Leyenda</h3>';

  Object.entries(colores).forEach(([nombre, color]) => {
    legendDiv.insertAdjacentHTML('beforeend', `
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <div style="width: 20px; height: 10px; background-color: ${color}; margin-right: 8px;"></div>
        <span>${nombre}</span>
      </div>
    `);
  });
}
actualizarLeyenda();
