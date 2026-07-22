import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Map from './components/Map.jsx';
import InfoBox from './components/InfoBox.jsx';
import LandingPage from './components/LandingPage.jsx';
import AboutPage from './components/AboutPage.jsx';
import {
  loadHouseRaces, loadSenateRaces, loadGovernorRaces,
  loadAGRaces, loadSOSRaces, loadJudicialRaces, loadBallotRaces,
  loadStateLegUpperRaces, loadStateLegLowerRaces, aggregateByState,
  loadCivicOrgs, loadPrimaryCalendar, loadUrbanicity,
} from './utils/parseCSV.js';
import { STATE_CENTROIDS, haversineDistance } from './utils/districtUtils.js';
import './App.css';

const RADIUS_HOUSE_MI = 200;
const RADIUS_STATE_MI = 450;

const STATEWIDE_TYPES = ['senate', 'governor', 'ag', 'sos', 'judicial', 'ballot'];

function findNearbyRaces(lat, lng, datasets, districtCentroids, sldUpperCentroids, sldLowerCentroids) {
  const nearby = [];

  for (const race of datasets.house) {
    const c = districtCentroids[race.geoid];
    if (!c) continue;
    const dist = haversineDistance(lat, lng, c[0], c[1]);
    if (dist <= RADIUS_HOUSE_MI) nearby.push({ ...race, distance: Math.round(dist) });
  }

  for (const type of STATEWIDE_TYPES) {
    for (const race of (datasets[type] ?? [])) {
      const c = STATE_CENTROIDS[race.state];
      if (!c) continue;
      const dist = haversineDistance(lat, lng, c[0], c[1]);
      if (dist <= RADIUS_STATE_MI) nearby.push({ ...race, distance: Math.round(dist) });
    }
  }

  for (const race of (datasets.state_leg_upper ?? [])) {
    const dc = sldUpperCentroids[race.geoid];
    const c = dc || STATE_CENTROIDS[race.state];
    if (!c) continue;
    const dist = haversineDistance(lat, lng, c[0], c[1]);
    const radius = dc ? RADIUS_HOUSE_MI : RADIUS_STATE_MI;
    if (dist <= radius) nearby.push({ ...race, distance: Math.round(dist) });
  }

  for (const race of (datasets.state_leg_lower ?? [])) {
    const dc = sldLowerCentroids[race.geoid];
    const c = dc || STATE_CENTROIDS[race.state];
    if (!c) continue;
    const dist = haversineDistance(lat, lng, c[0], c[1]);
    const radius = dc ? RADIUS_HOUSE_MI : RADIUS_STATE_MI;
    if (dist <= radius) nearby.push({ ...race, distance: Math.round(dist) });
  }

  return nearby.sort((a, b) => a.distance - b.distance || b.voterPower - a.voterPower);
}

function parseUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const lat = parseFloat(p.get('lat'));
  const lng = parseFloat(p.get('lng'));
  const place = p.get('place') ?? '';
  if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, placeName: place };
  return null;
}

const LAST_ADDRESS_KEY = 'voteMaximizer:lastAddress';

function saveLastAddress(address) {
  localStorage.setItem(LAST_ADDRESS_KEY, JSON.stringify(address));
}

function getLastAddress() {
  try {
    return JSON.parse(localStorage.getItem(LAST_ADDRESS_KEY));
  } catch {
    return null;
  }
}

