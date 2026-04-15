import { useState, useEffect, useCallback } from 'react';
import Map from './components/Map.jsx';
import InfoBox from './components/InfoBox.jsx';
import { loadHouseRaces } from './utils/parseCSV.js';
import './App.css';

export default function App() {
  const [districtData, setDistrictData] = useState([]);
  const [hoveredGeoid, setHoveredGeoid] = useState(null);
  const [selectedGeoid, setSelectedGeoid] = useState(null);

  useEffect(() => {
    loadHouseRaces()
      .then(setDistrictData)
      .catch((err) => console.error('Failed to load CSV data:', err));
  }, []);

  const handleDistrictHover = useCallback((geoid) => {
    setHoveredGeoid(geoid);
  }, []);

  const handleDistrictSelect = useCallback((geoid) => {
    setSelectedGeoid(geoid);
  }, []);

  return (
    <div className="app">
      <Map
        districtData={districtData}
        hoveredGeoid={hoveredGeoid}
        selectedGeoid={selectedGeoid}
        onDistrictHover={handleDistrictHover}
        onDistrictSelect={handleDistrictSelect}
      />
      <InfoBox
        districtData={districtData}
        hoveredGeoid={hoveredGeoid}
        selectedGeoid={selectedGeoid}
        onDistrictHover={handleDistrictHover}
        onDistrictSelect={handleDistrictSelect}
      />
    </div>
  );
}
