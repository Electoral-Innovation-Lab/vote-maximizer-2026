# Model data (public/data)

Current drop: **workbook v50** (`Vote_Maximizer_2026_v50_20261022.xlsx`), generated **2026-10-22**.

> v46–v50 note: this drop was produced by patching the v45 export with the differences between the workbooks (checked against the v45 export first), not by `vm_export_json.py`. Please regenerate with the exporter from the v50 workbook when convenient. Changes since v45: FEC refresh and independent expenditures in per-dollar power, Senate/Governor poll refresh, state-legislature scores scaled per state (`detail.voter_power_national` keeps the all-states score), Sabato chamber flags, PA Senate District 46 corrected, ballot-measure reconciliation (166 rows: 145 on the Nov 3 ballot, 19 decided, 2 removed). See the workbook's Update Log.

The site reads every voter-power number from `public/data/`, a JSON export of the Vote Maximizer
workbook produced by `vm_export_json.py` (in the data team's `vm_scripts`). Nothing in `src/` should
read spreadsheet column names directly; `src/utils/parseCSV.js` maps the export onto the race objects
the components use.

| File | Used for |
|---|---|
| `manifest.json` | Workbook version, export date, model settings (national environment, sigmas), data sources |
| `schema.json` | Field definitions for race records |
| `races/<type>.json` | One array per race type — what the loaders read |
| `races_all.json` | All races, no `detail` block (national rankings, future API) |
| `by_state/<AB>.json` | All races in one state (for lighter state / address lookups) |
| `flip/state_flip_summary.json`, `flip/states/<slug>.json` | Chance each state legislature chamber flips (default D+12.5; D+4.5 and D+8.5 scenarios included), Sabato-flagged states first, plus per-state detail |
| `reference/*.json` | Civic orgs, parties, primary calendar, local resources, candidates, RCV places |

## Updating the data

1. Data team refreshes the workbook (polls, FEC), recalculates it, and runs
   `python vm_export_json.py Vote_Maximizer_2026_vNN.xlsx vm26_json/`.
2. Replace `public/data/` with the new `vm26_json/` contents **except `full/`** (full is for
   internal/API use and is not needed by the site).
3. `npm run build`, check a few race pages (Senate, House, a state-legislature district), deploy.

## Things the site must keep

- **FiftyPlusOne credit**: races whose `margin_source` is polling show "Polling data: Powered by
  FiftyPlusOne" with a link (ContestDetail `DataNotes`). FiftyPlusOne's terms require it.
- **Donation power** exists only for House and Senate races (FEC data); other race types are greyed
  out in Donation Power mode.
- Poll-level FiftyPlusOne data is never exported; do not add it to the site.
