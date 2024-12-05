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
import { defaults as defaultControls, OverviewMap, ZoomToExtent } from 'ol/control';
import { fromLonLat } from 'ol/proj';
import { Group as LayerGroup } from 'ol/layer';
import LayerSwitcher from 'ol-layerswitcher';
import { Style, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';

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
    attributions:
      '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  visible: false,
  title: 'PNOA',
  type: 'base'
});

const mtn50BaseLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://www.ign.es/wms/primera-edicion-mtn?',
    params: { LAYERS: 'MTN50', TILED: true },
    attributions:
      '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  visible: false,
  title: 'MTN50',
  type: 'base'
});

///// Capa de los Caminos de Santiago
const caminosSource = new VectorSource({
  url: './data/caminos_santiago.geojson',
  format: new GeoJSON()
});

const caminosLayer = new VectorLayer({
  source: caminosSource,
  title: 'Caminos de Santiago',
  style: feature => {
    const agrupacion = feature.get('agrupacion');
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
    return new Style({
      stroke: new Stroke({
        color: colores[agrupacion] || 'black',
        width: 3
      })
    });
  }
});

// Agrupación de capas base
const baseLayerGroup = new LayerGroup({
  title: 'Capas Base',
  layers: [osmBaseLayer, pnoaBaseLayer, mtn50BaseLayer]
});

// Vista del mapa
const mapView = new View({
  center: fromLonLat([-3.70379, 40.41678]),
  zoom: 6,
  extent: fromLonLat([-9.27, 35.94]).concat(fromLonLat([4.32, 43.79]))
});

// Configuración del mapa
const map = new Map({
  target: 'map',
  layers: [baseLayerGroup, caminosLayer],
  view: mapView,
  controls: defaultControls().extend([
    new OverviewMap({
      collapsed: false, // Mapa guía desplegado por defecto
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        caminosLayer // Añadir la capa de caminos al mini mapa
      ]
    }),
    new ZoomToExtent({
      extent: fromLonLat([-8.75, 42.70]).concat(fromLonLat([-7.8, 43.45]))
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

// Ventana emergente para consulta de atributos
const popupContainer = document.createElement('div');
popupContainer.className = 'ol-popup';
const popup = new Overlay({
  element: popupContainer,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10]
});
map.addOverlay(popup);

// Estilo personalizado para el popup
popupContainer.style.backgroundColor = 'white';
popupContainer.style.border = '1px solid black';
popupContainer.style.borderRadius = '8px';
popupContainer.style.padding = '10px';
popupContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
popupContainer.style.maxWidth = '300px';

// Manejador de clics para mostrar atributos
map.on('singleclick', (evt) => {
  popup.setPosition(undefined); // Cerrar el popup si no hay selección
  map.forEachFeatureAtPixel(evt.pixel, (feature) => {
    const properties = feature.getProperties();
    const atributosHTML = `
      <div>
        <strong>Nombre:</strong> ${properties.nombre || 'Desconocido'}<br>
        <strong>Longitud:</strong> ${properties.longitud || 'Desconocida'} km<br>
        <strong>Agrupación:</strong> ${properties.agrupacion || 'Desconocida'}
      </div>
    `;
    popupContainer.innerHTML = atributosHTML;
    popup.setPosition(evt.coordinate); // Posicionar el popup
    return true; // Finalizar iteración
  });
});