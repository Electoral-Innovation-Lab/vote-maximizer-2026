import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { feature as topoFeature } from 'topojson-client';
import statesData from 'us-atlas/states-10m.json';
import { getDistrictColor } from '../utils/districtUtils.js';
import './Map.css';

// Congressional district boundaries — two options (set one in .env):
//   VITE_DISTRICT_TILESET=mapbox://username.tileset-id   ← Mapbox vector tileset (recommended)
//   Fallback: place districts.geojson in public/
const DISTRICT_TILESET = import.meta.env.VITE_DISTRICT_TILESET ?? null;
const DISTRICT_SRC_LAYER = import.meta.env.VITE_DISTRICT_LAYER ?? 'cd119';

async function loadDistrictGeoJSON() {
  const CACHE_KEY = 'vm_districts_v2';
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  const res = await fetch('/districts.geojson');
  if (!res.ok) throw new Error('districts.geojson not found in public/');
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

function buildColorExpression(raceData) {
  const expr = ['match', ['get', 'GEOID']];
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

const DISTRICT_LAYERS = ['districts-fill', 'districts-line', 'districts-hover', 'districts-selected'];
const STATE_LAYERS = ['states-fill', 'states-line', 'states-hover', 'states-selected'];

export default function Map({
  raceData,
  tab,
  hoveredGeoid,
  selectedGeoid,
  previewCenter,
  searchCenter,
  onRaceHover,
  onRaceSelect,
  onLocationSearch,
  onDistrictCentroidsReady,
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
  const tabRef = useRef(tab);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);
  useEffect(() => { onHoverRef.current = onRaceHover; }, [onRaceHover]);
  useEffect(() => { onSelectRef.current = onRaceSelect; }, [onRaceSelect]);
  useEffect(() => { onLocationSearchRef.current = onLocationSearch; }, [onLocationSearch]);
  useEffect(() => { onDistrictCentroidsReadyRef.current = onDistrictCentroidsReady; }, [onDistrictCentroidsReady]);
  useEffect(() => { tabRef.current = tab; }, [tab]);

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
        // ── Congressional district source ────────────────────────────────
        if (DISTRICT_TILESET) {
          map.addSource('districts', {
            type: 'vector',
            url: DISTRICT_TILESET,
            promoteId: { [DISTRICT_SRC_LAYER]: 'GEOID' },
          });
          // Compute centroids lazily from rendered features at initial zoom
          map.once('idle', () => {
            const features = map.queryRenderedFeatures({ layers: ['districts-fill'] });
            const centroids = {};
            features.forEach((f) => {
              const geoid = f.properties?.GEOID;
              if (geoid) centroids[geoid] = computeCentroid(f.geometry);
            });
            onDistrictCentroidsReadyRef.current?.(centroids);
          });
        } else {
          try {
            const districtGeo = await loadDistrictGeoJSON();
            const centroids = {};
            districtGeo.features.forEach((f) => {
              const geoid = f.properties?.GEOID;
              if (geoid) centroids[geoid] = computeCentroid(f.geometry);
            });
            onDistrictCentroidsReadyRef.current?.(centroids);
            map.addSource('districts', { type: 'geojson', data: districtGeo, promoteId: 'GEOID' });
          } catch (err) {
            console.warn('District boundaries unavailable:', err.message);
            map.addSource('districts', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
              promoteId: 'GEOID',
            });
          }
        }

        // ── District layers ──────────────────────────────────────────────
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

        // ── State layers ─────────────────────────────────────────────────
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
          map.setPaintProperty('districts-fill', 'fill-color', buildColorExpression(raceDataRef.current));
        }

        setIsMapReady(true);

        // ── Layer event handlers ─────────────────────────────────────────
        function setupLayerEvents(fillLayer, source) {
          let prevId = null;
          const mkRef = (id) => (source === 'districts' && DISTRICT_TILESET)
            ? { source, sourceLayer: DISTRICT_SRC_LAYER, id }
            : { source, id };

          map.on('mousemove', fillLayer, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const feature = e.features?.[0];
            if (!feature) return;
            const geoid = feature.properties?.GEOID ?? String(feature.id);
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
            const geoid = feature.properties?.GEOID ?? String(feature.id);
            const race = raceDataRef.current.find((d) => d.geoid === geoid);
            onSelectRef.current(race ? geoid : null);
          });
        }

        setupLayerEvents('districts-fill', 'districts');
        setupLayerEvents('states-fill', 'states');

        map.on('click', (e) => {
          const activeLayer = tabRef.current === 'house' ? 'districts-fill' : 'states-fill';
          const features = map.queryRenderedFeatures(e.point, { layers: [activeLayer] });
          if (!features.length) onSelectRef.current(null);
        });

      } catch (err) {
        console.error('Map setup error:', err);
        setMapError(`Map setup failed: ${err.message}`);
      }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Toggle layer visibility ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    const isHouse = tab === 'house';
    DISTRICT_LAYERS.forEach((id) => map.setLayoutProperty(id, 'visibility', isHouse ? 'visible' : 'none'));
    STATE_LAYERS.forEach((id) => map.setLayoutProperty(id, 'visibility', isHouse ? 'none' : 'visible'));
  }, [tab, isMapReady]);

  // ── Update choropleth colors ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !raceData.length) return;
    const fillLayer = tab === 'house' ? 'districts-fill' : 'states-fill';
    map.setPaintProperty(fillLayer, 'fill-color', buildColorExpression(raceData));
  }, [raceData, tab, isMapReady]);

  // ── Sync hover from InfoBox → map ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    const { source: ps, geoid: pg } = prevHoveredRef.current;
    if (pg) setFState(map, ps, pg, { hovered: false });
    const source = tab === 'house' ? 'districts' : 'states';
    if (hoveredGeoid) setFState(map, source, hoveredGeoid, { hovered: true });
    prevHoveredRef.current = { source, geoid: hoveredGeoid };
  }, [hoveredGeoid, tab, isMapReady]);

  // ── Sync selection + zoom + popup from InfoBox → map ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const { source: ps, geoid: pg } = prevSelectedRef.current;
    if (pg) setFState(map, ps, pg, { selected: false });
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    if (!selectedGeoid) { prevSelectedRef.current = { source: null, geoid: null }; return; }

    const source = tab === 'house' ? 'districts' : 'states';
    setFState(map, source, selectedGeoid, { selected: true });
    prevSelectedRef.current = { source, geoid: selectedGeoid };

    const race = raceData.find((d) => d.geoid === selectedGeoid);
    if (!race) return;

    const queryOpts = (DISTRICT_TILESET && tab === 'house')
      ? { filter: ['==', ['get', 'GEOID'], selectedGeoid], sourceLayer: DISTRICT_SRC_LAYER }
      : { filter: ['==', ['get', 'GEOID'], selectedGeoid] };
    const features = map.querySourceFeatures(source, queryOpts);

    if (features.length) {
      const coords = [];
      features.forEach((f) => {
        if (f.geometry.type === 'Polygon') f.geometry.coordinates[0].forEach((c) => coords.push(c));
        else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach((p) => p[0].forEach((c) => coords.push(c)));
      });
      if (coords.length) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        const bounds = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
        map.fitBounds(bounds, { padding: 80, maxZoom: tab === 'house' ? 9 : 7, duration: 800 });
        const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat([(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2 + (bounds[1][1] - bounds[0][1]) * 0.1])
          .setHTML(buildPopupHTML(race, tab))
          .addTo(map);
        popup.on('close', () => { onSelectRef.current(null); popupRef.current = null; });
        popupRef.current = popup;
      }
    }
  }, [selectedGeoid, tab, isMapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />
      {mapError && <div className="map-error"><span>⚠️ {mapError}</span></div>}
      <MapLegend />
    </div>
  );
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
  const title = tab === 'house' ? race.label : (race.state ?? race.label);
  const subtitle = tab === 'house'
    ? `${race.state}'s ${ordinal(race.districtNum)} Congressional District`
    : (race.race ?? '');
  return `
    <div class="map-popup">
      <div class="popup-title">${title}</div>
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
