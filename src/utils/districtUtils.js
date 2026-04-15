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

// States with a single at-large representative; Census uses CD "00" in GEOID
const AT_LARGE_STATES = new Set([
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

export const COOK_CONFIG = {
  'toss-up':  { label: 'Toss-Up',  color: '#92400e', bg: '#fef3c7' },
  'lean-D':   { label: 'Lean D',   color: '#1e40af', bg: '#dbeafe' },
  'lean-R':   { label: 'Lean R',   color: '#991b1b', bg: '#fee2e2' },
  'likely-D': { label: 'Likely D', color: '#1e3a8a', bg: '#bfdbfe' },
  'likely-R': { label: 'Likely R', color: '#7f1d1d', bg: '#fecaca' },
  'solid-D':  { label: 'Solid D',  color: '#1e3a8a', bg: '#93c5fd' },
  'solid-R':  { label: 'Solid R',  color: '#7f1d1d', bg: '#fca5a5' },
};
