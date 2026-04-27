import { useState, useEffect, useCallback } from 'react';
import Map from './components/Map.jsx';
import InfoBox from './components/InfoBox.jsx';
import { loadHouseRaces, loadSenateRaces, loadGovernorRaces } from './utils/parseCSV.js';
import './App.css';

export default function App() {
  const [houseData, setHouseData] = useState([]);
  const [senateData, setSenateData] = useState([]);
  const [governorData, setGovernorData] = useState([]);
  const [activeTab, setActiveTab] = useState('house');
  const [hoveredGeoid, setHoveredGeoid] = useState(null);
  const [selectedGeoid, setSelectedGeoid] = useState(null);

  useEffect(() => {
    Promise.all([loadHouseRaces(), loadSenateRaces(), loadGovernorRaces()])
      .then(([house, senate, governor]) => {
        setHouseData(house);
        setSenateData(senate);
        setGovernorData(governor);
      })
      .catch((err) => console.error('Failed to load CSV data:', err));
  }, []);

  const raceData =
    activeTab === 'senate' ? senateData :
    activeTab === 'governor' ? governorData :
    houseData;

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setHoveredGeoid(null);
    setSelectedGeoid(null);
  }, []);

  const handleHover = useCallback((geoid) => {
    setHoveredGeoid(geoid);
  }, []);

  const handleSelect = useCallback((geoid) => {
    setSelectedGeoid(geoid);
  }, []);

  return (
    <div className="app">
      <Map
        raceData={raceData}
        tab={activeTab}
        hoveredGeoid={hoveredGeoid}
        selectedGeoid={selectedGeoid}
        onRaceHover={handleHover}
        onRaceSelect={handleSelect}
      />
      <InfoBox
        raceData={raceData}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hoveredGeoid={hoveredGeoid}
        selectedGeoid={selectedGeoid}
        onRaceHover={handleHover}
        onRaceSelect={handleSelect}
      />
    </div>
  );
}