export default function App() {
  const [houseData, setHouseData] = useState([]);
  const [senateData, setSenateData] = useState([]);
  const [governorData, setGovernorData] = useState([]);
  const [agData, setAgData] = useState([]);
  const [sosData, setSosData] = useState([]);
  const [judicialData, setJudicialData] = useState([]);
  const [ballotData, setBallotData] = useState([]);
  const [stateLegUpperData, setStateLegUpperData] = useState([]);
  const [stateLegLowerData, setStateLegLowerData] = useState([]);

  const [activeTab, setActiveTab] = useState('top');
  const [hoveredGeoid, setHoveredGeoid] = useState(null);
  const [selectedGeoid, setSelectedGeoid] = useState(null);

  const urlParams = parseUrlParams();
  const initialSearch = urlParams ?? getLastAddress();
  const [showLanding, setShowLanding] = useState(!initialSearch);
  const [showAbout, setShowAbout] = useState(false);

  // "My Area" state
  const [nearbyRaces, setNearbyRaces] = useState(null);
  const [searchPlaceName, setSearchPlaceName] = useState('');
  const [searchCoords, setSearchCoords] = useState(null);
  const [searchCenter, setSearchCenter] = useState(null);
  const [districtCentroids, setDistrictCentroids] = useState({});
  const [sldUpperCentroids, setSldUpperCentroids] = useState({});
  const [sldLowerCentroids, setSldLowerCentroids] = useState({});

  // Top Contests hover preview (map layer override)
  const [previewRace, setPreviewRace] = useState(null);
  const [topContestType, setTopContestType] = useState('house');
  const [mapResetTrigger, setMapResetTrigger] = useState(0);

  const [civicOrgs, setCivicOrgs] = useState([]);
  const [primaryCalendar, setPrimaryCalendar] = useState([]);

  useEffect(() => {
    Promise.all([
      loadHouseRaces(), loadSenateRaces(), loadGovernorRaces(),
      loadAGRaces(), loadSOSRaces(), loadJudicialRaces(),
      loadBallotRaces(), loadStateLegUpperRaces(), loadStateLegLowerRaces(),
      loadUrbanicity(),
    ]).then(([house, senate, gov, ag, sos, judicial, ballot, legUpper, legLower, urbanicity]) => {
      house = house.map((r) => ({ ...r, ...urbanicity[r.geoid] }));
      setHouseData(house);
      setSenateData(senate);
      setGovernorData(gov);
      setAgData(ag);
      setSosData(sos);
      setJudicialData(judicial);
      setBallotData(ballot);
      setStateLegUpperData(legUpper);
      setStateLegLowerData(legLower);
    }).catch((err) => console.error('Failed to load data:', err));

    Promise.all([loadCivicOrgs(), loadPrimaryCalendar()])
      .then(([orgs, primaries]) => { setCivicOrgs(orgs); setPrimaryCalendar(primaries); })
      .catch((err) => console.warn('Failed to load civic/primary data:', err));
  }, []);

  const allDatasets = useMemo(() => ({
    house: houseData, senate: senateData, governor: governorData,
    ag: agData, sos: sosData, judicial: judicialData,
    ballot: ballotData, state_leg_upper: stateLegUpperData, state_leg_lower: stateLegLowerData,
  }), [houseData, senateData, governorData, agData, sosData, judicialData, ballotData, stateLegUpperData, stateLegLowerData]);

  // raceData for the current InfoBox list (not the map)
  const raceData = useMemo(() => {
    switch (activeTab) {
      case 'senate':          return senateData;
      case 'governor':        return governorData;
      case 'ag':              return agData;
      case 'sos':             return sosData;
      case 'judicial':        return judicialData;
      case 'ballot':          return ballotData;
      case 'state_leg_upper': return stateLegUpperData;
      case 'state_leg_lower': return stateLegLowerData;
      default:                return houseData;
    }
  }, [activeTab, houseData, senateData, governorData, agData, sosData, judicialData, ballotData, stateLegUpperData, stateLegLowerData]);

  // Map layer + data, accounting for preview override
  const { mapTab, mapRaceData } = useMemo(() => {
    if (previewRace) {
      const { raceType } = previewRace;
      const data = allDatasets[raceType] ?? houseData;
      if (raceType === 'state_leg_upper') return { mapTab: 'sld_upper', mapRaceData: data };
      if (raceType === 'state_leg_lower') return { mapTab: 'sld_lower', mapRaceData: data };
      if (raceType === 'house') return { mapTab: 'house', mapRaceData: data };
      return { mapTab: 'state', mapRaceData: aggregateByState(data) };
    }
    if (activeTab === 'top') {
      const data = allDatasets[topContestType] ?? houseData;
      const aggregated = topContestType === 'house' ? data : aggregateByState(data);
      return { mapTab: topContestType === 'house' ? 'house' : 'state', mapRaceData: aggregated };
    }
    switch (activeTab) {
      case 'house':           return { mapTab: 'house',  mapRaceData: houseData };
      case 'senate':          return { mapTab: 'state',  mapRaceData: senateData };
      case 'governor':        return { mapTab: 'state',  mapRaceData: governorData };
      case 'ag':              return { mapTab: 'state',  mapRaceData: agData };
      case 'sos':             return { mapTab: 'state',  mapRaceData: sosData };
      case 'judicial':        return { mapTab: 'state',  mapRaceData: judicialData };
      case 'ballot':          return { mapTab: 'state',  mapRaceData: ballotData };
      case 'state_leg_upper': return { mapTab: 'sld_upper', mapRaceData: stateLegUpperData };
      case 'state_leg_lower': return { mapTab: 'sld_lower', mapRaceData: stateLegLowerData };
      default:                return { mapTab: 'house',  mapRaceData: houseData };
    }
  }, [previewRace, activeTab, topContestType, allDatasets, houseData, senateData, governorData, agData, sosData, judicialData, ballotData, stateLegUpperData, stateLegLowerData]);

  const previewCenter = useMemo(() => {
    if (!previewRace) return null;
    const { race, raceType } = previewRace;
    if (raceType === 'house') {
      const c = districtCentroids[race.geoid];
      return c ? [c[1], c[0]] : null;
    }
    const c = STATE_CENTROIDS[race.state];
    return c ? [c[1], c[0]] : null;
  }, [previewRace, districtCentroids]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setHoveredGeoid(null);
    setSelectedGeoid(null);
    setPreviewRace(null);
    setMapResetTrigger((n) => n + 1);
  }, []);

  const handleHover = useCallback((geoid) => setHoveredGeoid(geoid), []);
  const handleSelect = useCallback((geoid) => setSelectedGeoid(geoid), []);

  const handleLocationSearch = useCallback(({ lat, lng, placeName }) => {
    const nearby = findNearbyRaces(lat, lng, allDatasets, districtCentroids, sldUpperCentroids, sldLowerCentroids);
    setNearbyRaces(nearby);
    setSearchPlaceName(placeName ?? '');
    setSearchCoords({ lat, lng });
    setActiveTab('nearby');
    setHoveredGeoid(null);
    setSelectedGeoid(null);
    setSearchCenter([lng, lat]);
    saveLastAddress({ lat, lng, placeName });
  }, [allDatasets, districtCentroids, sldUpperCentroids, sldLowerCentroids]);

  // Auto-trigger nearby search from URL params (or last saved address) after data loads
  const initialSearchRef = useRef(initialSearch);
  const didAutoSearch = useRef(false);
  useEffect(() => {
    if (didAutoSearch.current || !initialSearchRef.current) return;
    if (!houseData.length) return;
    didAutoSearch.current = true;
    handleLocationSearch(initialSearchRef.current);
  }, [houseData, handleLocationSearch]);

  const handleDistrictCentroidsReady = useCallback((centroids) => {
    setDistrictCentroids(centroids);
  }, []);

  const handleSldCentroidsReady = useCallback((mapTab, centroids) => {
    if (mapTab === 'sld_upper') setSldUpperCentroids((prev) => ({ ...prev, ...centroids }));
    else if (mapTab === 'sld_lower') setSldLowerCentroids((prev) => ({ ...prev, ...centroids }));
  }, []);

  const handleClearNearby = useCallback(() => {
    setNearbyRaces(null);
    setSearchCoords(null);
    setActiveTab('top');
    setHoveredGeoid(null);
    setSelectedGeoid(null);
  }, []);

  const handleRacePreview = useCallback((preview) => {
    if (!preview) { setPreviewRace(null); return; }
    const { race, raceType, select } = preview;
    setPreviewRace({ race, raceType });
    if (select) {
      setPreviewRace(null);
      handleTabChange(raceType);
      setSelectedGeoid(race.geoid);
    }
  }, [handleTabChange]);

  const shareUrl = searchCoords
    ? `${window.location.origin}${window.location.pathname}?lat=${searchCoords.lat.toFixed(4)}&lng=${searchCoords.lng.toFixed(4)}&place=${encodeURIComponent(searchPlaceName)}`
    : null;

  const mapHoveredGeoid = previewRace ? previewRace.race.geoid : hoveredGeoid;

  return (
    <>
      <div className="app">
        <Map
          raceData={mapRaceData}
          tab={mapTab}
          hoveredGeoid={mapHoveredGeoid}
          selectedGeoid={selectedGeoid}
          previewCenter={previewCenter}
          searchCenter={searchCenter}
          resetViewTrigger={mapResetTrigger}
          onRaceHover={handleHover}
          onRaceSelect={handleSelect}
          onLocationSearch={handleLocationSearch}
          onDistrictCentroidsReady={handleDistrictCentroidsReady}
          onSldCentroidsReady={handleSldCentroidsReady}
        />
        <InfoBox
          raceData={raceData}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hoveredGeoid={hoveredGeoid}
          selectedGeoid={selectedGeoid}
          onRaceHover={handleHover}
          onRaceSelect={handleSelect}
          nearbyRaces={nearbyRaces}
          searchPlaceName={searchPlaceName}
          shareUrl={shareUrl}
          onClearNearby={handleClearNearby}
          onAbout={() => setShowAbout(true)}
          allData={allDatasets}
          onRacePreview={handleRacePreview}
          onTopTypeChange={setTopContestType}
          civicOrgs={civicOrgs}
          primaryCalendar={primaryCalendar}
        />
      </div>

      {showLanding && (
        <LandingPage
          onDismiss={() => setShowLanding(false)}
          onSearch={(result) => { handleLocationSearch(result); setShowLanding(false); }}
          onAbout={() => { setShowLanding(false); setShowAbout(true); }}
        />
      )}

      {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}
    </>
  );
}
