import { useState, useEffect } from 'react';
import { getDistrictColor, COOK_CONFIG } from '../utils/districtUtils.js';
import './ContestDetail.css';

const GET_INVOLVED_ORGS = [
  {
    name: 'League of Women Voters',
    url: 'https://www.lwv.org/',
    desc: 'Voter registration, education & election protection',
  },
  {
    name: 'Common Cause',
    url: 'https://www.commoncause.org/',
    desc: 'Voting rights, accountability & election reform',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cookCfg(cookRating) {
  return COOK_CONFIG[cookRating] ?? { label: cookRating, color: '#475569', bg: '#f1f5f9' };
}

function formatMargin(margin) {
  if (margin == null || isNaN(margin)) return null;
  if (margin === 0) return 'Even';
  const abs = Math.abs(margin).toFixed(1).replace(/\.0$/, '');
  return margin > 0 ? `+${abs} Dem` : `+${abs} Rep`;
}

function getNearby(race, allRaces) {
  const others = allRaces.filter((r) => r.geoid !== race.geoid);
  if (race.districtNum !== undefined) {
    const sameState = others.filter((r) => r.state === race.state);
    return sameState.length ? sameState.slice(0, 3) : others.slice(0, 3);
  }
  return others.slice(0, 3);
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function VPBar({ voterPower }) {
  const color = getDistrictColor(voterPower);
  return (
    <div className="cd-vp-bar">
      <div className="cd-vp-track">
        <div className="cd-vp-fill" style={{ width: `${Math.round(voterPower)}%`, background: color }} />
      </div>
      <span className="cd-vp-score">{Math.round(voterPower)}</span>
    </div>
  );
}

function MiniCard({ race, rank, onClick }) {
  const cfg = cookCfg(race.cookRating);
  return (
    <button className="cd-mini-card" onClick={onClick}>
      <span className="cd-mini-rank">{rank}</span>
      <div className="cd-mini-info">
        <span className="cd-mini-label">{race.label}</span>
        <span className="cd-mini-state">{race.state}</span>
      </div>
      <span className="cd-mini-cook" style={{ color: cfg.color, background: cfg.bg }}>
        {cfg.label}
      </span>
      <span className="cd-mini-vp" style={{ color: getDistrictColor(race.voterPower) }}>
        {Math.round(race.voterPower)}
      </span>
    </button>
  );
}

// ── Compare sub-views ─────────────────────────────────────────────────────────

function ComparePicker({ current, allRaces, onPick, onCancel }) {
  const options = allRaces.filter((r) => r.geoid !== current.geoid);
  return (
    <div className="cd-picker">
      <div className="cd-picker-header">
        <span className="cd-picker-title">Pick a race to compare</span>
        <button className="cd-picker-cancel" onClick={onCancel} aria-label="Cancel">✕</button>
      </div>
      <div className="cd-picker-list">
        {options.map((r, i) => (
          <MiniCard key={r.geoid} race={r} rank={i + 1} onClick={() => onPick(r)} />
        ))}
      </div>
    </div>
  );
}

function CompareView({ raceA, raceB, onClose }) {
  const cfgA = cookCfg(raceA.cookRating);
  const cfgB = cookCfg(raceB.cookRating);

  const rows = [
    { label: 'Cook Rating', a: cfgA.label, b: cfgB.label },
    { label: 'Projected Margin', a: formatMargin(raceA.margin), b: formatMargin(raceB.margin) },
    {
      label: 'Data Source',
      a: raceA.source === 'cook' ? 'Cook proxy' : 'Poll',
      b: raceB.source === 'cook' ? 'Cook proxy' : 'Poll',
    },
  ];

  return (
    <div className="cd-compare">
      <button className="cd-back" onClick={onClose}>← Back to detail</button>

      <div className="cd-cmp-header">
        <div className="cd-cmp-col">
          <span className="cd-cmp-label">{raceA.label}</span>
          <span className="cd-cmp-state">{raceA.state}</span>
          <span className="cd-cmp-cook" style={{ color: cfgA.color, background: cfgA.bg }}>{cfgA.label}</span>
        </div>
        <div className="cd-cmp-vs">vs</div>
        <div className="cd-cmp-col">
          <span className="cd-cmp-label">{raceB.label}</span>
          <span className="cd-cmp-state">{raceB.state}</span>
          <span className="cd-cmp-cook" style={{ color: cfgB.color, background: cfgB.bg }}>{cfgB.label}</span>
        </div>
      </div>

      <div className="cd-cmp-table">
        <div className="cd-cmp-table-header">
          <span />
          <span className="cd-cmp-col-label">{raceA.label}</span>
          <span className="cd-cmp-col-label">{raceB.label}</span>
        </div>

        <div className="cd-cmp-row">
          <span className="cd-cmp-row-label">Voter Power</span>
          <div className="cd-cmp-row-val"><VPBar voterPower={raceA.voterPower} /></div>
          <div className="cd-cmp-row-val"><VPBar voterPower={raceB.voterPower} /></div>
        </div>

        {rows.map(({ label, a, b }) => (
          <div className="cd-cmp-row" key={label}>
            <span className="cd-cmp-row-label">{label}</span>
            <span className="cd-cmp-row-val">{a}</span>
            <span className="cd-cmp-row-val">{b}</span>
          </div>
        ))}
      </div>

      <div className="cd-section">
        <h3 className="cd-section-title">Get Involved</h3>
        <div className="cd-org-list">
          {GET_INVOLVED_ORGS.map((org) => (
            <a key={org.name} href={org.url} target="_blank" rel="noopener noreferrer" className="cd-org-link">
              <span className="cd-org-name">{org.name}</span>
              <span className="cd-org-arrow">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main detail view ──────────────────────────────────────────────────────────

export default function ContestDetail({ race, allRaces, onBack, onSelect }) {
  const [compareRace, setCompareRace] = useState(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setCompareRace(null);
    setPicking(false);
  }, [race?.geoid]);

  if (compareRace) {
    return <CompareView raceA={race} raceB={compareRace} onClose={() => setCompareRace(null)} />;
  }

  if (picking) {
    return (
      <ComparePicker
        current={race}
        allRaces={allRaces}
        onPick={(r) => { setCompareRace(r); setPicking(false); }}
        onCancel={() => setPicking(false)}
      />
    );
  }

  const cfg = cookCfg(race.cookRating);
  const nearby = getNearby(race, allRaces);
  const isHouse = race.districtNum !== undefined;
  const nearbyTitle = isHouse && allRaces.some((r) => r.geoid !== race.geoid && r.state === race.state)
    ? `Other races in ${race.state}`
    : 'Other high-impact races';

  return (
    <div className="contest-detail">
      <button className="cd-back" onClick={onBack}>← All races</button>

      {/* ── Contest header ── */}
      <div className="cd-header">
        <div className="cd-header-top">
          <div>
            <span className="cd-label">{race.label}</span>
            <span className="cd-state">{race.state}</span>
            {!isHouse && <span className="cd-race-name">{race.race}</span>}
          </div>
          <span className="cd-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        </div>
        <VPBar voterPower={race.voterPower} />
        {formatMargin(race.margin) && (
          <div className="cd-meta">
            <span>Est. Margin: <strong>{formatMargin(race.margin)}</strong></span>
          </div>
        )}
      </div>

      {/* ── Candidates ── */}
      {(race.dCandidate || race.rCandidate) && (
        <div className="cd-section">
          <h3 className="cd-section-title">Candidates</h3>
          <div className="cd-candidates">
            {race.dCandidate && (
              <div className="cd-candidate cd-candidate--d">
                <span className="cd-cand-party">D</span>
                <span className="cd-cand-name">
                  {race.dLink ? <a href={race.dLink} target="_blank" rel="noopener noreferrer">{race.dCandidate}</a> : race.dCandidate}
                </span>
              </div>
            )}
            {race.rCandidate && (
              <div className="cd-candidate cd-candidate--r">
                <span className="cd-cand-party">R</span>
                <span className="cd-cand-name">
                  {race.rLink ? <a href={race.rLink} target="_blank" rel="noopener noreferrer">{race.rCandidate}</a> : race.rCandidate}
                </span>
              </div>
            )}
            {race.incumbent && (
              <div className="cd-incumbent">Incumbent: {race.incumbent}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Get Involved ── */}
      <div className="cd-section">
        <h3 className="cd-section-title">Get Involved</h3>
        <div className="cd-org-list">
          {GET_INVOLVED_ORGS.map((org) => (
            <a key={org.name} href={org.url} target="_blank" rel="noopener noreferrer" className="cd-org-link">
              <div>
                <div className="cd-org-name">{org.name}</div>
                <div className="cd-org-desc">{org.desc}</div>
              </div>
              <span className="cd-org-arrow">→</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Nearby races ── */}
      {nearby.length > 0 && (
        <div className="cd-section">
          <h3 className="cd-section-title">{nearbyTitle}</h3>
          {nearby.map((r, i) => (
            <MiniCard key={r.geoid} race={r} rank={i + 1} onClick={() => onSelect(r.geoid)} />
          ))}
        </div>
      )}

      {/* ── Compare ── */}
      <div className="cd-section">
        <h3 className="cd-section-title">Compare Races</h3>
        <button className="cd-compare-btn" onClick={() => setPicking(true)}>
          Compare with another race →
        </button>
      </div>
    </div>
  );
}
