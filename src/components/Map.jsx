import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getDistrictColor } from '../utils/districtUtils.js';
import './Map.css';

// Census TIGERweb: 119th Congressional Districts (layer 0)
// The API has a WAF that blocks large single requests; we paginate in batches of 25.
const CENSUS_BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query' +
  '?where=1%3D1&outFields=GEOID,STATE,CD119,NAME&f=geojson&outSR=4326&resultRecordCount=25';

async function fetchAllDistricts() {
  const features = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${CENSUS_BASE}&resultOffset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
    const json = await res.json();
    features.push(...(json.features ?? []));
    hasMore = json.exceededTransferLimit === true;
    offset += 25;
  }

  return { type: 'FeatureCollection', features };
}

function buildColorExpression(districtData) {
  // Build a Mapbox GL match expression to color each district by voter power
  const expr = ['match', ['get', 'GEOID']];
  for (const d of districtData) {
    if (d.geoid) {
      expr.push(d.geoid, getDistrictColor(d.voterPower));
    }
  }
  expr.push('#cbd5e1'); // default: no contest
  return expr;
}

export default function Map({
  districtData,
  hoveredGeoid,
  selectedGeoid,
  onDistrictHover,
  onDistrictSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Keep latest values accessible inside Mapbox event callbacks without
  // causing the effect to re-run and re-register listeners.
  const districtDataRef = useRef(districtData);
  const onHoverRef = useRef(onDistrictHover);
  const onSelectRef = useRef(onDistrictSelect);
  useEffect(() => { districtDataRef.current = districtData; }, [districtData]);
  useEffect(() => { onHoverRef.current = onDistrictHover; }, [onDistrictHover]);
  useEffect(() => { onSelectRef.current = onDistrictSelect; }, [onDistrictSelect]);

  // GEOID → Mapbox auto-generated integer feature ID (built when source loads)
  const geoidToFeatureId = useRef({});

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
        const geojson = await fetchAllDistricts();

        if (!geojson.features?.length) {
          throw new Error('No features returned from Census API');
        }

        // Build GEOID → feature-id lookup using the auto-generated IDs
        // (generateId: true assigns sequential integers starting at 0)
        geojson.features.forEach((f, idx) => {
          const geoid = f.properties?.GEOID;
          if (geoid) geoidToFeatureId.current[geoid] = idx;
        });

        map.addSource('districts', {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // Fill layer – colored by voter power
        map.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': '#cbd5e1',
            'fill-opacity': 0.75,
          },
        });

        // Border layer
        map.addLayer({
          id: 'districts-line',
          type: 'line',
          source: 'districts',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 0.6,
          },
        });

        // Hover highlight layer
        map.addLayer({
          id: 'districts-hover',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': '#1d4ed8',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hovered'], false],
              0.25,
              0,
            ],
          },
        });

        // Selected highlight layer
        map.addLayer({
          id: 'districts-selected',
          type: 'line',
          source: 'districts',
          paint: {
            'line-color': '#1d4ed8',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              2.5,
              0,
            ],
          },
        });

        // Apply color expression if data already loaded
        if (districtDataRef.current.length) {
          map.setPaintProperty(
            'districts-fill',
            'fill-color',
            buildColorExpression(districtDataRef.current)
          );
        }

        setIsMapReady(true);

        // ── Hover events ────────────────────────────────────────────────────
        let prevHoveredId = null;

        map.on('mousemove', 'districts-fill', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = e.features?.[0];
          if (!feature) return;

          if (prevHoveredId !== null && prevHoveredId !== feature.id) {
            map.setFeatureState({ source: 'districts', id: prevHoveredId }, { hovered: false });
          }
          prevHoveredId = feature.id;
          map.setFeatureState({ source: 'districts', id: feature.id }, { hovered: true });

          const geoid = feature.properties?.GEOID;
          const district = districtDataRef.current.find((d) => d.geoid === geoid);
          onHoverRef.current(district ? geoid : null);
        });

        map.on('mouseleave', 'districts-fill', () => {
          map.getCanvas().style.cursor = '';
          if (prevHoveredId !== null) {
            map.setFeatureState({ source: 'districts', id: prevHoveredId }, { hovered: false });
            prevHoveredId = null;
          }
          onHoverRef.current(null);
        });

        // ── Click / select events ────────────────────────────────────────────
        map.on('click', 'districts-fill', (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const geoid = feature.properties?.GEOID;
          const district = districtDataRef.current.find((d) => d.geoid === geoid);
          onSelectRef.current(district ? geoid : null);
        });

        // Click on empty area deselects
        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['districts-fill'] });
          if (!features.length) {
            onSelectRef.current(null);
          }
        });
      } catch (err) {
        console.error('Failed to load district boundaries:', err);
        setMapError(`Could not load district boundaries: ${err.message}`);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update fill colors when CSV data arrives ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !districtData.length) return;
    map.setPaintProperty(
      'districts-fill',
      'fill-color',
      buildColorExpression(districtData)
    );
  }, [districtData, isMapReady]);

  // ── Sync hovered district from InfoBox → map ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear all hover states
    Object.values(geoidToFeatureId.current).forEach((id) => {
      map.setFeatureState({ source: 'districts', id }, { hovered: false });
    });

    if (hoveredGeoid) {
      const fid = geoidToFeatureId.current[hoveredGeoid];
      if (fid !== undefined) {
        map.setFeatureState({ source: 'districts', id: fid }, { hovered: true });
      }
    }
  }, [hoveredGeoid, isMapReady]);

  // ── Sync selected district from InfoBox → map (zoom + popup) ─────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear all selected states
    Object.values(geoidToFeatureId.current).forEach((id) => {
      map.setFeatureState({ source: 'districts', id }, { selected: false });
    });

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!selectedGeoid) return;

    const fid = geoidToFeatureId.current[selectedGeoid];
    if (fid !== undefined) {
      map.setFeatureState({ source: 'districts', id: fid }, { selected: true });
    }

    const district = districtData.find((d) => d.geoid === selectedGeoid);
    if (!district) return;

    // Compute bounding box from the rendered features
    const features = map.querySourceFeatures('districts', {
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
        map.fitBounds(bounds, { padding: 120, maxZoom: 9, duration: 800 });

        const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

        const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat([centerLng, centerLat + (bounds[1][1] - bounds[0][1]) * 0.1])
          .setHTML(buildPopupHTML(district))
          .addTo(map);

        popup.on('close', () => {
          onSelectRef.current(null);
          popupRef.current = null;
        });

        popupRef.current = popup;
      }
    }
  }, [selectedGeoid, isMapReady]); // eslint-disable-line react-hooks/exhaustive-deps

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

function buildPopupHTML(district) {
  const vpColor = getDistrictColor(district.voterPower);
  const cookLabel =
    district.cookRating?.replace('toss-up', 'Toss-Up')
      .replace('lean-D', 'Lean Dem')
      .replace('lean-R', 'Lean Rep')
      .replace('likely-D', 'Likely Dem')
      .replace('likely-R', 'Likely Rep')
      .replace('solid-D', 'Solid Dem')
      .replace('solid-R', 'Solid Rep') ?? district.cookRating;

  const marginLabel =
    district.margin === 0
      ? 'Even'
      : district.margin > 0
      ? `+${district.margin} Dem`
      : `+${Math.abs(district.margin)} Rep`;

  return `
    <div class="map-popup">
      <div class="popup-title">${district.label}</div>
      <div class="popup-subtitle">${district.state}'s ${ordinal(district.districtNum)} Congressional District</div>
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
        <span class="popup-value popup-vp" style="background:${vpColor}">${Math.round(district.voterPower)}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">Data Source</span>
        <span class="popup-value">${district.source === 'cook' ? 'Cook Political Report proxy' : 'Polling average'}</span>
      </div>
      <div class="popup-candidates">
        <em>Candidate info coming soon</em>
      </div>
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
