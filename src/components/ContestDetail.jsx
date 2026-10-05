import { useState, useEffect } from 'react';
import { getDistrictColor, COOK_CONFIG, STATE_ABBR, formatMarginText, DONATION_VP_MIN, FIFTYPLUSONE_URL } from '../utils/districtUtils.js';
import './ContestDetail.css';

const PRIMARY_COL = {
  house:           'hasHouse',
  senate:          'hasSenate',
  governor:        'hasGovernor',
  state_leg_upper: 'hasStateLeg',
  state_leg_lower: 'hasStateLeg',
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

function filterParties(parties, race) {
  if (!parties?.length) return [];
  return parties
    .filter((p) => p.state?.trim() === race.state)
    .map((p) => ({
      name: `${p.state} ${p.affiliation === 'Democratic' ? 'Democrats' : 'Republicans'}`,
      url: p.url,
      notes: `${p.affiliation} state party`,
    }));
}

function filterOrgs(civicOrgs, race, userCounty) {
  if (!civicOrgs?.length) return [];
  const stateAbbr = STATE_ABBR[race.state] ?? '';
  return civicOrgs.filter((org) => {
    if (org.level === 'national') return true;
    if (org.level === 'state') return org.state === stateAbbr;
    if (org.level === 'county') {
      return org.state === stateAbbr && userCounty && org.county === userCounty;
    }
    return false;
  });
}

function cookCfg(cookRating) {
  return COOK_CONFIG[cookRating] ?? { label: cookRating, color: '#475569', bg: '#f1f5f9' };
}

const formatMargin = formatMarginText;

function sourceLabel(race) {
  return race.sourceKind === 'poll' ? 'Polling' : 'Estimate';
}

function SourceBadge({ race }) {
  if (!race.marginSource) return null;
  const poll = race.sourceKind === 'poll';
  return (
    <span
      className={`cd-source-badge ${poll ? 'cd-source-badge--poll' : 'cd-source-badge--est'}`}
      title={poll
        ? `Margin from polling (${race.marginSource})`
        : `No usable polling — margin estimated from partisan lean (${race.marginSource})`}
    >
      {sourceLabel(race)}
    </span>
  );
}

function formatMoney(n) {
  if (n == null) return null;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function WinProbability({ race }) {
  const w = race.winProbability;
  if (!w || w.p == null) return null;
  const pct = Math.round(w.p * 100);
  return (
    <div className="cd-meta cd-winprob">
      <span>
        Chance {w.candidate} finishes ahead of {w.opponent}: <strong>{pct}%</strong>
      </span>
    </div>
  );
}

function DonationPower({ race }) {
  if (race.perDollarPower == null || race.voterPower < DONATION_VP_MIN) return null;
  const color = getDistrictColor(race.perDollarPower);
  return (
    <div className="cd-section">
      <h3 className="cd-section-title">
        Donation Power{' '}
        <span
          className="cd-vp-tooltip"
          title="How much one additional dollar can move this race: the same closeness measure as voter power, divided by the money the nominees have already raised (FEC). 0–100 within this race type."
        >?</span>
      </h3>
      <div className="cd-vp-bar">
        <div className="cd-vp-track">
          <div className="cd-vp-fill" style={{ width: `${Math.round(race.perDollarPower)}%`, background: color }} />
        </div>
        <span className="cd-vp-score">{Math.round(race.perDollarPower)}</span>
      </div>
      {race.fecReceipts != null && (
        <div className="cd-donation-note">
          Nominees have raised {formatMoney(race.fecReceipts)}
          {race.fecThrough ? ` (FEC reports through ${race.fecThrough})` : ''}.
        </div>
      )}
    </div>
  );
}

function DataNotes({ race }) {
  const poll = race.sourceKind === 'poll';
  if (!race.caveats && !race.lastVerified && !poll) return null;
  return (
    <div className="cd-data-notes">
      {race.caveats && <p className="cd-caveats">{race.caveats}</p>}
      <p className="cd-data-meta">
        {race.lastVerified && <>Last verified {race.lastVerified}. </>}
        {poll && (
          <>Polling data: <a href={FIFTYPLUSONE_URL} target="_blank" rel="noopener noreferrer">Powered by FiftyPlusOne</a>.</>
        )}
      </p>
    </div>
  );
}

function getNearby(race, allRaces) {
  const others = allRaces.filter((r) => r.geoid !== race.geoid);
  if (race.districtNum !== undefined) {
    const sameState = others.filter((r) => r.state === race.state);
    return sameState.length ? sameState.slice(0, 3) : others.slice(0, 3);
  }
  return others.slice(0, 3);
}

// ── Voter Power hero (right panel large display) ──────────────────────────────
function VPHero({ voterPower }) {
  const color = getDistrictColor(voterPower);
  const score = Math.round(voterPower);
  const msg = score >= 70
    ? 'One of the highest-impact races in the country — every vote and dollar here goes furthest.'
    : score >= 40
    ? 'A genuinely competitive race where your engagement can shift the outcome.'
    : 'A lower-margin race. Down-ballot organizing and local turnout still matter here.';
  return (
    <div className="cd-vp-hero">
      <div className="cd-vp-hero-top">
        <div className="cd-vp-hero-label-row">
          <span className="cd-vp-hero-label">Voter Power</span>
          <span
            className="cd-vp-tooltip"
            title="Voter Power measures how much impact each individual vote has in this race — based on how competitive it is and how many people vote."
          >?</span>
        </div>
        <span className="cd-vp-hero-score" style={{ color }}>{score}</span>
      </div>
      <div className="cd-vp-hero-bar-track">
        <div className="cd-vp-hero-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <p className="cd-vp-hero-msg">{msg}</p>
    </div>
  );
}

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

function OrgList({ orgs, label, limit }) {
  const [expanded, setExpanded] = useState(false);
  if (!orgs?.length) return null;
  const capped = limit && !expanded ? orgs.slice(0, limit) : orgs;
  const hidden = limit ? orgs.length - limit : 0;
  return (
    <div className="cd-org-group">
      {label && <div className="cd-org-group-label">{label}</div>}
      {capped.map((org) => (
        <a key={org.name} href={org.url} target="_blank" rel="noopener noreferrer" className="cd-org-link">
          <div>
            <div className="cd-org-name">{org.name}</div>
            {org.notes && <div className="cd-org-desc">{org.notes}</div>}
          </div>
          <span className="cd-org-arrow">→</span>
        </a>
      ))}
      {hidden > 0 && (
        <button className="cd-org-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `+${hidden} more`}
        </button>
      )}
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
      {race.cookRating && (
        <span className="cd-mini-cook" style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.label}
        </span>
      )}
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

function CompareView({ raceA, raceB, onClose, orgs }) {
  const cfgA = cookCfg(raceA.cookRating);
  const cfgB = cookCfg(raceB.cookRating);

  const rows = [
    raceA.cookRating || raceB.cookRating
      ? { label: '2026 Rating', a: cfgA.label, b: cfgB.label }
      : null,
    { label: 'Projected Margin', a: formatMargin(raceA), b: formatMargin(raceB) },
    { label: 'Data Source', a: sourceLabel(raceA), b: sourceLabel(raceB) },
    raceA.perDollarPower != null || raceB.perDollarPower != null
      ? {
          label: 'Donation Power',
          a: raceA.perDollarPower != null ? Math.round(raceA.perDollarPower) : '—',
          b: raceB.perDollarPower != null ? Math.round(raceB.perDollarPower) : '—',
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="cd-compare">
      <button className="cd-back" onClick={onClose}>← Back to detail</button>

      <div className="cd-cmp-header">
        <div className="cd-cmp-col">
          <span className="cd-cmp-label">{raceA.label}</span>
          <span className="cd-cmp-state">{raceA.state}</span>
          {raceA.cookRating && <span className="cd-cmp-cook" style={{ color: cfgA.color, background: cfgA.bg }}>{cfgA.label}</span>}
        </div>
        <div className="cd-cmp-vs">vs</div>
        <div className="cd-cmp-col">
          <span className="cd-cmp-label">{raceB.label}</span>
          <span className="cd-cmp-state">{raceB.state}</span>
          {raceB.cookRating && <span className="cd-cmp-cook" style={{ color: cfgB.color, background: cfgB.bg }}>{cfgB.label}</span>}
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

      {orgs?.length > 0 && (
        <div className="cd-section">
          <h3 className="cd-section-title">Get Involved</h3>
          <OrgList orgs={orgs.filter((o) => o.level === 'national')} label={null} />
        </div>
      )}
    </div>
  );
}

// ── Main detail view ──────────────────────────────────────────────────────────

export default function ContestDetail({
  race,
  allRaces,
  onBack,
  onSelect,
  civicOrgs,
  primaryCalendar,
  userCounty,
  parties,
  hideOrgs,
}) {
  const [compareRace, setCompareRace] = useState(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setCompareRace(null);
    setPicking(false);
  }, [race?.geoid]);

  if (compareRace) {
    const compareOrgs = hideOrgs ? [] : filterOrgs(civicOrgs, race, userCounty);
    return <CompareView raceA={race} raceB={compareRace} onClose={() => setCompareRace(null)} orgs={compareOrgs} />;
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
    ? `Other contests in ${race.state}`
    : 'Other high-impact contests';

  const primaryBadge = getPrimaryBadge(primaryCalendar, race);

  // Higher-VP races from same pool (shown when hideOrgs=true, i.e. right panel)
  const higherVpRaces = hideOrgs
    ? allRaces.filter((r) => r.geoid !== race.geoid && r.voterPower > race.voterPower).slice(0, 3)
    : [];

  // Full org list (for legacy single-panel mode)
  const orgs = hideOrgs ? [] : filterOrgs(civicOrgs, race, userCounty);
  const stateParties = hideOrgs ? [] : filterParties(parties, race);
  const localOrgs    = orgs.filter((o) => o.level === 'county');
  const stateOrgs    = orgs.filter((o) => o.level === 'state');
  const nationalOrgs = orgs.filter((o) => o.level === 'national');

  return (
    <div className="contest-detail">
      <button className="cd-back" onClick={onBack}>← All contests</button>

      {/* ── Contest header ── */}
      <div className="cd-header">
        <div className="cd-header-top">
          <div>
            <span className="cd-label">{race.label}</span>
            <span className="cd-state">{race.state}</span>
            {!isHouse && <span className="cd-race-name">{race.race}</span>}
          </div>
          <div className="cd-header-badges">
            {race.cookRating && (
              <span className="cd-cook" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
            )}
          </div>
        </div>
        {formatMargin(race) && (
          <div className="cd-meta">
            <span>Est. Margin: <strong>{formatMargin(race)}</strong></span>
            <SourceBadge race={race} />
          </div>
        )}
        <WinProbability race={race} />
        {primaryBadge && (
          <div className="cd-primary-badge">
            Primary: {primaryBadge.date}
          </div>
        )}
      </div>

      {/* ── Voter Power (hero when hideOrgs, compact otherwise) ── */}
      {hideOrgs ? (
        <VPHero voterPower={race.voterPower} />
      ) : (
        <div className="cd-section">
          <h3 className="cd-section-title">Voter Power</h3>
          <VPBar voterPower={race.voterPower} />
        </div>
      )}

      <DonationPower race={race} />

      {/* ── Candidates ── */}
      {(race.dCandidate || race.rCandidate || race.otherCandidates?.length > 0) && (
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
            {race.otherCandidates?.map((c) => (
              <div key={`${c.party}-${c.name}`} className="cd-candidate cd-candidate--o">
                <span className="cd-cand-party">{c.party}</span>
                <span className="cd-cand-name">{c.name}</span>
              </div>
            ))}
            {race.incumbent && (
              <div className="cd-incumbent">Incumbent: {race.incumbent}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Higher VP nearby (right panel only) ── */}
      {higherVpRaces.length > 0 && (
        <div className="cd-section">
          <h3 className="cd-section-title">Higher voter power nearby</h3>
          {higherVpRaces.map((r, i) => (
            <MiniCard key={`higher-${r.raceType}-${r.geoid}`} race={r} rank={i + 1} onClick={() => onSelect(r.geoid)} />
          ))}
        </div>
      )}

      {/* ── Get Involved (legacy single-panel mode only) ── */}
      {!hideOrgs && (
        <div className="cd-section">
          <h3 className="cd-section-title">Get Involved</h3>
          <OrgList orgs={localOrgs}    label={localOrgs.length    ? 'In your area' : null} />
          <OrgList orgs={stateParties} label={stateParties.length ? 'State parties' : null} />
          <OrgList orgs={stateOrgs}    label={stateOrgs.length    ? 'Statewide'    : null} />
          <OrgList orgs={nationalOrgs} label={nationalOrgs.length ? 'National'     : null} limit={3} />
          {!orgs.length && !stateParties.length && (
            <div className="cd-org-empty">Resources loading…</div>
          )}
        </div>
      )}

      {/* ── Nearby contests (legacy mode only) ── */}
      {!hideOrgs && nearby.length > 0 && (
        <div className="cd-section">
          <h3 className="cd-section-title">{nearbyTitle}</h3>
          {nearby.map((r, i) => (
            <MiniCard key={`${r.raceType}-${r.geoid}`} race={r} rank={i + 1} onClick={() => onSelect(r.geoid)} />
          ))}
        </div>
      )}

      <DataNotes race={race} />

      {/* ── Compare ── */}
      <div className="cd-section">
        <h3 className="cd-section-title">Compare Contests</h3>
        <button className="cd-compare-btn" onClick={() => setPicking(true)}>
          Compare with another contest →
        </button>
      </div>
    </div>
  );
}
