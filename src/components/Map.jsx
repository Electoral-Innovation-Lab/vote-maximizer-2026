import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
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

function buildColorExpression(raceData) {
  const expr = ['match', ['get', 'GEOID']];
  for (const d of raceData) {
    if (d.geoid) {
      expr.push(d.geoid, getDistrictColor(d.voterPower));
    }
  }
  expr.push('#cbd5e1'); // default: no contest
  return expr;
}

const DISTRICT_LAYERS = ['districts-fill', 'districts-line', 'districts-hover', 'districts-selected'];
const STATE_LAYERS = ['states-fill', 'states-line', 'states-hover', 'states-selected'];

export default function Map({
  raceData,
  tab,
  hoveredGeoid,
  selectedGeoid,
  onRaceHover,
  onRaceSelect,
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
  const tabRef = useRef(tab);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);
  useEffect(() => { onHoverRef.current = onRaceHover; }, [onRaceHover]);
  useEffect(() => { onSelectRef.current = onRaceSelect; }, [onRaceSelect]);
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

    map.on('load', async () => {
      try {
        const [districtGeo] = await Promise.all([fetchAllDistricts()]);
        const stateGeo = getStatesGeoJSON();

        if (!districtGeo.features?.length) throw new Error('No district features returned');

        // Build GEOID → feature-id lookups
        districtGeo.features.forEach((f, idx) => {
          const geoid = f.properties?.GEOID;
          if (geoid) districtFidMap.current[geoid] = idx;
        });
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
            'fill-color': '#1d4ed8',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0],
          },
        });
        map.addLayer({
          id: 'districts-selected', type: 'line', source: 'districts',
          paint: {
            'line-color': '#1d4ed8',
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
            'fill-color': '#1d4ed8',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.25, 0],
          },
        });
        map.addLayer({
          id: 'states-selected', type: 'line', source: 'states',
          layout: { visibility: 'none' },
          paint: {
            'line-color': '#1d4ed8',
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
  if (margin === 0) return 'Even';
  return margin > 0 ? `+${margin} Dem` : `+${Math.abs(margin)} Rep`;
}

function buildPopupHTML(race, tab) {
  const vpColor = getDistrictColor(race.voterPower);
  const cookLabel = formatCookLabel(race.cookRating);
  const marginLabel = formatMarginLabel(race.margin);
  const sourceLabel = race.source === 'cook' ? 'Cook Political Report proxy' : 'Polling average';

  if (tab === 'house') {
    return `
      <div class="map-popup">
        <div class="popup-title">${race.label}</div>
        <div class="popup-subtitle">${race.state}'s ${ordinal(race.districtNum)} Congressional District</div>
        <div class="popup-row">
          <span class="popup-label">Cook Rating</span>
          <span class="popup-value">${cookLabel}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Projected Margin</span>
          <span class="popup-value">${marginLabel}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Voter Power</span>
          <span class="popup-value popup-vp" style="background:${vpColor}">${Math.round(race.voterPower)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Data Source</span>
          <span class="popup-value">${sourceLabel}</span>
        </div>
        <div class="popup-candidates"><em>Candidate info coming soon</em></div>
      </div>
    `;
  }

  // Senate or Governor
  return `
    <div class="map-popup">
      <div class="popup-title">${race.state}</div>
      <div class="popup-subtitle">${race.race}</div>
      <div class="popup-row">
        <span class="popup-label">Cook Rating</span>
        <span class="popup-value">${cookLabel}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">Projected Margin</span>
        <span class="popup-value">${marginLabel}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">Voter Power</span>
        <span class="popup-value popup-vp" style="background:${vpColor}">${Math.round(race.voterPower)}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">Data Source</span>
        <span class="popup-value">${sourceLabel}</span>
      </div>
      <div class="popup-candidates"><em>Candidate info coming soon</em></div>
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
