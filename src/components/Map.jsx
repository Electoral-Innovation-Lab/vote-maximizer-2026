import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { feature as topoFeature } from 'topojson-client';
import statesData from 'us-atlas/states-10m.json';
import { getDistrictColor, URBANICITY_CONFIG } from '../utils/districtUtils.js';
import './Map.css';

const DISTRICT_TILESET  = import.meta.env.VITE_DISTRICT_TILESET  ?? null;
const DISTRICT_SRC_LAYER = import.meta.env.VITE_DISTRICT_LAYER   ?? 'cd119';
const SLD_UPPER_TILESET  = import.meta.env.VITE_SLD_UPPER_TILESET ?? null;
const SLD_UPPER_LAYER    = import.meta.env.VITE_SLD_UPPER_LAYER   ?? 'sldu';
const SLD_LOWER_TILESET  = import.meta.env.VITE_SLD_LOWER_TILESET ?? null;
const SLD_LOWER_LAYER    = import.meta.env.VITE_SLD_LOWER_LAYER   ?? 'sldl';

// Match expression for each map tab
const GEOID_EXPR = {
  house:     ['get', 'CONG119'],
  sld_upper: ['concat', ['get', 'STATE'], '-', ['get', 'DISTRICT']],
  sld_lower: ['concat', ['get', 'STATE'], '-', ['get', 'DISTRICT']],
  state:     ['get', 'GEOID'],
};

// Empty filter that matches nothing (for filter-based hover/select reset)
const NO_MATCH = ['==', ['literal', 1], 0];

async function loadDistrictGeoJSON() {
  const CACHE_KEY = 'vm_districts_v2';
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  const res = await fetch('/districts.geojson');
  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok || ct.includes('text/html')) throw new Error('districts.geojson not found in public/');
  const geo = await res.json();
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(geo)); } catch (_) {}
  return geo;
}

function getStatesGeoJSON() {
  const geo = topoFeature(statesData, statesData.objects.states);
  geo.features.forEach((f) => {
    f.properties = { ...f.properties, GEOID: String(f.id) };
  });
  return geo;
}

function computeCentroid(geometry) {
  const coords = [];
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach((c) => coords.push(c));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly) => poly[0].forEach((c) => coords.push(c)));
  }
  if (!coords.length) return null;
  return [
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
  ];
}

function buildColorExpression(raceData, matchExpr) {
  const expr = ['match', matchExpr];
  const seen = new Set();
  for (const d of raceData) {
    if (d.geoid && !seen.has(d.geoid)) {
      seen.add(d.geoid);
      expr.push(d.geoid, getDistrictColor(d.voterPower));
    }
  }
  expr.push('#cbd5e1');
  return expr;
}

// Feature-state helper (house uses vector tile promoteId; states use geojson promoteId)
function setFState(map, source, geoid, state) {
  if (!geoid) return;
  try {
    if (source === 'districts' && DISTRICT_TILESET) {
      map.setFeatureState({ source, sourceLayer: DISTRICT_SRC_LAYER, id: geoid }, state);
    } else {
      map.setFeatureState({ source, id: geoid }, state);
    }
  } catch (_) {}
}

// Filter-based select/hover for SLD layers (no unique per-feature ID available)
function sldFilter(geoid) {
  if (!geoid) return NO_MATCH;
  const dash = geoid.indexOf('-');
  const s = geoid.slice(0, dash);
  const d = geoid.slice(dash + 1);
  return ['all', ['==', ['get', 'STATE'], s], ['==', ['get', 'DISTRICT'], d]];
}

const HOUSE_LAYERS     = ['districts-fill', 'districts-line', 'districts-hover', 'districts-selected'];
const SLD_UPPER_LAYERS = ['sld-upper-fill', 'sld-upper-line', 'sld-upper-hover', 'sld-upper-selected'];
const SLD_LOWER_LAYERS = ['sld-lower-fill', 'sld-lower-line', 'sld-lower-hover', 'sld-lower-selected'];
const STATE_LAYERS     = ['states-fill', 'states-line', 'states-hover', 'states-selected'];
const ALL_LAYERS       = [...HOUSE_LAYERS, ...SLD_UPPER_LAYERS, ...SLD_LOWER_LAYERS, ...STATE_LAYERS];

