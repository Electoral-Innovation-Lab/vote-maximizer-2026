import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { feature as topoFeature } from 'topojson-client';
import statesData from 'us-atlas/states-10m.json';
import { getDistrictColor } from '../utils/districtUtils.js';
import './Map.css';

// ── Census TIGERweb: 119th Congressional Districts ────────────────────────────
const CENSUS_DISTRICTS_BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query' +
  '?where=1%3D1&outFields=GEOID,STATE,CD119,NAME&f=geojson&outSR=4326&resultRecordCount=25';

async function fetchAllDistricts() {
  const features = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${CENSUS_DISTRICTS_BASE}&resultOffset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
    const json = await res.json();
    features.push(...(json.features ?? []));
    hasMore = json.exceededTransferLimit === true;
    offset += 25;
  }

  return { type: 'FeatureCollection', features };
}

// State boundaries from bundled us-atlas TopoJSON (no external fetch needed).
// Feature id is already a zero-padded FIPS string ("01", "04", …).
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
    coords.reduce((s, c) => s + c[1], 0) / coords.length, // lat
    coords.reduce((s, c) => s + c[0], 0) / coords.length, // lng
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

  // Keep latest values accessible inside Mapbox event callbacks
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

  // GEOID → Mapbox feature ID for each source
  const districtFidMap = useRef({});
  const stateFidMap = useRef({});

  // ── Initialize Mapbox ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || token === 'your_mapbox_public_token_here') {
      setMapError('No Mapbox token found. Create a .env file with VITE_MAPBOX_TOKEN.');
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
      onLocationSearchRef.current?.({ lat, lng });
    });
    map.addControl(geocoder, 'top-left');

    map.on('load', async () => {
      try {
        const [districtGeo] = await Promise.all([fetchAllDistricts()]);
        const stateGeo = getStatesGeoJSON();

        if (!districtGeo.features?.length) throw new Error('No district features returned');

        // Build GEOID → feature-id lookups + centroids
        const centroids = {};
        districtGeo.features.forEach((f, idx) => {
          const geoid = f.properties?.GEOID;
          if (geoid) {
            districtFidMap.current[geoid] = idx;
            centroids[geoid] = computeCentroid(f.geometry);
          }
        });
        onDistrictCentroidsReadyRef.current?.(centroids);
        stateGeo.features.forEach((f, idx) => {
          const geoid = f.properties?.GEOID;
          if (geoid) stateFidMap.current[geoid] = idx;
        });

        // ── Congressional district layers ──────────────────────────────────
        map.addSource('districts', { type: 'geojson', data: districtGeo, generateId: true });

        map.addLayer({
          id: 'districts-fill', type: 'fill', source: 'districts',
          paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.75 },
        });
        map.addLayer({
          id: 'districts-line', type: 'line', source: 'districts',
          paint: { 'line-color': '#94a3b8', 'line-width': 0.6 },
        });
        map.addLayer({
          id: 'districts-hover', type: 'fill', source: 'districts',
          paint: {
            'fill-color': '#FF8F00',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0],
          },
        });
        map.addLayer({
          id: 'districts-selected', type: 'line', source: 'districts',
          paint: {
            'line-color': '#FF8F00',
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0],
          },
        });

        // ── State boundary layers (initially hidden) ───────────────────────
        map.addSource('states', { type: 'geojson', data: stateGeo, generateId: true });

        map.addLayer({
          id: 'states-fill', type: 'fill', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.75 },
        });
        map.addLayer({
          id: 'states-line', type: 'line', source: 'states',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#94a3b8', 'line-width': 0.8 },
        });
        map.addLayer({
          id: 'states-hover', type: 'fill', source: 'states',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': '#FF8F00',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0],
          },
        });
        map.addLayer({
          id: 'states-selected', type: 'line', source: 'states',
          layout: { visibility: 'none' },
          paint: {
            'line-color': '#FF8F00',
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0],
          },
        });

        // Apply initial colors if data already loaded
        if (raceDataRef.current.length) {
          map.setPaintProperty('districts-fill', 'fill-color', buildColorExpression(raceDataRef.current));
        }

        setIsMapReady(true);

        // ── Shared hover/click handler factory ──────────────────────────────
        function setupLayerEvents(fillLayer, source) {
          let prevHoveredId = null;

          map.on('mousemove', fillLayer, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const feature = e.features?.[0];
            if (!feature) return;

            if (prevHoveredId !== null && prevHoveredId !== feature.id) {
              map.setFeatureState({ source, id: prevHoveredId }, { hovered: false });
            }
            prevHoveredId = feature.id;
            map.setFeatureState({ source, id: feature.id }, { hovered: true });

            const geoid = feature.properties?.GEOID;
            const race = raceDataRef.current.find((d) => d.geoid === geoid);
            onHoverRef.current(race ? geoid : null);
          });

          map.on('mouseleave', fillLayer, () => {
            map.getCanvas().style.cursor = '';
            if (prevHoveredId !== null) {
              map.setFeatureState({ source, id: prevHoveredId }, { hovered: false });
              prevHoveredId = null;
            }
            onHoverRef.current(null);
          });

          map.on('click', fillLayer, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const geoid = feature.properties?.GEOID;
            const race = raceDataRef.current.find((d) => d.geoid === geoid);
            onSelectRef.current(race ? geoid : null);
          });
        }

        setupLayerEvents('districts-fill', 'districts');
        setupLayerEvents('states-fill', 'states');

        // Click on empty area deselects
        map.on('click', (e) => {
          const activeLayer = tabRef.current === 'house' ? 'districts-fill' : 'states-fill';
          const features = map.queryRenderedFeatures(e.point, { layers: [activeLayer] });
          if (!features.length) onSelectRef.current(null);
        });

      } catch (err) {
        console.error('Failed to load boundaries:', err);
        setMapError(`Could not load boundaries: ${err.message}`);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly to search location (landing page search) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !searchCenter) return;
    map.flyTo({ center: searchCenter, zoom: 7, speed: 1.4, curve: 1.4 });
  }, [searchCenter, isMapReady]);

  // ── Fly to preview center (Top Contests hover) ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !previewCenter) return;
    map.flyTo({ center: previewCenter, zoom: Math.max(map.getZoom(), 5), speed: 1.2, curve: 1.2 });
  }, [previewCenter, isMapReady]);

  // ── Toggle layer visibility when tab changes ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const isHouse = tab === 'house';
    const districtVis = isHouse ? 'visible' : 'none';
    const stateVis = isHouse ? 'none' : 'visible';

    DISTRICT_LAYERS.forEach((id) => map.setLayoutProperty(id, 'visibility', districtVis));
    STATE_LAYERS.forEach((id) => map.setLayoutProperty(id, 'visibility', stateVis));
  }, [tab, isMapReady]);

  // ── Update fill colors when raceData or tab changes ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !raceData.length) return;

    const fillLayer = tab === 'house' ? 'districts-fill' : 'states-fill';
    map.setPaintProperty(fillLayer, 'fill-color', buildColorExpression(raceData));
  }, [raceData, tab, isMapReady]);

  // ── Sync hovered geoid from InfoBox → map ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear both sources
    Object.values(districtFidMap.current).forEach((id) =>
      map.setFeatureState({ source: 'districts', id }, { hovered: false })
    );
    Object.values(stateFidMap.current).forEach((id) =>
      map.setFeatureState({ source: 'states', id }, { hovered: false })
    );

    if (hoveredGeoid) {
      if (tab === 'house') {
        const fid = districtFidMap.current[hoveredGeoid];
        if (fid !== undefined) map.setFeatureState({ source: 'districts', id: fid }, { hovered: true });
      } else {
        const fid = stateFidMap.current[hoveredGeoid];
        if (fid !== undefined) map.setFeatureState({ source: 'states', id: fid }, { hovered: true });
      }
    }
  }, [hoveredGeoid, tab, isMapReady]);

  // ── Sync selected geoid from InfoBox → map (zoom + popup) ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear both sources
    Object.values(districtFidMap.current).forEach((id) =>
      map.setFeatureState({ source: 'districts', id }, { selected: false })
    );
    Object.values(stateFidMap.current).forEach((id) =>
      map.setFeatureState({ source: 'states', id }, { selected: false })
    );

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!selectedGeoid) return;

    const source = tab === 'house' ? 'districts' : 'states';
    const fidMap = tab === 'house' ? districtFidMap.current : stateFidMap.current;
    const fid = fidMap[selectedGeoid];
    if (fid !== undefined) {
      map.setFeatureState({ source, id: fid }, { selected: true });
    }

    const race = raceData.find((d) => d.geoid === selectedGeoid);
    if (!race) return;

    const features = map.querySourceFeatures(source, {
      filter: ['==', ['get', 'GEOID'], selectedGeoid],
    });

    if (features.length) {
      const coords = [];
      const collectCoords = (geom) => {
        if (geom.type === 'Polygon') {
          geom.coordinates[0].forEach((c) => coords.push(c));
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly) => poly[0].forEach((c) => coords.push(c)));
        }
      };
      features.forEach((f) => collectCoords(f.geometry));

      if (coords.length) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: 120, maxZoom: tab === 'house' ? 9 : 7, duration: 800 });

        const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

        const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat([centerLng, centerLat + (bounds[1][1] - bounds[0][1]) * 0.1])
          .setHTML(buildPopupHTML(race, tab))
          .addTo(map);

        popup.on('close', () => {
          onSelectRef.current(null);
          popupRef.current = null;
        });

        popupRef.current = popup;
      }
    }
  }, [selectedGeoid, tab, isMapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />
      {mapError && (
        <div className="map-error">
          <span>⚠️ {mapError}</span>
        </div>
      )}
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

  const marginRow = marginLabel
    ? `<div class="popup-row"><span class="popup-label">Est. Margin</span><span class="popup-value">${marginLabel}</span></div>`
    : '';

  return `
    <div class="map-popup">
      <div class="popup-title">${title}</div>
      ${subtitle ? `<div class="popup-subtitle">${subtitle}</div>` : ''}
      <div class="popup-row">
        <span class="popup-label">Cook Rating</span>
        <span class="popup-value">${cookLabel ?? '—'}</span>
      </div>
      ${marginRow}
      <div class="popup-row">
        <span class="popup-label">Voter Power</span>
        <span class="popup-value popup-vp" style="background:${vpColor}">${Math.round(race.voterPower)}</span>
      </div>
      ${candidateRow(race.dCandidate, race.rCandidate)}
    </div>
  `;
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
      <div className="legend-labels">
        <span>Low</span>
        <span>High</span>
      </div>
      <div className="legend-no-contest">
        <span className="legend-swatch" style={{ background: '#cbd5e1' }} />
        No 2026 contest
      </div>
    </div>
  );
}
