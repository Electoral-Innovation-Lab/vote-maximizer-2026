import { useState, useRef, useEffect } from 'react';
import DistrictCard from './DistrictCard.jsx';
import ContestDetail from './ContestDetail.jsx';
import { COOK_CONFIG, getDistrictColor, STATE_CENTROIDS, haversineDistance } from '../utils/districtUtils.js';
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

const PRIMARY_COL = {
  house: 'hasHouse', senate: 'hasSenate', governor: 'hasGovernor',
  state_leg_upper: 'hasStateLeg', state_leg_lower: 'hasStateLeg',
};

function getPrimaryBadge(primaryCalendar, race) {
  if (!primaryCalendar?.length) return null;
  const entry = primaryCalendar.find((p) => p.state === race.state);
  if (!entry) return null;
  const col = PRIMARY_COL[race.raceType];
  const hasPrimary = col ? entry[col] : (entry.hasHouse || entry.hasSenate || entry.hasGovernor || entry.hasStateLeg);
  if (!hasPrimary) return null;
  const date = new Date(entry.primaryDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (isNaN(date) || date < today) return null;
  return { date: entry.primaryDate, type: entry.primaryType };
}

// ── Action Pane (left panel when a race is selected) ──────────────────────────
const NEARBY_HIGHER_MI = 500;

function ActionPane({ race, civicOrgs, primaryCalendar, partiesData, allRaces, allData, onSelect }) {
  const [orgsExpanded, setOrgsExpanded] = useState(false);
  const primaryBadge = getPrimaryBadge(primaryCalendar, race);
  const isHighVP = race.voterPower >= 70;

  // All orgs relevant to this state: national (state === 'All' or null) + exact state match
  const relevantOrgs = (civicOrgs ?? []).filter((o) =>
    !o.state || o.state === 'All' || o.state === race.state
  );

  const parties = (partiesData ?? [])
    .filter((p) => p.state === race.state)
    .map((p) => ({
      name: `${p.affiliation === 'Democratic' ? 'Democratic' : 'Republican'} State Party`,
      url: p.url,
    }));

  const hasCandidateLinks = race.dLink || race.rLink;

  // Distance-weighted nearby higher-impact races (closer = better, then VP as tiebreaker)
  const currentCentroid = STATE_CENTROIDS[race.state];
  const combinedRaces = allData ? Object.values(allData).flat() : (allRaces ?? []);
  const higherVpRaces = !isHighVP && currentCentroid
    ? combinedRaces
        .reduce((acc, r) => {
          if (r.geoid === race.geoid || r.voterPower <= race.voterPower) return acc;
          if (r.raceType === 'ballot') return acc;
          const c = STATE_CENTROIDS[r.state];
          if (!c) return acc;
          const dist = haversineDistance(currentCentroid[0], currentCentroid[1], c[0], c[1]);
          if (dist > NEARBY_HIGHER_MI) return acc;
          const score = 0.7 * (1 - dist / NEARBY_HIGHER_MI) + 0.3 * (r.voterPower / 100);
          acc.push({ ...r, _dist: Math.round(dist), _score: score });
          return acc;
        }, [])
        .sort((a, b) => b._score - a._score)
        .slice(0, 5)
    : [];

  return (
    <div className="action-pane">
      <div className="action-race-header">
        <div className="action-race-main">
          <span className="action-race-label">{race.label}</span>
          <span className="action-race-state">{race.state}</span>
          <span className="action-race-type">{race.race}</span>
        </div>
        <div className="action-vp-pill" style={{ background: getDistrictColor(race.voterPower) }}>
          <span className="action-vp-num">{Math.round(race.voterPower)}</span>
          <span className="action-vp-label-sm">VP</span>
        </div>
      </div>

      {!isHighVP && higherVpRaces.length > 0 && (
        <div className="action-section action-section--callout">
          <div className="action-section-label action-section-label--callout">Higher-Impact Races Nearby</div>
          <p className="action-section-body">
            Consider also taking action in these higher-impact races within driving distance.
          </p>
          <div className="action-higher-list">
            {higherVpRaces.map((r) => (
              <button
                key={r.geoid}
                className="action-higher-card"
                onClick={() => onSelect?.(r.geoid)}
              >
                <div className="action-higher-info">
                  <span className="action-higher-label">{r.label}</span>
                  <span className="action-higher-state">{r.state} · {r._dist} mi</span>
                </div>
                <span className="action-higher-vp" style={{ color: getDistrictColor(r.voterPower) }}>
                  {Math.round(r.voterPower)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="action-sections">
        <div className="action-section">
          <div className="action-section-label">Democracy Moneyball</div>
          {primaryBadge && (
            <div className="action-primary-badge">
              Primary: {primaryBadge.date} · {primaryBadge.type}
            </div>
          )}
          <p className="action-section-body">
            {isHighVP
              ? 'This is a high-impact race. A small donation goes directly where it matters most.'
              : 'In a close race, small donations shift real resources to where they are most needed.'}
          </p>
          {hasCandidateLinks ? (
            <div className="action-cta-links">
              {race.dLink && (
                <a href={race.dLink} target="_blank" rel="noopener noreferrer" className="action-cta-link action-cta--d">
                  Donate to {race.dCandidate ?? 'Dem. candidate'} →
                </a>
              )}
              {race.rLink && (
                <a href={race.rLink} target="_blank" rel="noopener noreferrer" className="action-cta-link action-cta--r">
                  Donate to {race.rCandidate ?? 'Rep. candidate'} →
                </a>
              )}
            </div>
          ) : (
            <p className="action-section-note">Search this race on ActBlue, WinRed, or the candidate's website.</p>
          )}
        </div>

        <div className="action-section">
          <div className="action-section-label">Election Hotspots</div>
          <p className="action-section-body">
            {isHighVP
              ? 'Canvass, phone bank, or text bank for a campaign here. In a high-impact contest, volunteer shifts directly change outcomes.'
              : 'Volunteering in a higher-impact race nearby will have more effect, but every contact in this race counts.'}
          </p>
          {parties.length > 0 && (
            <div className="action-cta-links">
              {parties.map((p) => (
                <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="action-cta-link">
                  {p.name} →
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="action-section">
          <div className="action-section-label">Election Protection</div>
          <p className="action-section-body">
            {isHighVP
              ? 'Close races are where election integrity matters most. Volunteer as a poll worker or observer to protect this race.'
              : 'Protect democracy by serving as a poll worker or joining a local civic organization.'}
          </p>
          {relevantOrgs.length > 0 && (
            <div className="action-cta-links">
              {(orgsExpanded ? relevantOrgs : relevantOrgs.slice(0, 2)).map((o) => (
                <a key={o.url} href={o.url} target="_blank" rel="noopener noreferrer" className="action-cta-link">
                  {o.name} →
                </a>
              ))}
              {relevantOrgs.length > 2 && (
                <button className="action-org-more" onClick={() => setOrgsExpanded((v) => !v)}>
                  {orgsExpanded
                    ? 'Show fewer ▴'
                    : `See ${relevantOrgs.length - 2} more organization${relevantOrgs.length - 2 > 1 ? 's' : ''} ▾`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Default left panel description ────────────────────────────────────────────
function DescriptionPane() {
  return (
    <div className="info-description">
      <p className="info-intro-text">Click any district on the map to see your path to action.</p>
      <p className="info-vp-desc">
        Each contest is scored by <strong>Voter Power</strong> — how much your vote, donation, or volunteer shift can influence the outcome. Higher scores mean higher leverage. Use these scores to find where your civic engagement goes furthest.
      </p>
      <div className="info-desc-section">
        <span className="info-desc-heading">Democracy Moneyball</span>
        <p className="info-desc-body">Find the races where your dollar goes furthest. In a close contest, $50 shifts real campaign resources where they're needed most.</p>
      </div>
      <div className="info-desc-section">
        <span className="info-desc-heading">Election Hotspots</span>
        <p className="info-desc-body">Canvass where it counts. High-scoring races are where a weekend shift can actually change the outcome — door-knocking, phone banking, or text banking.</p>
      </div>
      <div className="info-desc-section">
        <span className="info-desc-heading">Election Protection</span>
        <p className="info-desc-body">Close races are where election integrity matters most. Serve as a poll worker, join a local organization, and protect the vote where it counts.</p>
      </div>
    </div>
  );
}

// ── NearbyCard ────────────────────────────────────────────────────────────────
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
      {race.cookRating && (
        <span className="card-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
      )}
      <div className="card-vp">
        <div className="vp-bar-track">
          <div className="vp-bar-fill" style={{ width: `${Math.round(race.voterPower)}%`, background: vpColor }} />
        </div>
        <span className="vp-score">{Math.round(race.voterPower)}</span>
      </div>
    </div>
  );
}

const COOK_ORDER = ['toss-up', 'lean-D', 'lean-R', 'likely-D', 'likely-R', 'solid-D', 'solid-R', 'retention', 'nonpartisan'];
const COOK_PRIORITY = Object.fromEntries(COOK_ORDER.map((rating, i) => [rating, i]));
function cookPriority(r) { return COOK_PRIORITY[r.cookRating] ?? COOK_ORDER.length; }

function sortRaces(races, sortBy, vpDir, cookDir) {
  const sorted = races.slice();
  if (sortBy === 'cook') {
    sorted.sort((a, b) => {
      const diff = cookPriority(a) - cookPriority(b);
      return (cookDir === 'desc' ? -diff : diff) || b.voterPower - a.voterPower;
    });
  } else {
    sorted.sort((a, b) => (vpDir === 'asc' ? a.voterPower - b.voterPower : b.voterPower - a.voterPower));
  }
  return sorted;
}

function withCookHeaders(sortedRaces) {
  const items = [];
  let lastRating = undefined;
  sortedRaces.forEach((race, idx) => {
    if (race.cookRating !== lastRating) {
      const label = COOK_CONFIG[race.cookRating]?.label ?? 'Unrated';
      items.push({ type: 'header', key: `hdr-${race.cookRating ?? 'unrated'}`, label });
      lastRating = race.cookRating;
    }
    items.push({ type: 'race', race, idx });
  });
  return items;
}

function buildListItems(races, sortBy, vpDir, cookDir) {
  const sorted = sortRaces(races, sortBy, vpDir, cookDir);
  if (sortBy !== 'cook') return sorted.map((race, idx) => ({ type: 'race', race, idx }));
  return withCookHeaders(sorted);
}

// ── TopContestsPane ───────────────────────────────────────────────────────────
function TopContestsPane({ allData, onRacePreview, onTopTypeChange }) {
  const [topType, setTopType] = useState('house');
  const [sortBy, setSortBy] = useState('voterPower');
  const [vpDir, setVpDir] = useState('desc');
  const [cookDir, setCookDir] = useState('asc');

  function switchType(t) { setTopType(t); onTopTypeChange?.(t); }

  function handleVpSortClick() {
    if (sortBy === 'voterPower') setVpDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy('voterPower');
  }

  function handleCookSortClick() {
    if (sortBy === 'cook') setCookDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortBy('cook');
  }

  const top10Fixed = (allData?.[topType] ?? [])
    .slice()
    .sort((a, b) => b.voterPower - a.voterPower || cookPriority(a) - cookPriority(b))
    .slice(0, 10)
    .map((race, i) => ({ ...race, _topRank: i + 1 }));

  const orderedTop10 = sortRaces(top10Fixed, sortBy, vpDir, cookDir);
  const top10Items = sortBy === 'cook'
    ? withCookHeaders(orderedTop10)
    : orderedTop10.map((race, idx) => ({ type: 'race', race, idx }));

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
      <div className="list-header">
        <span className="lh-rank">#</span>
        <span className="lh-district">Top 10</span>
        <button
          className={`lh-cook lh-sort-btn ${sortBy === 'cook' ? 'lh-sort-btn--active' : ''}`}
          onClick={handleCookSortClick}
          title="Sort by 2026 Rating"
        >
          2026 Rating{sortBy === 'cook' ? (cookDir === 'asc' ? ' ▾' : ' ▴') : ''}
        </button>
        <button
          className={`lh-vp lh-sort-btn ${sortBy === 'voterPower' ? 'lh-sort-btn--active' : ''}`}
          onClick={handleVpSortClick}
          title="Sort by Voter Power"
        >
          Voter Power{sortBy === 'voterPower' ? (vpDir === 'desc' ? ' ▾' : ' ▴') : ''}
        </button>
      </div>
      <div className="tc-list">
        {top10Items.length === 0 ? (
          <div className="tc-empty">Loading…</div>
        ) : (
          top10Items.map((item) => {
            if (item.type === 'header') {
              return <div key={item.key} className="list-group-header">{item.label}</div>;
            }
            const { race, idx } = item;
            const cfg = COOK_CONFIG[race.cookRating] ?? { label: race.cookRating, color: '#475569', bg: '#f1f5f9' };
            const vpColor = getDistrictColor(race.voterPower);
            const vp = Math.round(race.voterPower);
            return (
              <div
                key={`${topType}-${race.geoid}-${idx}`}
                className="tc-entry"
                onMouseEnter={() => onRacePreview?.({ race, raceType: topType })}
                onMouseLeave={() => onRacePreview?.(null)}
                onClick={() => onRacePreview?.({ race, raceType: topType, select: true })}
              >
                <div className="tc-entry-header">
                  <span className="tc-rank">#{race._topRank}</span>
                  <div className="tc-title-block">
                    <span className="tc-label">{race.label}</span>
                    <span className="tc-sublabel">{race.state}</span>
                  </div>
                  {race.cookRating && (
                    <span className="tc-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  )}
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

// ── Main InfoBox ──────────────────────────────────────────────────────────────
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
  allData,
  onRacePreview,
  onTopTypeChange,
  civicOrgs,
  primaryCalendar,
  partiesData,
}) {
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState('voterPower');
  const [vpDir, setVpDir] = useState('desc');
  const [cookDir, setCookDir] = useState('asc');
  const districtListRef = useRef(null);

  const selectedRace = selectedGeoid
    ? (activeTab === 'nearby' ? nearbyRaces : raceData)?.find((r) => r.geoid === selectedGeoid)
    : null;

  useEffect(() => {
    if (selectedRace && districtListRef.current) {
      districtListRef.current.scrollTop = 0;
    }
  }, [selectedRace?.geoid]);

  function handleVpSortClick() {
    if (sortBy === 'voterPower') setVpDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy('voterPower');
  }
  function handleCookSortClick() {
    if (sortBy === 'cook') setCookDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortBy('cook');
  }
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

  const userCounty = extractCounty(searchPlaceName);

  return (
    <div className="info-box">
      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="info-left">
        {selectedRace ? (
          <ActionPane
            race={selectedRace}
            civicOrgs={civicOrgs}
            primaryCalendar={primaryCalendar}
            partiesData={partiesData}
            allRaces={activeTab === 'nearby' ? nearbyRaces : raceData}
            allData={allData}
            onSelect={onRaceSelect}
          />
        ) : (
          <DescriptionPane />
        )}
        <div className="info-attribution">
          A project by{' '}
          <a href="https://electoral-lab.org" target="_blank" rel="noopener noreferrer">
            the Electoral Innovation Lab
          </a>
          {' '}·{' '}
          <a href="https://www.electoral-lab.org/donate" target="_blank" rel="noopener noreferrer" className="info-donate-link">
            Support our work →
          </a>
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="district-list" ref={districtListRef}>
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

        {/* Top Contests tab */}
        {activeTab === 'top' && (
          selectedRace ? (
            <ContestDetail
              race={selectedRace}
              allRaces={raceData}
              onBack={() => onRaceSelect(null)}
              onSelect={onRaceSelect}
              civicOrgs={civicOrgs}
              primaryCalendar={primaryCalendar}
              userCounty={userCounty}
              parties={partiesData}
              hideOrgs
            />
          ) : (
            <TopContestsPane allData={allData} onRacePreview={onRacePreview} onTopTypeChange={onTopTypeChange} />
          )
        )}

        {/* My Area tab */}
        {activeTab === 'nearby' && nearbyRaces && (
          selectedRace ? (
            <ContestDetail
              race={selectedRace}
              allRaces={nearbyRaces}
              onBack={() => onRaceSelect(null)}
              onSelect={onRaceSelect}
              civicOrgs={civicOrgs}
              primaryCalendar={primaryCalendar}
              userCounty={userCounty}
              parties={partiesData}
              hideOrgs
            />
          ) : (
            <>
              <div className="list-header">
                <span className="lh-rank">#</span>
                <span className="lh-district">
                  {searchPlaceName ? `Near ${searchPlaceName.split(',')[0]}` : 'Nearby contests'}
                </span>
                <button
                  className={`lh-cook lh-sort-btn ${sortBy === 'cook' ? 'lh-sort-btn--active' : ''}`}
                  onClick={handleCookSortClick}
                  title="Sort by 2026 Rating"
                >
                  Cook{sortBy === 'cook' ? (cookDir === 'asc' ? ' ▾' : ' ▴') : ''}
                </button>
                <button
                  className={`lh-vp lh-sort-btn ${sortBy === 'voterPower' ? 'lh-sort-btn--active' : ''}`}
                  onClick={handleVpSortClick}
                  title="Sort by Voter Power"
                >
                  Voter Power{sortBy === 'voterPower' ? (vpDir === 'desc' ? ' ▾' : ' ▴') : ''}
                </button>
                {shareUrl && (
                  <button className="tab-share-btn" onClick={handleShare} title="Copy shareable link">
                    {copied ? '✓ Copied' : '⤴ Share'}
                  </button>
                )}
              </div>
              {nearbyRaces.length === 0 ? (
                <div className="list-loading">No competitive contests found within range.</div>
              ) : (
                buildListItems(nearbyRaces, sortBy, vpDir, cookDir).map((item) =>
                  item.type === 'header' ? (
                    <div key={item.key} className="list-group-header">{item.label}</div>
                  ) : (
                    <NearbyCard
                      key={`${item.race.raceType}-${item.race.label}`}
                      race={item.race}
                      isHovered={hoveredGeoid === item.race.geoid}
                      isSelected={selectedGeoid === item.race.geoid}
                      onHover={() => onRacePreview?.({ race: item.race, raceType: item.race.raceType })}
                      onLeave={() => onRacePreview?.(null)}
                      onClick={() => onRaceSelect(selectedGeoid === item.race.geoid ? null : item.race.geoid)}
                    />
                  )
                )
              )}
            </>
          )
        )}

        {/* Race list tabs */}
        {activeTab !== 'top' && activeTab !== 'nearby' && (
          raceData.length === 0 ? (
            <div className="list-loading">Loading data…</div>
          ) : selectedRace ? (
            <ContestDetail
              race={selectedRace}
              allRaces={raceData}
              onBack={() => onRaceSelect(null)}
              onSelect={onRaceSelect}
              civicOrgs={civicOrgs}
              primaryCalendar={primaryCalendar}
              userCounty={userCounty}
              parties={partiesData}
              hideOrgs
            />
          ) : (
            <>
              <div className="list-header">
                <span className="lh-rank">#</span>
                <span className="lh-district">{columnLabel}</span>
                <button
                  className={`lh-cook lh-sort-btn ${sortBy === 'cook' ? 'lh-sort-btn--active' : ''}`}
                  onClick={handleCookSortClick}
                  title="Sort by 2026 Rating"
                >
                  2026 Rating{sortBy === 'cook' ? (cookDir === 'asc' ? ' ▾' : ' ▴') : ''}
                </button>
                <button
                  className={`lh-vp lh-sort-btn ${sortBy === 'voterPower' ? 'lh-sort-btn--active' : ''}`}
                  onClick={handleVpSortClick}
                  title="Sort by Voter Power"
                >
                  Voter Power{sortBy === 'voterPower' ? (vpDir === 'desc' ? ' ▾' : ' ▴') : ''}
                </button>
              </div>
              {buildListItems(raceData, sortBy, vpDir, cookDir).map((item) =>
                item.type === 'header' ? (
                  <div key={item.key} className="list-group-header">{item.label}</div>
                ) : (
                  <DistrictCard
                    key={`${item.race.raceType}-${item.race.geoid}-${item.idx}`}
                    district={item.race}
                    rank={item.idx + 1}
                    isHovered={hoveredGeoid === item.race.geoid}
                    isSelected={selectedGeoid === item.race.geoid}
                    onHover={() => onRaceHover(item.race.geoid)}
                    onLeave={() => onRaceHover(null)}
                    onClick={() => onRaceSelect(selectedGeoid === item.race.geoid ? null : item.race.geoid)}
                  />
                )
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