function activeLayersForTab(tab) {
  if (tab === 'house')     return HOUSE_LAYERS;
  if (tab === 'sld_upper') return SLD_UPPER_LAYERS;
  if (tab === 'sld_lower') return SLD_LOWER_LAYERS;
  return STATE_LAYERS;
}

export default function Map({
  raceData,
  tab,
  hoveredGeoid,
  selectedGeoid,
  previewCenter,
  searchCenter,
  resetViewTrigger,
  onRaceHover,
  onRaceSelect,
  onLocationSearch,
  onDistrictCentroidsReady,
  onSldCentroidsReady,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const raceDataRef = useRef(raceData);
  const onHoverRef = useRef(onRaceHover);
  const onSelectRef = useRef(onRaceSelect);
  const onLocationSearchRef = useRef(onLocationSearch);
  const onDistrictCentroidsReadyRef = useRef(onDistrictCentroidsReady);
  const onSldCentroidsReadyRef = useRef(onSldCentroidsReady);
  const tabRef = useRef(tab);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);
  useEffect(() => { onHoverRef.current = onRaceHover; }, [onRaceHover]);
  useEffect(() => { onSelectRef.current = onRaceSelect; }, [onRaceSelect]);
  useEffect(() => { onLocationSearchRef.current = onLocationSearch; }, [onLocationSearch]);
  useEffect(() => { onDistrictCentroidsReadyRef.current = onDistrictCentroidsReady; }, [onDistrictCentroidsReady]);
  useEffect(() => { onSldCentroidsReadyRef.current = onSldCentroidsReady; }, [onSldCentroidsReady]);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // Tracks previous hovered/selected for feature-state sources (house, state)
  const prevHoveredRef = useRef({ source: null, geoid: null });
  const prevSelectedRef = useRef({ source: null, geoid: null });

  // ── Map initialization ───────────────────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || token === 'your_mapbox_public_token_here') {
      setMapError('No Mapbox token. Add VITE_MAPBOX_TOKEN to .env');
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5, 39.5],
      zoom: 3.5,
      minZoom: 2,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showAccuracyCircle: false,
        showUserLocation: true,
      }),
      'top-right'
    );

    const geocoder = new MapboxGeocoder({
      accessToken: token,
      mapboxgl,
      placeholder: 'Search address or place…',
      countries: 'us',
      marker: { color: '#FF8F00' },
      flyTo: { speed: 1.4, curve: 1.4 },
    });
    geocoder.on('result', (e) => {
      const [lng, lat] = e.result.center;
      onLocationSearchRef.current?.({ lat, lng, placeName: e.result.place_name });
    });
    map.addControl(geocoder, 'top-left');

    map.on('load', async () => {
      try {
        // ── US House district source ─────────────────────────────────────
        if (DISTRICT_TILESET) {
          map.addSource('districts', {
            type: 'vector',
            url: DISTRICT_TILESET,
            promoteId: { [DISTRICT_SRC_LAYER]: 'CONG119' },
          });
          map.once('idle', () => {
            const features = map.queryRenderedFeatures({ layers: ['districts-fill'] });
            const centroids = {};
            features.forEach((f) => {
              const key = f.properties?.CONG119;
              if (key) centroids[key] = computeCentroid(f.geometry);
            });
            onDistrictCentroidsReadyRef.current?.(centroids);
          });
        } else {
          try {
            const districtGeo = await loadDistrictGeoJSON();
            const centroids = {};
            districtGeo.features.forEach((f) => {
              const key = f.properties?.CONG119 ?? f.properties?.GEOID;
              if (key) centroids[key] = computeCentroid(f.geometry);
            });
            onDistrictCentroidsReadyRef.current?.(centroids);
            map.addSource('districts', { type: 'geojson', data: districtGeo, promoteId: 'CONG119' });
          } catch (err) {
            console.warn('District boundaries unavailable:', err.message);
            map.addSource('districts', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
              promoteId: 'CONG119',
            });
          }
        }

        // ── House layers ─────────────────────────────────────────────────
        const dsl = DISTRICT_TILESET ? { 'source-layer': DISTRICT_SRC_LAYER } : {};
        map.addLayer({ id: 'districts-fill', type: 'fill', source: 'districts', ...dsl,
          paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.75 } });
        map.addLayer({ id: 'districts-line', type: 'line', source: 'districts', ...dsl,
          paint: { 'line-color': '#94a3b8', 'line-width': 0.6 } });
        map.addLayer({ id: 'districts-hover', type: 'fill', source: 'districts', ...dsl,
          paint: { 'fill-color': '#FF8F00',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0] } });
        map.addLayer({ id: 'districts-selected', type: 'line', source: 'districts', ...dsl,
          paint: { 'line-color': '#FF8F00',
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0] } });

        // ── SLD upper source + layers ────────────────────────────────────
        if (SLD_UPPER_TILESET) {
          map.addSource('sld-upper', { type: 'vector', url: SLD_UPPER_TILESET });
          addSldLayers(map, 'sld-upper', SLD_UPPER_LAYER);
        }

        // ── SLD lower source + layers ────────────────────────────────────
        if (SLD_LOWER_TILESET) {
          map.addSource('sld-lower', { type: 'vector', url: SLD_LOWER_TILESET });
          addSldLayers(map, 'sld-lower', SLD_LOWER_LAYER);
        }

        // ── State source + layers ────────────────────────────────────────
        const stateGeo = getStatesGeoJSON();
        map.addSource('states', { type: 'geojson', data: stateGeo, promoteId: 'GEOID' });
        map.addLayer({ id: 'states-fill', type: 'fill', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.75 } });
        map.addLayer({ id: 'states-line', type: 'line', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#94a3b8', 'line-width': 0.8 } });
        map.addLayer({ id: 'states-hover', type: 'fill', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'fill-color': '#FF8F00',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0] } });
        map.addLayer({ id: 'states-selected', type: 'line', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#FF8F00',
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0] } });

        if (raceDataRef.current.length) {
          map.setPaintProperty('districts-fill', 'fill-color',
            buildColorExpression(raceDataRef.current, GEOID_EXPR.house));
        }

        setIsMapReady(true);

        // ── Event handlers ───────────────────────────────────────────────
        setupFeatureStateEvents(map, 'districts-fill', 'districts',
          (props) => props?.CONG119);
        setupFeatureStateEvents(map, 'states-fill', 'states',
          (props) => props?.GEOID);

        if (SLD_UPPER_TILESET) {
          setupFilterEvents(map, 'sld-upper-fill', 'sld-upper-hover');
        }
        if (SLD_LOWER_TILESET) {
          setupFilterEvents(map, 'sld-lower-fill', 'sld-lower-hover');
        }

        map.on('click', (e) => {
          const t = tabRef.current;
          const layer = t === 'house' ? 'districts-fill'
            : t === 'sld_upper' ? 'sld-upper-fill'
            : t === 'sld_lower' ? 'sld-lower-fill'
            : 'states-fill';
          const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
          if (!features.length) onSelectRef.current(null);
        });

      } catch (err) {
        console.error('Map setup error:', err);
        setMapError(`Map setup failed: ${err.message}`);
      }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom out to national view on tab change ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !resetViewTrigger) return;
    map.flyTo({ center: [-98.5, 39.5], zoom: 3.5, speed: 1.2, curve: 1.4 });
  }, [resetViewTrigger, isMapReady]);

  // ── Fly to landing page search ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !searchCenter) return;
    map.flyTo({ center: searchCenter, zoom: 7, speed: 1.4, curve: 1.4 });
  }, [searchCenter, isMapReady]);

  // ── Fly to Top Contests hover preview ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !previewCenter) return;
    map.flyTo({ center: previewCenter, zoom: Math.max(map.getZoom(), 5), speed: 1.2, curve: 1.2 });
  }, [previewCenter, isMapReady]);

  // ── Toggle layer visibility + clear SLD filters when leaving SLD tabs ────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    const active = activeLayersForTab(tab);
    ALL_LAYERS.forEach((id) => {
      try { map.setLayoutProperty(id, 'visibility', active.includes(id) ? 'visible' : 'none'); } catch (_) {}
    });
    if (tab !== 'sld_upper') {
      try { map.setFilter('sld-upper-hover', NO_MATCH); map.setFilter('sld-upper-selected', NO_MATCH); } catch (_) {}
    }
    if (tab !== 'sld_lower') {
      try { map.setFilter('sld-lower-hover', NO_MATCH); map.setFilter('sld-lower-selected', NO_MATCH); } catch (_) {}
    }
  }, [tab, isMapReady]);

  // ── Update choropleth colors ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !raceData.length) return;
    const matchExpr = GEOID_EXPR[tab] ?? GEOID_EXPR.state;
    const fillLayer =
      tab === 'house'     ? 'districts-fill' :
      tab === 'sld_upper' ? 'sld-upper-fill'  :
      tab === 'sld_lower' ? 'sld-lower-fill'  :
      'states-fill';
    try {
      map.setPaintProperty(fillLayer, 'fill-color', buildColorExpression(raceData, matchExpr));
    } catch (_) {}
  }, [raceData, tab, isMapReady]);

  // ── Compute SLD centroids when SLD tab becomes active ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (tab !== 'sld_upper' && tab !== 'sld_lower') return;
    const fillLayer = tab === 'sld_upper' ? 'sld-upper-fill' : 'sld-lower-fill';
    const onIdle = () => {
      const features = map.queryRenderedFeatures({ layers: [fillLayer] });
      const centroids = {};
      features.forEach((f) => {
        const { STATE: s, DISTRICT: d } = f.properties ?? {};
        if (s && d) centroids[`${s}-${d}`] = computeCentroid(f.geometry);
      });
      if (Object.keys(centroids).length > 0) {
        onSldCentroidsReadyRef.current?.(tab, centroids);
      }
    };
    map.once('idle', onIdle);
  }, [tab, isMapReady]);

  // ── Sync hover from InfoBox → map ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear previous
    const { source: ps, geoid: pg } = prevHoveredRef.current;
    if (pg && ps !== 'sld-upper' && ps !== 'sld-lower') {
      setFState(map, ps, pg, { hovered: false });
    }

    const isSldUpper = tab === 'sld_upper';
    const isSldLower = tab === 'sld_lower';
    const source = isSldUpper ? 'sld-upper' : isSldLower ? 'sld-lower'
      : tab === 'house' ? 'districts' : 'states';

    if (isSldUpper || isSldLower) {
      const hoverLayerId = isSldUpper ? 'sld-upper-hover' : 'sld-lower-hover';
      try { map.setFilter(hoverLayerId, hoveredGeoid ? sldFilter(hoveredGeoid) : NO_MATCH); } catch (_) {}
    } else {
      if (hoveredGeoid) setFState(map, source, hoveredGeoid, { hovered: true });
    }

    prevHoveredRef.current = { source, geoid: hoveredGeoid };
  }, [hoveredGeoid, tab, isMapReady]);

  // ── Sync selection + zoom + popup from InfoBox → map ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear previous
    const { source: ps, geoid: pg } = prevSelectedRef.current;
    if (pg) {
      if (ps === 'sld-upper' || ps === 'sld-lower') {
        const sel = ps === 'sld-upper' ? 'sld-upper-selected' : 'sld-lower-selected';
        try { map.setFilter(sel, NO_MATCH); } catch (_) {}
      } else {
        setFState(map, ps, pg, { selected: false });
      }
    }
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    if (!selectedGeoid) { prevSelectedRef.current = { source: null, geoid: null }; return; }

    const isSldUpper = tab === 'sld_upper';
    const isSldLower = tab === 'sld_lower';
    const source = isSldUpper ? 'sld-upper' : isSldLower ? 'sld-lower'
      : tab === 'house' ? 'districts' : 'states';

    prevSelectedRef.current = { source, geoid: selectedGeoid };
    const race = raceData.find((d) => d.geoid === selectedGeoid);
    if (!race) return;

    if (isSldUpper || isSldLower) {
      const selLayerId = isSldUpper ? 'sld-upper-selected' : 'sld-lower-selected';
      const srcLayer   = isSldUpper ? SLD_UPPER_LAYER : SLD_LOWER_LAYER;
      const f = sldFilter(selectedGeoid);
      try { map.setFilter(selLayerId, f); } catch (_) {}
      const features = map.querySourceFeatures(source, { filter: f, sourceLayer: srcLayer });
      fitAndPopup(map, features, race, tab);
    } else {
      setFState(map, source, selectedGeoid, { selected: true });
      const queryOpts = (DISTRICT_TILESET && tab === 'house')
        ? { filter: ['==', ['get', 'CONG119'], selectedGeoid], sourceLayer: DISTRICT_SRC_LAYER }
        : { filter: ['==', ['get', 'GEOID'], selectedGeoid] };
      const features = map.querySourceFeatures(source, queryOpts);
      fitAndPopup(map, features, race, tab);
    }
  }, [selectedGeoid, tab, isMapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />
      {mapError && <div className="map-error"><span>⚠️ {mapError}</span></div>}
      <MapLegend />
    </div>
  );

  // ── Helpers defined inside component to close over map instance ──────────
  function setupFeatureStateEvents(map, fillLayer, source, geoidFn) {
    let prevId = null;
    const mkRef = (id) => (source === 'districts' && DISTRICT_TILESET)
      ? { source, sourceLayer: DISTRICT_SRC_LAYER, id }
      : { source, id };

    map.on('mousemove', fillLayer, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = e.features?.[0];
      if (!feature) return;
      const geoid = geoidFn(feature.properties);
      if (!geoid) return;
      if (prevId !== null && prevId !== geoid) {
        try { map.setFeatureState(mkRef(prevId), { hovered: false }); } catch (_) {}
      }
      prevId = geoid;
      try { map.setFeatureState(mkRef(geoid), { hovered: true }); } catch (_) {}
      const race = raceDataRef.current.find((d) => d.geoid === geoid);
      onHoverRef.current(race ? geoid : null);
    });

    map.on('mouseleave', fillLayer, () => {
      map.getCanvas().style.cursor = '';
      if (prevId !== null) {
        try { map.setFeatureState(mkRef(prevId), { hovered: false }); } catch (_) {}
        prevId = null;
      }
      onHoverRef.current(null);
    });

    map.on('click', fillLayer, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const geoid = geoidFn(feature.properties);
      const race = raceDataRef.current.find((d) => d.geoid === geoid);
      onSelectRef.current(race ? geoid : null);
    });
  }

  function setupFilterEvents(map, fillLayer, hoverLayerId) {
    let prevGeoid = null;

    map.on('mousemove', fillLayer, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = e.features?.[0];
      if (!feature) return;
      const { STATE: s, DISTRICT: d } = feature.properties ?? {};
      if (!s || !d) return;
      const geoid = `${s}-${d}`;
      if (geoid !== prevGeoid) {
        prevGeoid = geoid;
        try { map.setFilter(hoverLayerId, sldFilter(geoid)); } catch (_) {}
      }
      const race = raceDataRef.current.find((r) => r.geoid === geoid);
      onHoverRef.current(race ? geoid : null);
    });

    map.on('mouseleave', fillLayer, () => {
      map.getCanvas().style.cursor = '';
      prevGeoid = null;
      try { map.setFilter(hoverLayerId, NO_MATCH); } catch (_) {}
      onHoverRef.current(null);
    });

    map.on('click', fillLayer, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const { STATE: s, DISTRICT: d } = feature.properties ?? {};
      if (!s || !d) return;
      const geoid = `${s}-${d}`;
      const race = raceDataRef.current.find((r) => r.geoid === geoid);
      onSelectRef.current(race ? geoid : null);
    });
  }

  function fitAndPopup(map, features, race, tab) {
    if (!features.length) return;
    const coords = [];
    features.forEach((f) => {
      if (f.geometry.type === 'Polygon') f.geometry.coordinates[0].forEach((c) => coords.push(c));
      else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach((p) => p[0].forEach((c) => coords.push(c)));
    });
    if (!coords.length) return;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const bounds = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
    map.fitBounds(bounds, { padding: 80, maxZoom: tab === 'state' ? 7 : 9, duration: 800 });
    const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
      .setLngLat([(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2 + (bounds[1][1] - bounds[0][1]) * 0.1])
      .setHTML(buildPopupHTML(race, tab))
      .addTo(map);
    popup.on('close', () => { onSelectRef.current(null); popupRef.current = null; });
    popupRef.current = popup;
  }
}

