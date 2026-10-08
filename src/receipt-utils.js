export const RECEIPT_TYPES = ['daily', 'weekly', 'monthly', 'yearly'];
export const THEMES = ['classic', 'dark', 'pastel'];
export const MAX_ITEMS = 10;

export const DEFAULT_ITEMS = [
  { id: 'focus', key: 'Focus time', value: '18h 30m' },
  { id: 'tasks', key: 'Tasks shipped', value: '24' },
  { id: 'coffee', key: 'Coffee', value: '5 cups' },
];

export const PRESETS = {
  normal: {
    items: [
      ['Screen time', '5h 20m'],
      ['Sleep', '7h 30m'],
      ['Coffee', '2 cups'],
    ],
  },
  developer: {
    type: 'weekly',
    items: [
      ['Pull requests', '8 merged'],
      ['Bugs squashed', '17'],
      ['Focus time', '21h 40m'],
      ['Coffee', '6 cups'],
    ],
  },
  reading: {
    items: [
      ['Pages read', '286'],
      ['Books finished', '2'],
      ['Favorite chapter', 'The last one'],
    ],
  },
  fitness: {
    items: [
      ['Workouts', '4 sessions'],
      ['Distance', '18.6 km'],
      ['Active time', '3h 45m'],
    ],
  },
  student: {
    items: [
      ['Study time', '14h 20m'],
      ['Assignments', '5 done'],
      ['Flashcards', '180 reviewed'],
    ],
  },
};

export function defaultTitle(type) {
  return `My ${type === 'daily' ? 'day' : type === 'weekly' ? 'week' : type === 'monthly' ? 'month' : 'year'} receipt`;
}

export function formatReceiptDate(type, now = new Date()) {
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

  if (type === 'daily') return `${short.format(current)} ${current.getFullYear()}`;
  if (type === 'monthly') return monthYear.format(current);
  if (type === 'yearly') return String(current.getFullYear());

  const start = new Date(current);
  start.setDate(start.getDate() - 6);
  if (start.getFullYear() !== current.getFullYear()) {
    return `${short.format(start)} ${start.getFullYear()} to ${short.format(current)} ${current.getFullYear()}`;
  }
  return `${short.format(start)} to ${short.format(current)} ${current.getFullYear()}`;
}

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function rowsFromPreset(preset) {
  return preset.items.map(([key, value]) => ({ id: makeId(), key, value }));
}

export function randomOrderNumber() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function randomBarcode() {
  return Array.from({ length: 38 }, (_, index) => ({
    width: 1 + Math.floor(Math.random() * 4),
    gap: 1 + Math.floor(Math.random() * 2),
    short: index % 7 === 0 || index % 11 === 0,
  }));
}

function cleanText(value, fallback = '', max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

export function validateStoredState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, MAX_ITEMS).map((item) => ({
        id: makeId(),
        key: cleanText(item?.key, '', 120),
        value: cleanText(item?.value, '', 120),
      }))
    : [];

  return {
    type: RECEIPT_TYPES.includes(raw.type) ? raw.type : 'weekly',
    customTitle: cleanText(raw.customTitle, '', 160),
    name: cleanText(raw.name, '', 120),
    theme: THEMES.includes(raw.theme) ? raw.theme : 'classic',
    footer: cleanText(raw.footer, 'yourwebsite.com', 180),
    finalMessage: cleanText(raw.finalMessage, 'A busy week', 180),
    showBarcode: typeof raw.showBarcode === 'boolean' ? raw.showBarcode : true,
    showOrder: typeof raw.showOrder === 'boolean' ? raw.showOrder : true,
    items: items.length ? items : DEFAULT_ITEMS.map((item) => ({ ...item, id: makeId() })),
  };
}

export function getInitialState() {
  const defaults = {
    type: 'weekly',
    customTitle: '',
    name: '@username',
    theme: 'classic',
    footer: 'yourwebsite.com',
    finalMessage: 'A busy week',
    showBarcode: true,
    showOrder: true,
    items: DEFAULT_ITEMS.map((item) => ({ ...item, id: makeId() })),
  };
  try {
    const stored = validateStoredState(JSON.parse(localStorage.getItem('receiptly-state')));
    return stored || defaults;
  } catch {
    return defaults;
  }
}

export function fileNameFor(type) {
  return `my-${type === 'daily' ? 'day' : type === 'weekly' ? 'week' : type === 'monthly' ? 'month' : 'year'}-receipt.png`;
}
