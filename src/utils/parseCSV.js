import Papa from 'papaparse';
import { STATE_ABBR, AT_LARGE_STATES } from './districtUtils.js';

function pad2(n) { return String(parseInt(n, 10) || 0).padStart(2, '0'); }
function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function abbr(name) { return STATE_ABBR[name] ?? name?.slice(0, 2).toUpperCase() ?? '??'; }
function clean(v) { return v?.trim() || null; }

async function fetchRows(path) {
  const res = await fetch(path);
  const text = await res.text();
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
  return data;
}

export async function loadHouseRaces() {
  const rows = await fetchRows('/data_house.csv');
  return rows
    .map((r) => {
      const a = abbr(r.state_name);
      const isAtLarge = AT_LARGE_STATES.has(r.state_name);
      const geoid = isAtLarge ? `${a}-AT-LARGE` : `${a}-${String(parseInt(r.congress, 10)).padStart(2, '0')}`;
      return {
        geoid,
        label: `${a}-${parseInt(r.congress, 10)}`,
        state: r.state_name,
        race: r.election_name,
        raceType: 'house',
        districtNum: parseInt(r.congress, 10),
        voterPower: toNum(r.voter_power),
        cookRating: r.cook_rating?.trim(),
        margin: toFloat(r['Margin (Averages)']),
        dCandidate: clean(r.D_running),
        rCandidate: clean(r.R_running),
        dLink: r.D_link,
        rLink: r.R_link,
        incumbent: clean(r.incumbent),
        notes: r.notes,
      };
    })
    .filter((r) => r.voterPower > 0 && r.geoid)
    .sort((a, b) => b.voterPower - a.voterPower);
}

function parseStatewideRows(rows, raceType) {
  return rows
    .map((r) => {
      const isSpecial = r.election_name?.toLowerCase().includes('special');
      const a = abbr(r.state_name);
      return {
        geoid: pad2(r.state),
        label: isSpecial ? `${a}*` : a,
        state: r.state_name,
        race: r.election_name,
        raceType,
        voterPower: toNum(r.voter_power),
        cookRating: r.cook_rating?.trim(),
        margin: toFloat(r['Poll Margins'] ?? r['Margin (Averages)']),
        dCandidate: clean(r.D_running),
        rCandidate: clean(r.R_running),
        dLink: r.D_link,
        rLink: r.R_link,
        incumbent: clean(r.incumbent),
        notes: r.notes,
      };
    })
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadSenateRaces() {
  return parseStatewideRows(await fetchRows('/data_senate.csv'), 'senate');
}

export async function loadGovernorRaces() {
  return parseStatewideRows(await fetchRows('/data_gov.csv'), 'governor');
}

export async function loadAGRaces() {
  return parseStatewideRows(await fetchRows('/data_ag.csv'), 'ag');
}

export async function loadSOSRaces() {
  return parseStatewideRows(await fetchRows('/data_sos.csv'), 'sos');
}

export async function loadJudicialRaces() {
  const rows = await fetchRows('/data_judicial.csv');
  return rows
    .map((r) => ({
      geoid: pad2(r['FP Code']),
      label: r.election_name,
      state: r.state,
      race: r.race_type,
      raceType: 'judicial',
      voterPower: toNum(r.voter_power),
      cookRating: r.cook_rating?.trim(),
      dCandidate: r.D_running,
      rCandidate: r.R_running,
      dLink: r.D_link,
      rLink: r.R_link,
      incumbent: r.incumbent,
      notes: r.notes,
    }))
    .filter((r) => r.cookRating && r.cookRating !== '')
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadBallotRaces() {
  const rows = await fetchRows('/data_ballot.csv');
  return rows
    .map((r) => ({
      geoid: pad2(r.state),
      label: r['name of ballot'] || r.election_name,
      state: r.state_name,
      race: r.election_name,
      raceType: 'ballot',
      voterPower: toNum(r.voter_power),
      cookRating: r.cook_rating?.trim(),
      notes: (r['ballot notes'] || r.description || '').slice(0, 200),
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadStateLegUpperRaces() {
  const rows = await fetchRows('/data_state_leg_upper.csv');
  return rows
    .map((r) => ({
      geoid: `${abbr(r.state_name)}-${parseInt(r.s_upper, 10)}`,
      label: `${abbr(r.state_name)} SD-${parseInt(r.s_upper, 10)}`,
      state: r.state_name,
      race: r.election_name,
      raceType: 'state_leg_upper',
      voterPower: toNum(r.voter_power),
      cookRating: r.cook_rating?.trim(),
      dCandidate: r.D_running,
      rCandidate: r.R_running,
      notes: r.notes,
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadStateLegLowerRaces() {
  const rows = await fetchRows('/data_state_leg_lower.csv');
  return rows
    .map((r) => ({
      geoid: `${abbr(r.state_name)}-${parseInt(r.s_lower, 10)}`,
      label: `${abbr(r.state_name)} HD-${parseInt(r.s_lower, 10)}`,
      state: r.state_name,
      race: r.election_name,
      raceType: 'state_leg_lower',
      voterPower: toNum(r.voter_power),
      cookRating: r.cook_rating?.trim(),
      dCandidate: r.D_running,
      rCandidate: r.R_running,
      notes: r.notes,
    }))
    .filter((r) => r.voterPower > 0)
    .sort((a, b) => b.voterPower - a.voterPower);
}

export async function loadCivicOrgs() {
  const rows = await fetchRows('/data_civic.csv');
  return rows.map((r) => {
    const stateVal = r.state?.trim() ?? '';
    let level = r.chapter_level?.trim().toLowerCase() ?? '';
    if (level === 'local') level = 'county';
    // If state is 'All' or comma-separated (multi-state), treat as national
    if (!stateVal || stateVal === 'All' || stateVal.includes(',')) level = 'national';
    return {
      name: r.organization?.trim(),
      level,
      state: stateVal,
      county: r.county_or_city?.trim(),
      url: r.url?.trim(),
      type: r.organization_type?.trim(),
      pollWorker: r.poll_worker_signup === 'TRUE',
      electionProtection: r.election_protection === 'TRUE',
      notes: r.notes?.trim(),
    };
  }).filter((r) => r.name && r.url);
}

export async function loadParties() {
  const rows = await fetchRows('/data_parties.csv');
  return rows.map((r) => ({
    level: r['Level (State, County, City)']?.trim().toLowerCase(),
    state: r.Name?.trim(),
    affiliation: r.Affiliation?.trim(),
    url: r.Link?.trim(),
  })).filter((r) => r.state && r.url);
}

export async function loadPrimaryCalendar() {
  const rows = await fetchRows('/data_primary_cal.csv');
  return rows.map((r) => ({
    state: r.state_name?.trim(),
    primaryDate: r.primary_date?.trim(),
    primaryType: r.primary_type?.trim(),
    hasSenate: r.senate_primary === 'TRUE',
    hasGovernor: r.governor_primary === 'TRUE',
    hasHouse: r.house_primary === 'TRUE',
    hasStateLeg: r.state_leg_primary === 'TRUE',
    runoffDate: r.runoff_date?.trim() || null,
  })).filter((r) => r.state);
}

export async function loadUrbanicity() {
  const rows = await fetchRows('/data_urbanicity.csv');
  const byGeoid = {};
  for (const r of rows) {
    if (!r.geoid) continue;
    byGeoid[r.geoid] = { urbanicity: r.urbanicity, urbanPct: toFloat(r.urbanPct) };
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
