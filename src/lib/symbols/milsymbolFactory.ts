import ms from 'milsymbol';

// Cache generated symbol SVGs to avoid re-rendering
const symbolCache = new Map<string, string>();

interface SymbolOptions {
  military: boolean;
  onGround: boolean;
  heading?: number;
}

function getAircraftSIDC(options: SymbolOptions): string {
  // MIL-STD-2525C Symbol Identification Code
  // Format: SAICDFHGEE--LLL
  // S = Coding scheme (S = Warfighting)
  // A = Affiliation (F = Friend, H = Hostile, N = Neutral, U = Unknown)
  // I = Battle dimension (A = Air)
  // C-D = Function ID

  const affiliation = options.military ? 'H' : 'N'; // hostile mil, neutral civilian
  const dimension = options.onGround ? 'G' : 'A'; // ground or air

  if (options.onGround) {
    return `S${affiliation}G-UCI---`;  // Ground unit
  }

  // Air symbols
  if (options.military) {
    return `S${affiliation}AP------`; // Military aircraft
  }
  return `S${affiliation}APCF----`;   // Civilian fixed-wing
}

export function createAircraftSymbolSvg(options: SymbolOptions, size: number = 24): string {
  const sidc = getAircraftSIDC(options);
  const cacheKey = `${sidc}-${size}`;

  const cached = symbolCache.get(cacheKey);
  if (cached) return cached;

  const symbol = new ms.Symbol(sidc, {
    size: size,
    frame: true,
    fill: true,
    ...(options.military
      ? { fillColor: '#ff444433', iconColor: '#ff4444' }
      : { fillColor: '#00aaff33', iconColor: '#00aaff' }
    ),
  } as Record<string, unknown>);

  const svg = symbol.asSVG();
  symbolCache.set(cacheKey, svg);
  return svg;
}

export function createEventSymbolSvg(sidc: string, size: number = 20): string {
  const cacheKey = `event-${sidc}-${size}`;
  const cached = symbolCache.get(cacheKey);
  if (cached) return cached;

  const symbol = new ms.Symbol(sidc, {
    size: size,
    frame: true,
    fill: true,
  } as Record<string, unknown>);

  const svg = symbol.asSVG();
  symbolCache.set(cacheKey, svg);
  return svg;
}
