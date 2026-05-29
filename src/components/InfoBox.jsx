import { useState } from 'react';
import DistrictCard from './DistrictCard.jsx';
import ContestDetail from './ContestDetail.jsx';
import { COOK_CONFIG, getDistrictColor } from '../utils/districtUtils.js';
import './InfoBox.css';

const RACE_TYPE_LABELS = {
  house: 'House', senate: 'Senate', governor: 'Gov',
  ag: 'AG', sos: 'SoS', judicial: 'Court',
  ballot: 'Ballot', state_leg_upper: 'St. Sen', state_leg_lower: 'St. House',
};

const ALL_TABS = [
  { id: 'top',             label: '🏆 Top Contests' },
  { id: 'house',           label: 'US House' },
  { id: 'senate',          label: 'Senate' },
  { id: 'governor',        label: 'Governor' },
  { id: 'state_leg_upper', label: 'State Senate' },
  { id: 'state_leg_lower', label: 'State House' },
  { id: 'ag',              label: 'Atty General' },
  { id: 'sos',             label: 'Sec. of State' },
  { id: 'judicial',        label: 'Judicial' },
  { id: 'ballot',          label: 'Ballot' },
];

const TOP_TYPES = [
  { id: 'house',    label: 'US House' },
  { id: 'senate',   label: 'Senate' },
  { id: 'governor', label: 'Governor' },
  { id: 'ag',       label: 'Atty General' },
  { id: 'sos',      label: 'Sec. of State' },
  { id: 'ballot',   label: 'Ballot' },
];

