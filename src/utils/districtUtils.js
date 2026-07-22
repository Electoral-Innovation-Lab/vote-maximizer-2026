export const STATE_FIPS = {
  Alabama: '01', Alaska: '02', Arizona: '04', Arkansas: '05',
  California: '06', Colorado: '08', Connecticut: '09', Delaware: '10',
  Florida: '12', Georgia: '13', Hawaii: '15', Idaho: '16',
  Illinois: '17', Indiana: '18', Iowa: '19', Kansas: '20',
  Kentucky: '21', Louisiana: '22', Maine: '23', Maryland: '24',
  Massachusetts: '25', Michigan: '26', Minnesota: '27', Mississippi: '28',
  Missouri: '29', Montana: '30', Nebraska: '31', Nevada: '32',
  'New Hampshire': '33', 'New Jersey': '34', 'New Mexico': '35', 'New York': '36',
  'North Carolina': '37', 'North Dakota': '38', Ohio: '39', Oklahoma: '40',
  Oregon: '41', Pennsylvania: '42', 'Rhode Island': '44', 'South Carolina': '45',
  'South Dakota': '46', Tennessee: '47', Texas: '48', Utah: '49',
  Vermont: '50', Virginia: '51', Washington: '53', 'West Virginia': '54',
  Wisconsin: '55', Wyoming: '56',
};

export const STATE_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
};

// States with a single at-large representative
export const AT_LARGE_STATES = new Set([
  'Alaska', 'Delaware', 'North Dakota', 'South Dakota', 'Vermont', 'Wyoming',
]);

export function getGEOID(stateName, districtNum) {
  const fips = STATE_FIPS[stateName];
  if (!fips) return null;
  if (AT_LARGE_STATES.has(stateName)) return fips + '00';
  return fips + String(districtNum).padStart(2, '0');
}

// Warm gradient: light yellow → orange → red (high VP = more intense)
export function getDistrictColor(voterPower) {
  if (voterPower === null || voterPower === undefined) return '#cbd5e1';
  const t = Math.min(1, Math.max(0, voterPower / 100));
  const hue = Math.round(52 - t * 52);         // 52° (yellow) → 0° (red)
  const saturation = Math.round(85 + t * 10);  // 85% → 95%
  const lightness = Math.round(90 - t * 40);   // 90% → 50%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const STATE_CENTROIDS = {
  Alabama: [32.779, -86.829], Alaska: [64.201, -153.494], Arizona: [34.274, -111.660],
  Arkansas: [34.894, -92.443], California: [37.184, -119.470], Colorado: [38.997, -105.548],
  Connecticut: [41.622, -72.727], Delaware: [38.990, -75.505], Florida: [28.631, -82.450],
  Georgia: [32.642, -83.443], Hawaii: [20.293, -156.374], Idaho: [44.351, -114.613],
  Illinois: [40.042, -89.197], Indiana: [39.894, -86.282], Iowa: [42.075, -93.496],
  Kansas: [38.494, -98.380], Kentucky: [37.535, -85.302], Louisiana: [31.069, -91.997],
  Maine: [45.370, -69.243], Maryland: [39.055, -76.791], Massachusetts: [42.260, -71.808],
  Michigan: [44.347, -85.410], Minnesota: [46.281, -94.305], Mississippi: [32.736, -89.668],
  Missouri: [38.357, -92.458], Montana: [46.880, -110.363], Nebraska: [41.538, -99.795],
  Nevada: [38.420, -116.753], 'New Hampshire': [43.681, -71.581], 'New Jersey': [40.191, -74.673],
  'New Mexico': [34.407, -106.113], 'New York': [42.954, -75.527], 'North Carolina': [35.556, -79.388],
  'North Dakota': [47.450, -100.466], Ohio: [40.286, -82.794], Oklahoma: [35.589, -97.494],
  Oregon: [43.934, -120.558], Pennsylvania: [40.878, -77.800], 'Rhode Island': [41.676, -71.556],
  'South Carolina': [33.917, -80.896], 'South Dakota': [44.444, -100.226], Tennessee: [35.858, -86.351],
  Texas: [31.476, -99.331], Utah: [39.321, -111.094], Vermont: [44.069, -72.666],
  Virginia: [37.522, -78.854], Washington: [47.383, -120.447], 'West Virginia': [38.641, -80.623],
  Wisconsin: [44.624, -89.994], Wyoming: [42.996, -107.551],
};

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const URBANICITY_CONFIG = {
  urban:    { label: 'Urban',    color: '#6d28d9', bg: '#ede9fe' },
  suburban: { label: 'Suburban', color: '#0f766e', bg: '#ccfbf1' },
  rural:    { label: 'Rural',    color: '#65a30d', bg: '#ecfccb' },
};

export const COOK_CONFIG = {
  'toss-up':  { label: 'Toss-Up',  color: '#92400e', bg: '#fef3c7' },
  'lean-D':   { label: 'Lean D',   color: '#1e40af', bg: '#dbeafe' },
  'lean-R':   { label: 'Lean R',   color: '#991b1b', bg: '#fee2e2' },
  'likely-D': { label: 'Likely D', color: '#1e3a8a', bg: '#bfdbfe' },
  'likely-R': { label: 'Likely R', color: '#7f1d1d', bg: '#fecaca' },
  'solid-D':  { label: 'Solid D',  color: '#1e3a8a', bg: '#93c5fd' },
  'solid-R':  { label: 'Solid R',  color: '#7f1d1d', bg: '#fca5a5' },
  retention:    { label: 'Retention',   color: '#3f3f46', bg: '#e4e4e7' },
  nonpartisan:  { label: 'Nonpartisan', color: '#3f3f46', bg: '#e4e4e7' },
};
