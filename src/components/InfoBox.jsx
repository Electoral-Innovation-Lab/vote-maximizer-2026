import DistrictCard from './DistrictCard.jsx';
import ContestDetail from './ContestDetail.jsx';
import './InfoBox.css';

const TABS = [
  { id: 'house', label: 'US House' },
  { id: 'senate', label: 'Senate' },
  { id: 'governor', label: 'Governor' },
];

export default function InfoBox({
  raceData,
  activeTab,
  onTabChange,
  hoveredGeoid,
  selectedGeoid,
  onRaceHover,
  onRaceSelect,
}) {
  const columnLabel = activeTab === 'house' ? 'District' : 'State';
  const selectedRace = selectedGeoid ? raceData.find((r) => r.geoid === selectedGeoid) : null;

  return (
    <div className="info-box">
      {/* ── Fixed left header panel ─────────────────────────────────────── */}
      <div className="info-header">
        <div>
          <h1 className="info-title">Vote Maximizer 2026</h1>
          <p className="info-subtitle">
            Where does a single vote have the most power in 2026 elections?
          </p>
        </div>

        <div className="info-links">
          <a
            href="#api-docs"
            className="info-api-link"
            onClick={(e) => e.preventDefault()}
          >
            Use Vote Maximizer data with our API
          </a>
        </div>

        <div className="info-org">
          A project by{' '}
          <a
            href="https://electoral-lab.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            the Electoral Innovation Lab
          </a>
        </div>
      </div>

      {/* ── Right panel: tabs + list or detail ─────────────────────────── */}
      <div className="district-list">
        {/* Tab bar — always visible */}
        <div className="race-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {raceData.length === 0 ? (
          <div className="list-loading">Loading data…</div>
        ) : selectedRace ? (
          /* ── Detail / compare panel ── */
          <ContestDetail
            race={selectedRace}
            allRaces={raceData}
            activeTab={activeTab}
            onBack={() => onRaceSelect(null)}
            onSelect={onRaceSelect}
          />
        ) : (
          /* ── Ranked list ── */
          <>
            <div className="list-header">
              <span className="lh-rank">#</span>
              <span className="lh-district">{columnLabel}</span>
              <span className="lh-cook">Cook Rating</span>
              <span className="lh-vp">Voter Power</span>
            </div>

            {raceData.map((race, idx) => (
              <DistrictCard
                key={race.geoid ?? race.label}
                district={race}
                rank={idx + 1}
                isHovered={hoveredGeoid === race.geoid}
                isSelected={selectedGeoid === race.geoid}
                onHover={() => onRaceHover(race.geoid)}
                onLeave={() => onRaceHover(null)}
                onClick={() =>
                  onRaceSelect(selectedGeoid === race.geoid ? null : race.geoid)
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
