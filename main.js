import './style.css';
import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css'; // Estilo para LayerSwitcher
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

// Paleta de colores
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

// Estilo de selección (amarillo fosforito)
const highlightStyle = new Style({
  stroke: new Stroke({
    color: '#FFFF00', // Amarillo fosforito
    width: 4,
  }),
});

// Estilo predeterminado para las líneas
const defaultStyleFunction = (feature) => {
  const agrupacion = feature.get('agrupacion');
  return new Style({
    stroke: new Stroke({
      color: colores[agrupacion] || 'black',
      width: 3,
    }),
  });
};

// Capas base
const osmBaseLayer = new TileLayer({
  source: new OSM(),
  visible: true,
  title: 'OSM',
  type: 'base'
});

const pnoaBaseLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://www.ign.es/wms-inspire/pnoa-ma?',
    params: { LAYERS: 'OI.OrthoimageCoverage', TILED: true },
    attributions: '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  visible: false,
  title: 'PNOA',
  type: 'base'
});

const mtn50BaseLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://www.ign.es/wms/primera-edicion-mtn?',
    params: { LAYERS: 'MTN50', TILED: true },
    attributions: '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  visible: false,
  title: 'MTN50',
  type: 'base'
});

// Capa de los Caminos de Santiago
const caminosSource = new VectorSource({
  url: './data/caminos_santiago.geojson',
  format: new GeoJSON()
});

const caminosLayer = new VectorLayer({
  source: caminosSource,
  title: 'Caminos de Santiago',
  style: defaultStyleFunction
});

// Capa de caminos para el mapa guía
const caminosLayerGuide = new VectorLayer({
  source: caminosSource,
  style: new Style({
    stroke: new Stroke({
      color: 'red',
      width: 1,
      lineDash: [4, 8]
    })
  }),
  title: 'Caminos de Santiago (Mapa guía)'
});

// Agrupación de capas base
const baseLayerGroup = new LayerGroup({
  title: 'Capas Base',
  layers: [osmBaseLayer, pnoaBaseLayer, mtn50BaseLayer]
});

// Vista del mapa
const mapView = new View({
  center: fromLonLat([-3.7, 40]),
  zoom: 6.8,
  maxZoom: 15,
  minZoom: 6
});

// Extensiones geográficas
const spainExtent = transformExtent([-11.0, 35.0, 5.0, 44.0], 'EPSG:4326', 'EPSG:3857');
const laCorunaExtent = transformExtent([-8.75, 42.70, -7.8, 43.45], 'EPSG:4326', 'EPSG:3857');

// Configuración del mapa
const map = new Map({
  target: 'map',
  layers: [baseLayerGroup, caminosLayer],
  view: mapView,
  controls: defaultControls().extend([
    new OverviewMap({
      collapsed: false,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        caminosLayerGuide
      ]
    }),
    new ScaleLine({
      units: 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 140
    })
  ])
});

// Añadir el control de LayerSwitcher
const layerSwitcher = new LayerSwitcher({
  activationMode: 'click',
  startActive: true,
  groupSelectStyle: 'group'
});
map.addControl(layerSwitcher);

// Crear botón personalizado
class CustomZoomButton extends Control {
  constructor(label, extent, tooltip, position) {
    const button = document.createElement('button');
    button.innerHTML = label;
    button.title = tooltip;

    const element = document.createElement('div');
    element.className = `custom-zoom-button ${position}`;
    element.appendChild(button);

    super({
      element: element
    });

    button.addEventListener('click', () => {
      map.getView().fit(extent, { duration: 1000 });
    });
  }
}

// Añadir botones personalizados
map.addControl(new CustomZoomButton('ES', spainExtent, 'Centrar el mapa en España', 'es'));
map.addControl(new CustomZoomButton('LC', laCorunaExtent, 'Centrar el mapa en La Coruña', 'lc'));

// Ventana emergente para atributos
const popupContainer = document.createElement('div');
popupContainer.className = 'ol-popup';
const popup = new Overlay({
  element: popupContainer,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10]
});
map.addOverlay(popup);

// Variable para almacenar la última característica seleccionada
let selectedFeature = null;

// Evento de clic en el mapa
map.on('singleclick', (event) => {
  const features = map.getFeaturesAtPixel(event.pixel);

  // Restablecer estilo de la última selección
  if (selectedFeature) {
    selectedFeature.setStyle(defaultStyleFunction(selectedFeature));
    selectedFeature = null; // Limpiar la selección
  }

  if (features && features.length > 0) {
    const feature = features[0];
    const properties = feature.getProperties();

    // Aplicar el estilo de selección
    feature.setStyle(highlightStyle);
    selectedFeature = feature;

    // Mostrar atributos en el popup
    const content = `
      <strong>Nombre:</strong> ${properties.nombre || 'Desconocido'}<br>
      <strong>Longitud:</strong> ${properties.longitud || 'Desconocida'} km<br>
      <strong>Agrupación:</strong> ${properties.agrupacion || 'Desconocida'}
    `;
    popup.getElement().innerHTML = content;
    popup.setPosition(event.coordinate);
  } else {
    // Ocultar el popup si no se selecciona ninguna línea
    popup.setPosition(undefined);
  }
});

// Leyenda dinámica
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
