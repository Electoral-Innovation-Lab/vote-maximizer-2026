import Papa from 'papaparse';
import { getGEOID, STATE_ABBR, STATE_FIPS } from './districtUtils.js';

export async function loadHouseRaces() {
  const response = await fetch('/vm_data.csv');
  const text = await response.text();
  return parseHouseRaces(text);
}

export async function loadSenateRaces() {
  const response = await fetch('/vm_data.csv');
  const text = await response.text();
  return parseStateRaces(text, 'US SENATE');
}

export async function loadGovernorRaces() {
  const response = await fetch('/vm_data.csv');
  const text = await response.text();
  return parseStateRaces(text, 'GOVERNOR');
}

function parseStateRaces(csvText, sectionName) {
  const lines = csvText.split('\n');

  const sectionIdx = lines.findIndex((line) => line.includes(sectionName));
  if (sectionIdx === -1) {
    console.error(`${sectionName} section not found in CSV`);
    return [];
  }

  const nextSectionIdx = lines
    .slice(sectionIdx + 2)
    .findIndex((line) => line.trimStart().startsWith('▶'));
  const endIdx =
    nextSectionIdx === -1
      ? lines.length
      : sectionIdx + 2 + nextSectionIdx;

  const sectionLines = lines.slice(sectionIdx + 1, endIdx);
  if (!sectionLines.length) return [];

  const { data } = Papa.parse(sectionLines.join('\n'), {
    skipEmptyLines: true,
    header: false,
  });

  // Columns: 0: Race, 1: State, 2: Cook Rating, 3: Margin (pts),
  // 4: Margin Source, 5: 2020 Turnout, 6: σ_eff, 7: σ ratio,
  // 8: VP Raw, 9: Voter Power (0–100)
  const COL = { RACE: 0, STATE: 1, COOK: 2, MARGIN: 3, SOURCE: 4, VP: 9 };

  const races = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[COL.RACE]) continue;

    const race = row[COL.RACE].trim();
    const state = row[COL.STATE]?.trim();
    const cookRating = row[COL.COOK]?.trim();
    const margin = parseFloat(row[COL.MARGIN]);
    const source = row[COL.SOURCE]?.trim();
    const voterPower = parseFloat(row[COL.VP]);

    if (!state || isNaN(voterPower)) continue;

    const fips = STATE_FIPS[state];
    if (!fips) continue;

    const abbr = STATE_ABBR[state] ?? state;
    const isSpecial = race.toLowerCase().includes('special');
    const label = isSpecial ? `${abbr}*` : abbr;

    races.push({
      geoid: fips,
      label,
      race,
      state,
      cookRating,
      margin,
      source,
      voterPower,
    });
  }

  return races.sort((a, b) => b.voterPower - a.voterPower);
}

function parseHouseRaces(csvText) {
  const lines = csvText.split('\n');

  // Locate the US House section header
  const houseSectionIdx = lines.findIndex((line) => line.includes('US HOUSE'));
  if (houseSectionIdx === -1) {
    console.error('US House section not found in CSV');
    return [];
  }

  // The line immediately after the section header is the column header row
  // Find where the next section (▶) starts to know the end boundary
  const nextSectionIdx = lines
    .slice(houseSectionIdx + 2)
    .findIndex((line) => line.trimStart().startsWith('▶'));
  const endIdx =
    nextSectionIdx === -1
      ? lines.length
      : houseSectionIdx + 2 + nextSectionIdx;

  const sectionLines = lines.slice(houseSectionIdx + 1, endIdx);
  if (!sectionLines.length) return [];

  // Parse with PapaParse (header: false so column index access is safe
  // despite Unicode chars like – in the header row)
  const { data } = Papa.parse(sectionLines.join('\n'), {
    skipEmptyLines: true,
    header: false,
  });

  // Column indices (from the CSV header row):
  // 0: Race, 1: State, 2: Cook Rating, 3: Margin (pts),
  // 4: Source, 5: σ_eff, 6: VP Raw, 7: Voter Power (0–100)
  const COL = { RACE: 0, STATE: 1, COOK: 2, MARGIN: 3, SOURCE: 4, VP: 7 };

  const races = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[COL.RACE]) continue;

    const race = row[COL.RACE].trim();
    if (!race.startsWith('Congressional District')) continue;

    const districtMatch = race.match(/Congressional District (\d+)/);
    if (!districtMatch) continue;

    const districtNum = parseInt(districtMatch[1], 10);
    // Strip annotation markers (e.g. "Virginia ⚠️" → "Virginia")
    const state = row[COL.STATE]?.trim().replace(/\s*⚠️.*$/, '');
    const cookRating = row[COL.COOK]?.trim();
    const margin = parseFloat(row[COL.MARGIN]);
    const source = row[COL.SOURCE]?.trim();
    const voterPower = parseFloat(row[COL.VP]);

    if (!state || isNaN(voterPower)) continue;

    const geoid = getGEOID(state, districtNum);
    const abbr = STATE_ABBR[state] ?? state;
    const label = `${abbr}-${districtNum}`;

    races.push({
      geoid,
      label,
      race,
      state,
      districtNum,
      cookRating,
      margin,
      source,
      voterPower,
    });
  }

  // Sort highest voter power first
  return races.sort((a, b) => b.voterPower - a.voterPower);
}
