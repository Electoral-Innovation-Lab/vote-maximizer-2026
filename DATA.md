# Model data (public/data)

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
- **Donation power is shown only where voter power ≥ 50** (`DONATION_VP_MIN` in `districtUtils.js`);
  below that, cheap long-shot races would top the donor ranking.
- Poll-level FiftyPlusOne data is never exported; do not add it to the site.