function NearbyCard({ race, isHovered, isSelected, onHover, onLeave, onClick }) {
  const cfg = COOK_CONFIG[race.cookRating] ?? { label: race.cookRating, color: '#475569', bg: '#f1f5f9' };
  const vpColor = getDistrictColor(race.voterPower);
  return (
    <div
      className={`district-card nearby-card ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div className="card-info" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="card-label">{race.label}</span>
          <span className="nearby-type-badge">{RACE_TYPE_LABELS[race.raceType] ?? race.raceType}</span>
        </div>
        <div className="card-state">{race.state} · {race.distance} mi</div>
      </div>
      <span className="card-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
      <div className="card-vp">
        <div className="vp-bar-track">
          <div className="vp-bar-fill" style={{ width: `${Math.round(race.voterPower)}%`, background: vpColor }} />
        </div>
        <span className="vp-score">{Math.round(race.voterPower)}</span>
      </div>
    </div>
  );
}

const COOK_PRIORITY = { 'toss-up': 0, 'lean-D': 1, 'lean-R': 1, 'likely-D': 2, 'likely-R': 2, 'solid-D': 3, 'solid-R': 3 };

function cookPriority(r) { return COOK_PRIORITY[r.cookRating] ?? 4; }

function TopContestsPane({ allData, onRacePreview, onTopTypeChange }) {
  const [topType, setTopType] = useState('house');

  function switchType(t) {
    setTopType(t);
    onTopTypeChange?.(t);
  }

  const top10 = (allData?.[topType] ?? [])
    .slice()
    .sort((a, b) => b.voterPower - a.voterPower || cookPriority(a) - cookPriority(b))
    .slice(0, 10);

  return (
    <div className="tc-pane">
      <div className="tc-type-tabs">
        {TOP_TYPES.map((t) => (
          <button
            key={t.id}
            className={`tc-type-btn ${topType === t.id ? 'tc-type-btn--active' : ''}`}
            onClick={() => switchType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tc-list">
        {top10.length === 0 ? (
          <div className="tc-empty">Loading…</div>
        ) : (
          top10.map((race, idx) => {
            const cfg = COOK_CONFIG[race.cookRating] ?? { label: race.cookRating, color: '#475569', bg: '#f1f5f9' };
            const vpColor = getDistrictColor(race.voterPower);
            const vp = Math.round(race.voterPower);
            return (
              <div
                key={`${topType}-${idx}`}
                className="tc-entry"
                onMouseEnter={() => onRacePreview?.({ race, raceType: topType })}
                onMouseLeave={() => onRacePreview?.(null)}
                onClick={() => onRacePreview?.({ race, raceType: topType, select: true })}
              >
                <div className="tc-entry-header">
                  <span className="tc-rank">#{idx + 1}</span>
                  <div className="tc-title-block">
                    <span className="tc-label">{race.label}</span>
                    <span className="tc-sublabel">{race.state}</span>
                  </div>
                  <span className="tc-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  <div className="tc-vp-block">
                    <div className="tc-vp-track">
                      <div className="tc-vp-fill" style={{ width: `${vp}%`, background: vpColor }} />
                    </div>
                    <span className="tc-vp-score" style={{ color: vpColor }}>{vp}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function extractCounty(placeName) {
  if (!placeName) return null;
  const m = placeName.match(/([^,]+County)/);
  return m ? m[1].trim() : null;
}

export default function InfoBox({
  raceData,
  activeTab,
  onTabChange,
  hoveredGeoid,
  selectedGeoid,
  onRaceHover,
  onRaceSelect,
  nearbyRaces,
  searchPlaceName,
  shareUrl,
  onClearNearby,
  onAbout,
  allData,
  onRacePreview,
  onTopTypeChange,
  civicOrgs,
  primaryCalendar,
}) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const columnLabel = activeTab === 'house' ? 'District' : 'State';

  const visibleTabs = nearbyRaces
    ? [{ id: 'nearby', label: '📍 My Area' }, ...ALL_TABS]
    : ALL_TABS;

  const selectedRace = selectedGeoid
    ? (activeTab === 'nearby' ? nearbyRaces : raceData)?.find((r) => r.geoid === selectedGeoid)
    : null;

  const userCounty = extractCounty(searchPlaceName);

  return (
    <div className="info-box">
      {/* ── Fixed left header panel ─────────────────────────────────────── */}
      <div className="info-header">
        <div className="info-header-top">
          <h1 className="info-title">Vote Maximizer 2026</h1>
          <p className="info-subtitle">
            Maximize the impact of your canvassing and donations.{' '}
            <button className="info-about-btn" onClick={onAbout}>Learn more about Vote Maximizer.</button>
          </p>
        </div>

        <div className="info-description">
          <p className="info-desc-body">
            Vote Maximizer uses mathematical modeling to calculate where a single vote — or a donation,
            or a canvassing shift — can make the biggest difference. The races that score highest are
            the contests so close that a handful of votes could change the winner.
          </p>
          <p className="info-desc-body">
            Use the tool to find where your time and money will have the most impact. And because close
            races are also the ones most vulnerable to suppression and misinformation, you're not just
            maximizing your impact — you're helping defend democracy where it counts.
          </p>
        </div>

        <div className="info-header-bottom">
          <div className="info-links">
            <a href="#api-docs" className="info-api-link" onClick={(e) => e.preventDefault()}>
              Use Vote Maximizer data with our API →
            </a>
          </div>
          <div className="info-org">
            A project by{' '}
            <a href="https://electoral-lab.org" target="_blank" rel="noopener noreferrer">
              the Electoral Innovation Lab
            </a>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="district-list">
        {/* Scrollable tab bar */}
        <div className="race-tabs">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
          {nearbyRaces && (
            <button className="tab-clear-btn" onClick={onClearNearby} title="Clear location search">✕</button>
          )}
        </div>

        {/* ── Top Contests tab ──────────────────────────────────────────── */}
        {activeTab === 'top' && (
          <TopContestsPane allData={allData} onRacePreview={onRacePreview} onTopTypeChange={onTopTypeChange} />
        )}

        {/* ── My Area tab ───────────────────────────────────────────────── */}
        {activeTab === 'nearby' && nearbyRaces && (
          selectedRace ? (
            <ContestDetail
              race={selectedRace}
              allRaces={nearbyRaces}
              activeTab={activeTab}
              onBack={() => onRaceSelect(null)}
              onSelect={onRaceSelect}
              civicOrgs={civicOrgs}
              primaryCalendar={primaryCalendar}
              userCounty={userCounty}
            />
          ) : (
            <>
              <div className="list-header">
                <span className="lh-rank">#</span>
                <span className="lh-district">
                  {searchPlaceName ? `Near ${searchPlaceName.split(',')[0]}` : 'Nearby contests'}
                </span>
                <span className="lh-cook">Cook</span>
                <span className="lh-vp">Voter Power</span>
                {shareUrl && (
                  <button className="tab-share-btn" onClick={handleShare} title="Copy shareable link">
                    {copied ? '✓ Copied' : '⤴ Share'}
                  </button>
                )}
              </div>
              {nearbyRaces.length === 0 ? (
                <div className="list-loading">No competitive contests found within range.</div>
              ) : (
                nearbyRaces.map((race) => (
                  <NearbyCard
                    key={`${race.raceType}-${race.label}`}
                    race={race}
                    isHovered={hoveredGeoid === race.geoid}
                    isSelected={selectedGeoid === race.geoid}
                    onHover={() => onRacePreview?.({ race, raceType: race.raceType })}
                    onLeave={() => onRacePreview?.(null)}
                    onClick={() => onRaceSelect(selectedGeoid === race.geoid ? null : race.geoid)}
                  />
                ))
              )}
            </>
          )
        )}

        {/* ── Race list tabs ────────────────────────────────────────────── */}
        {activeTab !== 'top' && activeTab !== 'nearby' && (
          raceData.length === 0 ? (
            <div className="list-loading">Loading data…</div>
          ) : selectedRace ? (
            <ContestDetail
              race={selectedRace}
              allRaces={raceData}
              activeTab={activeTab}
              onBack={() => onRaceSelect(null)}
              onSelect={onRaceSelect}
              civicOrgs={civicOrgs}
              primaryCalendar={primaryCalendar}
              userCounty={userCounty}
            />
          ) : (
            <>
              <div className="list-header">
                <span className="lh-rank">#</span>
                <span className="lh-district">{columnLabel}</span>
                <span className="lh-cook">Cook Rating</span>
                <span className="lh-vp">Voter Power</span>
              </div>
              {raceData.map((race, idx) => (
                <DistrictCard
                  key={`${race.raceType}-${race.geoid}-${idx}`}
                  district={race}
                  rank={idx + 1}
                  isHovered={hoveredGeoid === race.geoid}
                  isSelected={selectedGeoid === race.geoid}
                  onHover={() => onRaceHover(race.geoid)}
                  onLeave={() => onRaceHover(null)}
                  onClick={() => onRaceSelect(selectedGeoid === race.geoid ? null : race.geoid)}
                />
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}
