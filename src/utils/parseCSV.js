import Papa from 'papaparse';
import { STATE_ABBR, AT_LARGE_STATES } from './districtUtils.js';

function pad2(n) { return String(parseInt(n, 10) || 0).padStart(2, '0'); }
function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function abbr(name) { return STATE_ABBR[name] ?? name?.slice(0, 2).toUpperCase() ?? '??'; }
function clean(v) {
  const t = v?.trim() || null;
  return t === 'None' ? null : t;
}

async function fetchJSON(path) {
  const res = await fetch(path);
  return res.json();
}

// Standard US state FIPS codes (name → zero-padded 2-digit string)
const STATE_FIPS = {
  'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05',
  'California': '06', 'Colorado': '08', 'Connecticut': '09', 'Delaware': '10',
  'District of Columbia': '11', 'Florida': '12', 'Georgia': '13', 'Hawaii': '15',
  'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19', 'Kansas': '20',
  'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
  'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28',
  'Missouri': '29', 'Montana': '30', 'Nebraska': '31', 'Nevada': '32',
  'New Hampshire': '33', 'New Jersey': '34', 'New Mexico': '35', 'New York': '36',
  'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39', 'Oklahoma': '40',
  'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
  'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49',
  'Vermont': '50', 'Virginia': '51', 'Washington': '53', 'West Virginia': '54',
  'Wisconsin': '55', 'Wyoming': '56',
};

