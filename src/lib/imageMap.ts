// Maps string keys (stored in DB) to logo image src URLs
// These are resolved at module load time via Next.js static imports

// eslint-disable-next-line @typescript-eslint/no-require-imports
const aeclLogo = require('../images/Logo/AECL logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const apicsLogo = require('../images/Logo/apics.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const carletonLogo = require('../images/Logo/carleton.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const centennialLogo = require('../images/Logo/centennial.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cnlLogo = require('../images/Logo/CNL Logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hydroOneLogo = require('../images/Logo/Hydro One logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const uoitLogo = require('../images/Logo/Ontario University Logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const opgLogo = require('../images/Logo/OPG logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const peoLogo = require('../images/Logo/PEO.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pmpLogo = require('../images/Logo/PMP.png');

function getSrc(mod: any): string {
  return mod?.default?.src ?? mod?.src ?? '';
}

export const IMAGE_KEYS = {
  aecl: 'aecl',
  apics: 'apics',
  carleton: 'carleton',
  centennial: 'centennial',
  cnl: 'cnl',
  hydroone: 'hydroone',
  uoit: 'uoit',
  opg: 'opg',
  peo: 'peo',
  pmp: 'pmp',
} as const;

const imageMap: Record<string, string> = {
  aecl: getSrc(aeclLogo),
  apics: getSrc(apicsLogo),
  carleton: getSrc(carletonLogo),
  centennial: getSrc(centennialLogo),
  cnl: getSrc(cnlLogo),
  hydroone: getSrc(hydroOneLogo),
  uoit: getSrc(uoitLogo),
  opg: getSrc(opgLogo),
  peo: getSrc(peoLogo),
  pmp: getSrc(pmpLogo),
};

export function resolveImageSrc(key: string | undefined | null): string | undefined {
  if (!key) return undefined;
  return imageMap[key] || undefined;
}
