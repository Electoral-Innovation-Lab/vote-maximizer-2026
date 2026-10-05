import Papa from 'papaparse';
import { STATE_ABBR, AT_LARGE_STATES } from './districtUtils.js';

// All model data comes from the Vote Maximizer JSON export (vm_export_json.py), copied into
// public/data/. See public/data/schema.json for field definitions and manifest.json for the
// workbook version, model settings and data dates.
const DATA = '/data';

function abbr(name) { return STATE_ABBR[name] ?? name?.slice(0, 2).toUpperCase() ?? '??'; }
function num(v) { return typeof v === 'number' && !isNaN(v) ? v : null; }

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const POLL_SOURCES = new Set(['F1 average', 'poll median', 'poll median + PVI baseline']);

function firstCand(cands, party) {
  return cands?.find((c) => c.party === party)?.name ?? null;
}

// Map one exported race record onto the object shape the components already use,
// plus the new fields (win probability, donation power, margin source, caveats).
function toRace(r, raceType, extra) {
  const cands = r.candidates ?? [];
  const marginSource = r.margin_source ?? null;
  const sourceKind = POLL_SOURCES.has(marginSource) ? 'poll' : 'estimate';
  return {
    id: r.id,
    state: r.state,
    race: r.election_name,
    raceType,
    voterPower: num(r.voter_power) ?? 0,
    cookRating: r.rating ?? null,
    margin: num(r.margin),
    marginDisplay: r.margin_display ?? null,
    marginSource,
    sourceKind,
    source: sourceKind === 'poll' ? 'poll' : 'cook', // legacy field used by CompareView
    winProbability: r.win_probability ?? null,
    perDollarPower: num(r.donation?.per_dollar_power),
    fecReceipts: num(r.donation?.fec_receipts),
    fecThrough: r.donation?.fec_reports_through ?? null,
    candidates: cands,
    dCandidate: firstCand(cands, 'D'),
    rCandidate: firstCand(cands, 'R'),
    otherCandidates: cands.filter((c) => c.party !== 'D' && c.party !== 'R'),
    dLink: r.links?.D ?? null,
    rLink: r.links?.R ?? null,
    incumbent: r.incumbent ?? null,
    notes: r.notes ?? null,
    caveats: r.caveats ?? null,
    lastVerified: r.last_verified ?? null,
    unopposed: !!r.unopposed,
    ...extra,
  };
}

async function loadRaces(file, raceType, extraFn) {
  const rows = await fetchJSON(`${DATA}/races/${file}.json`);
  return rows
    .filter((r) => r.active !== false)
    .map((r) => toRace(r, raceType, extraFn(r)))
    .filter((r) => r.voterPower > 0 && r.geoid)
    .sort((a, b) => b.voterPower - a.voterPower);
}

const statewide = (r) => ({ geoid: r.state_fips, label: r.state_abbr });

export function loadHouseRaces() {
  return loadRaces('house', 'house', (r) => {
    const a = r.state_abbr;
    const n = parseInt(r.district, 10);
    const isAtLarge = AT_LARGE_STATES.has(r.state);
    return {
      geoid: isAtLarge ? `${a}-AT-LARGE` : `${a}-${String(n).padStart(2, '0')}`,
      label: `${a}-${n}`,
      race: isAtLarge ? 'At-Large' : `Congressional District ${n}`,
      districtNum: n,
    };
  });
}

export const loadSenateRaces = () => loadRaces('senate', 'senate', statewide);
export const loadGovernorRaces = () => loadRaces('governor', 'governor', statewide);
export const loadAGRaces = () => loadRaces('attorney_general', 'ag', statewide);
export const loadSOSRaces = () => loadRaces('secretary_of_state', 'sos', statewide);

export function loadJudicialRaces() {
  return loadRaces('judicial', 'judicial', (r) => ({
    geoid: r.state_fips,
    label: r.election_name,
    race: r.detail?.court_race_type ?? 'Judicial',
  }));
}