export async function loadHouseRaces() {
  const rows = await fetchJSON('/house_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => {
      const a = abbr(r.state_name);
      const isAtLarge = AT_LARGE_STATES.has(r.state_name);
      const num = parseInt(r.congress, 10);
      const geoid = isAtLarge ? `${a}-AT-LARGE` : `${a}-${String(num).padStart(2, '0')}`;
      return {
        geoid,
        label: `${a}-${num}`,
        state: r.state_name,
        race: isAtLarge ? 'At-Large' : `Congressional District ${num}`,
        raceType: 'house',
        districtNum: num,
        voterPower: toNum(r.voter_power),
        cookRating: clean(r.rating_2026),
        margin: toFloat(r.margin_2026_v2),
        dCandidate: clean(r.D_running),
        rCandidate: clean(r.R_running),
        dLink: null,
        rLink: null,
        incumbent: clean(r.incumbent),
        notes: clean(r.notes),
      };
    })
    .filter((r) => r.voterPower > 0 && r.geoid)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadSenateRaces() {
  const rows = await fetchJSON('/senate_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => ({
      geoid: pad2(r.state),
      label: abbr(r.state_name),
      state: r.state_name,
      race: r.election_name,
      raceType: 'senate',
      voterPower: toNum(r.voter_power),
      cookRating: clean(r.cook_rating),
      margin: toFloat(r.margin_recommended),
      dCandidate: clean(r.D_running),
      rCandidate: clean(r.R_running),
      dLink: r.D_link || null,
      rLink: r.R_link || null,
      incumbent: clean(r.incumbent),
      notes: clean(r.notes),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadGovernorRaces() {
  const rows = await fetchJSON('/governor_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => ({
      geoid: pad2(r.state),
      label: abbr(r.state_name),
      state: r.state_name,
      race: r.election_name,
      raceType: 'governor',
      voterPower: toNum(r.voter_power),
      cookRating: clean(r.cook_rating),
      margin: toFloat(r.margin_recommended),
      dCandidate: clean(r.D_running),
      rCandidate: clean(r.R_running),
      dLink: r.D_link || null,
      rLink: r.R_link || null,
      incumbent: clean(r.incumbent),
      notes: clean(r.notes),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadAGRaces() {
  const rows = await fetchJSON('/attorney_general_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => ({
      geoid: pad2(r.state),
      label: abbr(r.state_name),
      state: r.state_name,
      race: r.election_name,
      raceType: 'ag',
      voterPower: toNum(r.voter_power),
      cookRating: clean(r.cook_rating),
      margin: toFloat(r.margin_est),
      dCandidate: clean(r.D_running),
      rCandidate: clean(r.R_running),
      dLink: null,
      rLink: null,
      incumbent: clean(r.incumbent),
      notes: clean(r.notes),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadSOSRaces() {
  const rows = await fetchJSON('/secretary_of_state_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => ({
      geoid: pad2(r.state),
      label: abbr(r.state_name),
      state: r.state_name,
      race: r.election_name,
      raceType: 'sos',
      voterPower: toNum(r.voter_power),
      cookRating: clean(r.cook_rating),
      margin: toFloat(r.margin_est),
      dCandidate: clean(r.D_running),
      rCandidate: clean(r.R_running),
      dLink: null,
      rLink: null,
      incumbent: clean(r.incumbent),
      notes: clean(r.notes),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadJudicialRaces() {
  const rows = await fetchJSON('/judicial_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => ({
      geoid: pad2(r['FP Code']),
      label: r.election_name,
      state: r.state,
      race: r.race_type,
      raceType: 'judicial',
      voterPower: toNum(r.voter_power),
      cookRating: clean(r.cook_rating),
      margin: toFloat(r.margin_est),
      dCandidate: clean(r.D_running),
      rCandidate: clean(r.R_running),
      dLink: null,
      rLink: null,
      incumbent: clean(r.incumbent),
      notes: clean(r.notes),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadBallotRaces() {
  const rows = await fetchJSON('/ballot_initiative_dataset.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => {
      const statusKey = Object.keys(r).find((k) => k.startsWith('qualification_status'));
      const status = statusKey ? r[statusKey] : '';
      return {
        geoid: STATE_FIPS[r.state_name] ?? '00',
        label: r['name of ballot'] || r.state_name,
        state: r.state_name,
        race: r.ballot_type || r.race_type || 'Ballot Initiative',
        raceType: 'ballot',
        voterPower: toNum(r.voter_power),
        cookRating: null,
        margin: toFloat(r.margin_est),
        notes: status ? String(status).slice(0, 200) : null,
      };
    })
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

function sldGeoid(stateName, districtId) {
  const a = abbr(stateName);
  const s = String(districtId ?? '').trim();
  // Pure numeric: use zero-padded int to match map tiles
  if (/^\d+$/.test(s)) return `${a}-${parseInt(s, 10)}`;
  // Named district (e.g. "1A", "Belknap 1"): use raw string; won't hit map but works in list
  return `${a}-${s}`;
}

export async function loadStateLegUpperRaces() {
  const rows = await fetchJSON('/state_legislature_upper.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => {
      const a = abbr(r.state_name);
      const s = String(r.s_upper ?? '').trim();
      const geoid = sldGeoid(r.state_name, s);
      const isNumeric = /^\d+$/.test(s);
      return {
        geoid,
        label: isNumeric ? `${a} SD-${parseInt(s, 10)}` : `${a} SD-${s}`,
        state: r.state_name,
        race: r.election_name,
        raceType: 'state_leg_upper',
        voterPower: toNum(r.voter_power),
        cookRating: clean(r.cook_rating),
        margin: toFloat(r.margin_2026_est),
        dCandidate: clean(r.D_running),
        rCandidate: clean(r.R_running),
        dLink: null,
        rLink: null,
        incumbent: clean(r.incumbent),
        notes: clean(r.notes),
      };
    })
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadStateLegLowerRaces() {
  const rows = await fetchJSON('/state_legislature_lower.json');
  return rows
    .filter((r) => r.active !== 'FALSE')
    .map((r) => {
      const a = abbr(r.state_name);
      const s = String(r.s_lower ?? '').trim();
      const geoid = sldGeoid(r.state_name, s);
      const isNumeric = /^\d+$/.test(s);
      return {
        geoid,
        label: isNumeric ? `${a} HD-${parseInt(s, 10)}` : `${a} HD-${s}`,
        state: r.state_name,
        race: r.election_name,
        raceType: 'state_leg_lower',
        voterPower: toNum(r.voter_power),
        cookRating: clean(r.cook_rating),
        margin: toFloat(r.margin_2026_est),
        dCandidate: clean(r.D_running),
        rCandidate: clean(r.R_running),
        dLink: null,
        rLink: null,
        incumbent: clean(r.incumbent),
        notes: clean(r.notes),
      };
    })
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadCivicOrgs() {
  const rows = await fetchJSON('/civic_organizations.json');
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
  const rows = await fetchJSON('/political_parties.json');
  return rows.map((r) => ({
    level: r['Level (State, County, City)']?.trim().toLowerCase(),
    state: r.Name?.trim(),
    affiliation: r.Affiliation?.trim(),
    url: r.Link?.trim(),
  })).filter((r) => r.state && r.url);
}

export async function loadPrimaryCalendar() {
  const rows = await fetchJSON('/primary_calendar.json');
  return rows.map((r) => ({
    state: r.state_name?.trim(),
    primaryDate: r.primary_date?.trim(),
    primaryType: r.primary_type?.trim(),
    hasSenate: r.senate_primary === true,
    hasGovernor: r.governor_primary === true,
    hasHouse: r.house_primary === true,
    hasStateLeg: r.state_leg_primary === true,
    runoffDate: r.runoff_date?.trim() || null,
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