function addSldLayers(map, srcId, srcLayer) {
  const dsl = { 'source-layer': srcLayer };
  map.addLayer({ id: `${srcId}-fill`, type: 'fill', source: srcId, ...dsl,
    layout: { visibility: 'none' },
    paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.75 } });
  map.addLayer({ id: `${srcId}-line`, type: 'line', source: srcId, ...dsl,
    layout: { visibility: 'none' },
    paint: { 'line-color': '#94a3b8', 'line-width': 0.4 } });
  map.addLayer({ id: `${srcId}-hover`, type: 'fill', source: srcId, ...dsl,
    layout: { visibility: 'none' },
    filter: ['==', ['literal', 1], 0],
    paint: { 'fill-color': '#FF8F00', 'fill-opacity': 0.3 } });
  map.addLayer({ id: `${srcId}-selected`, type: 'line', source: srcId, ...dsl,
    layout: { visibility: 'none' },
    filter: ['==', ['literal', 1], 0],
    paint: { 'line-color': '#FF8F00', 'line-width': 2.5 } });
}

function formatCookLabel(cookRating) {
  return cookRating
    ?.replace('toss-up', 'Toss-Up')
    .replace('lean-D', 'Lean Dem')
    .replace('lean-R', 'Lean Rep')
    .replace('likely-D', 'Likely Dem')
    .replace('likely-R', 'Likely Rep')
    .replace('solid-D', 'Solid Dem')
    .replace('solid-R', 'Solid Rep') ?? cookRating;
}