export function loadBallotRaces() {
  return loadRaces('ballot_measures', 'ballot', (r) => ({
    geoid: r.state_fips ?? '00',
    label: r.detail?.measure_name || r.state,
    race: r.detail?.ballot_type || 'Ballot Initiative',
    cookRating: null,
    notes: r.detail?.qualification_status ? String(r.detail.qualification_status).slice(0, 200) : null,
  }));
}

function sldGeoid(a, districtId) {
  const s = String(districtId ?? '').trim();
  // Pure numeric: use the integer to match map tiles; named districts ("1A", "Belknap 1") work in lists only
  if (/^\d+$/.test(s)) return `${a}-${parseInt(s, 10)}`;
  return `${a}-${s}`;
}

function sld(prefix) {
  return (r) => {
    const a = r.state_abbr;
    const s = String(r.district ?? '').trim();
    const isNumeric = /^\d+$/.test(s);
    return {
      geoid: sldGeoid(a, s),
      label: isNumeric ? `${a} ${prefix}-${parseInt(s, 10)}` : `${a} ${prefix}-${s}`,
    };
  };
}

export const loadStateLegUpperRaces = () => loadRaces('state_legislature_upper', 'state_leg_upper', sld('SD'));
export const loadStateLegLowerRaces = () => loadRaces('state_legislature_lower', 'state_leg_lower', sld('HD'));

export async function loadManifest() {
  return fetchJSON(`${DATA}/manifest.json`);
}

export async function loadCivicOrgs() {
  const rows = await fetchJSON(`${DATA}/reference/civic_organizations.json`);
  return rows.map((r) => {
    const stateVal = r.state?.trim() ?? '';
    let level = r.chapter_level?.trim().toLowerCase() ?? '';
    if (level === 'local') level = 'county';
    if (!stateVal || stateVal === 'All' || stateVal.includes(',')) level = 'national';
    return {
      name: r.organization?.trim(),
      level,
      state: stateVal,
      county: r.county_or_city?.trim(),
      url: r.url?.trim(),
      type: r.organization_type?.trim(),
      pollWorker: r.poll_worker_signup === true,
      electionProtection: r.election_protection === true,
      notes: r.notes?.trim(),
    };
  }).filter((r) => r.name && r.url);
}

export async function loadParties() {
  const rows = await fetchJSON(`${DATA}/reference/political_parties.json`);
  return rows.map((r) => ({
    level: r.level_state_county_city?.trim().toLowerCase(),
    state: r.name?.trim(),
    affiliation: r.affiliation?.trim(),
    url: r.link?.trim(),
  })).filter((r) => r.state && r.url);
}

export async function loadPrimaryCalendar() {
  const rows = await fetchJSON(`${DATA}/reference/primary_calendar.json`);
  return rows.map((r) => ({
    state: r.state_name?.trim(),
    primaryDate: r.primary_date != null ? String(r.primary_date).trim() : null,
    primaryType: r.primary_type?.trim(),
    hasSenate: r.senate_primary === true,
    hasGovernor: r.governor_primary === true,
    hasHouse: r.house_primary === true,
    hasStateLeg: r.state_leg_primary === true,
    runoffDate: r.runoff_date != null ? String(r.runoff_date).trim() : null,
  })).filter((r) => r.state);
}

export async function loadUrbanicity() {
  const res = await fetch('/data_urbanicity.csv');
  const text = await res.text();
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
  const byGeoid = {};
  for (const r of data) {
    if (!r.geoid) continue;
    const n = parseFloat(r.urbanPct);
    byGeoid[r.geoid] = { urbanicity: r.urbanicity, urbanPct: isNaN(n) ? null : n };
  }
  return byGeoid;
}

// For map: aggregate state_leg races to one entry per state (max VP)
export function aggregateByState(races) {
  const byState = {};
  for (const r of races) {
    if (!byState[r.geoid] || r.voterPower > byState[r.geoid].voterPower) {
      byState[r.geoid] = r;
    }
  }
  return Object.values(byState);
}

export { abbr };
