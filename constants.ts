import { ChartDataPoint, ActivityItem } from './types';

export const REVENUE_DATA: ChartDataPoint[] = [
  { name: 'Jan', value: 4000, uv: 2400 },
  { name: 'Feb', value: 3000, uv: 1398 },
  { name: 'Mar', value: 2000, uv: 9800 },
  { name: 'Apr', value: 2780, uv: 3908 },
  { name: 'May', value: 1890, uv: 4800 },
  { name: 'Jun', value: 2390, uv: 3800 },
  { name: 'Jul', value: 3490, uv: 4300 },
];

export const USER_DISTRIBUTION_DATA = [
  { name: 'Mobile', value: 400 },
  { name: 'Desktop', value: 300 },
  { name: 'Tablet', value: 300 },
  { name: 'Other', value: 200 },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: 1, user: "Alice Freeman", action: "Purchased Subscription", time: "2 min ago", avatar: "https://picsum.photos/40/40?random=1" },
  { id: 2, user: "Bob Smith", action: "Updated Profile", time: "15 min ago", avatar: "https://picsum.photos/40/40?random=2" },
  { id: 3, user: "Charlie Kim", action: "Login attempt failed", time: "1 hour ago", avatar: "https://picsum.photos/40/40?random=3" },
  { id: 4, user: "Diana Prince", action: "New comment on post", time: "3 hours ago", avatar: "https://picsum.photos/40/40?random=4" },
];

export const DASHBOARD_SUMMARY = `
Current Revenue: $54,230 (+12%)
Active Users: 2,453 (+5%)
Bounce Rate: 42.3% (-2%)
Recent trend shows significant growth in March followed by stabilization.
User base is primarily mobile (33%).
`;

// --- Matrix Generator Constants ---

export const COUNTRY_GROUPS = {
  EU: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ],
  // "EU (inc. oversea territory of the EU)" - For this example, we add typical special territories or just replicate EU + known territories if distinct.
  // Assuming this implies standard EU 27 + Outermost Regions which are technically part of EU VAT area in some contexts or Customs Union.
  EU_INC_OT: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'GF', 'GP', 'MQ', 'YT', 'RE', 'MF', 'BL', 'PM', 'WF', 'PF', 'NC' // Adding French/Other territories as example of "OT"
  ],
  FR_INC_DOM: [
    'FR', 'MC', 'GP', 'MQ', 'GF', 'RE', 'YT' // France + Guadeloupe, Martinique, Guyane, La Réunion, Mayotte
  ]
};

export const ISO_COUNTRIES = [
  "EU", "Outside EU", "EU (inc. OT)", "FR (inc. DOM)",
  "AF", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CD", "CG", "CK", "CR", "HR", "CU", "CW", "CY", "CZ", "CI", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RO", "RU", "RW", "RE", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
];