function formatMarginLabel(margin) {
  if (margin == null || isNaN(margin)) return null;
  if (margin === 0) return 'Even';
  const abs = Math.abs(margin).toFixed(1).replace(/\.0$/, '');
  return margin > 0 ? `+${abs} Dem` : `+${abs} Rep`;
}

function candidateRow(d, r) {
  if (!d && !r) return '';
  const parts = [];
  if (d) parts.push(`<span style="color:#2563eb;font-weight:600;">D:</span> ${d}`);
  if (r) parts.push(`<span style="color:#dc2626;font-weight:600;">R:</span> ${r}`);
  return `<div class="popup-candidates">${parts.join('<br>')}</div>`;
}

function buildPopupHTML(race, tab) {
  const vpColor = getDistrictColor(race.voterPower);
  const cookLabel = formatCookLabel(race.cookRating);
  const marginLabel = formatMarginLabel(race.margin);
  const isSld = tab === 'sld_upper' || tab === 'sld_lower';
  const title = isSld ? race.label : tab === 'house' ? race.label : (race.state ?? race.label);
  const subtitle = tab === 'house'
    ? `${race.state}'s ${ordinal(race.districtNum)} Congressional District`
    : isSld ? (race.state ?? '')
    : (race.race ?? '');
  const urbanicityCfg = URBANICITY_CONFIG[race.urbanicity];
  const urbanicityBadge = urbanicityCfg
    ? `<span class="popup-urbanicity" style="color:${urbanicityCfg.color};background:${urbanicityCfg.bg}">${urbanicityCfg.label}</span>`
    : '';
  return `
    <div class="map-popup">
      <div class="popup-title-row">
        <span class="popup-title">${title}</span>
        ${urbanicityBadge}
      </div>
      ${subtitle ? `<div class="popup-subtitle">${subtitle}</div>` : ''}
      <div class="popup-row"><span class="popup-label">Cook Rating</span><span class="popup-value">${cookLabel ?? '—'}</span></div>
      ${marginLabel ? `<div class="popup-row"><span class="popup-label">Est. Margin</span><span class="popup-value">${marginLabel}</span></div>` : ''}
      <div class="popup-row">
        <span class="popup-label">Voter Power</span>
        <span class="popup-value popup-vp" style="background:${vpColor}">${Math.round(race.voterPower)}</span>
      </div>
      ${candidateRow(race.dCandidate, race.rCandidate)}
    </div>`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function MapLegend() {
  return (
    <div className="map-legend">
      <div className="legend-title">Voter Power</div>
      <div className="legend-gradient" />
      <div className="legend-labels"><span>Low</span><span>High</span></div>
      <div className="legend-no-contest">
        <span className="legend-swatch" style={{ background: '#cbd5e1' }} />
        No 2026 contest
      </div>
    </div>
  );
}
