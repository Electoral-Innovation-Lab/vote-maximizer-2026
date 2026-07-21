// One-time offline script: classifies each US House district as urban/suburban/rural
// based on what % of its land area overlaps Census-designated urban areas.
// Run with: node compute_urbanicity.js
// Writes data/data_urbanicity.csv and public/data_urbanicity.csv

import * as turf from '@turf/turf';
import { writeFileSync } from 'fs';
import { STATE_FIPS, STATE_ABBR, AT_LARGE_STATES } from './src/utils/districtUtils.js';

const TIGERWEB = 'https://tigerweb.geo.census.gov/arcgis/rest/services';
const SIMPLIFY_TOLERANCE = 0.001; // ~100m, keeps intersect() fast without meaningfully changing area %
const URBAN_THRESHOLD = 50;   // >=50% overlap -> urban
const SUBURBAN_THRESHOLD = 15; // >=15% overlap -> suburban, else rural

const FIPS_TO_ABBR = Object.fromEntries(
  Object.entries(STATE_FIPS).map(([name, fips]) => [fips, STATE_ABBR[name]])
);
const AT_LARGE_FIPS = new Set([...AT_LARGE_STATES].map((name) => STATE_FIPS[name]));

async function fetchGeoJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!data.features) throw new Error(`No features in response: ${text.slice(0, 200)}`);
      return data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

function simplifyFeature(f) {
  try {
    return turf.simplify(f, { tolerance: SIMPLIFY_TOLERANCE, highQuality: false, mutate: false });
  } catch {
    return f; // fall back to original geometry if simplify fails
  }
}

function districtGeoid(fips, cd119) {
  const abbr = FIPS_TO_ABBR[fips];
  if (!abbr) return null;
  if (AT_LARGE_FIPS.has(fips)) return `${abbr}-AT-LARGE`;
  return `${abbr}-${String(parseInt(cd119, 10)).padStart(2, '0')}`;
}

function bboxOf(features) {
  return turf.bbox(turf.featureCollection(features));
}

async function processState(fips) {
  const abbr = FIPS_TO_ABBR[fips];
  if (!abbr) return [];

  const distUrl = `${TIGERWEB}/TIGERweb/Legislative/MapServer/0/query?where=STATE=%27${fips}%27&outFields=GEOID,STATE,CD119,AREALAND,BASENAME&returnGeometry=true&outSR=4326&f=geojson`;
  const distData = await fetchGeoJSON(distUrl);
  if (!distData.features.length) return [];

  const [minX, minY, maxX, maxY] = bboxOf(distData.features);

  // Fetch candidate urban-area IDs first (cheap), then geometry in small batches -
  // fetching all matching urban areas' geometry in one shot can trip this network's
  // response-size limits for large/dense states (seen with NY, NC).
  const idsUrl = `${TIGERWEB}/Census2020/Urban/MapServer/1/query?geometry=${minX},${minY},${maxX},${maxY}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID&returnGeometry=false&f=geojson`;
  const idsData = await fetchGeoJSON(idsUrl);
  const ids = idsData.features.map((f) => f.properties.GEOID);

  const urbanAreas = [];
  const BATCH_SIZE = 15;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const where = `GEOID IN (${batch.map((id) => `'${id}'`).join(',')})`;
    const url = `${TIGERWEB}/Census2020/Urban/MapServer/1/query?where=${encodeURIComponent(where)}&outFields=GEOID&returnGeometry=true&outSR=4326&f=geojson`;
    const data = await fetchGeoJSON(url);
    urbanAreas.push(...data.features.map(simplifyFeature));
    await new Promise((r) => setTimeout(r, 200));
  }

  const rows = [];
  for (const rawDistrict of distData.features) {
    const geoid = districtGeoid(fips, rawDistrict.properties.CD119);
    if (!geoid) continue;

    const district = simplifyFeature(rawDistrict);
    const districtArea = turf.area(district);
    if (districtArea === 0) continue;

    let overlap = 0;
    for (const ua of urbanAreas) {
      if (!turf.booleanIntersects(district, ua)) continue;
      try {
        const inter = turf.intersect(turf.featureCollection([district, ua]));
        if (inter) overlap += turf.area(inter);
      } catch {
        // skip pathological geometry pairs rather than aborting the whole run
      }
    }

    const pct = Math.min(100, (overlap / districtArea) * 100);
    const urbanicity = pct >= URBAN_THRESHOLD ? 'urban' : pct >= SUBURBAN_THRESHOLD ? 'suburban' : 'rural';
    rows.push({ geoid, state: abbr, urbanPct: pct.toFixed(1), urbanicity });
  }
  return rows;
}

async function main() {
  const allRows = [];
  const fipsCodes = Object.keys(FIPS_TO_ABBR).sort();

  for (const fips of fipsCodes) {
    const abbr = FIPS_TO_ABBR[fips];
    try {
      const rows = await processState(fips);
      allRows.push(...rows);
      console.log(`${abbr}: ${rows.length} districts classified`);
    } catch (err) {
      console.error(`${abbr}: FAILED - ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // be polite to the free Census API
  }

  const header = 'geoid,state,urbanPct,urbanicity';
  const csv = [header, ...allRows.map((r) => `${r.geoid},${r.state},${r.urbanPct},${r.urbanicity}`)].join('\n');

  writeFileSync('./data/data_urbanicity.csv', csv);
  writeFileSync('./public/data_urbanicity.csv', csv);
  console.log(`\nDone. ${allRows.length} districts written to data/data_urbanicity.csv and public/data_urbanicity.csv`);
}

main();
