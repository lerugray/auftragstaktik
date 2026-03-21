// Map event types to MIL-STD-2525C Symbol Identification Codes (SIDC)
// Format: SAICDFHGEE--LLL (15 characters)
// S = Scheme (S=Warfighting), A = Affiliation, I = Battle dimension
// Affiliations: F=Friend, H=Hostile, N=Neutral, U=Unknown

export interface SIDCMapping {
  sidc: string;
  label: string;
}

const EVENT_SIDC_MAP: Record<string, SIDCMapping> = {
  // Explosions / Strikes
  'Missile strike': { sidc: 'SHGPUCFRMS----', label: 'Missile Strike' },
  'Drone strike': { sidc: 'SHAPUCFRD-----', label: 'Drone Strike' },
  'Air/drone strike': { sidc: 'SHAPUCFRD-----', label: 'Air/Drone Strike' },
  'Explosion/Strike': { sidc: 'SHGPUCFRSS----', label: 'Explosion' },
  'Artillery/Shelling': { sidc: 'SHGPUCFRA-----', label: 'Artillery' },
  'Shelling/artillery/missile attack': { sidc: 'SHGPUCFRA-----', label: 'Artillery/Missile' },

  // Combat
  'Armed clash': { sidc: 'SHGPUCI-------', label: 'Armed Clash' },
  'Battles': { sidc: 'SHGPUCI-------', label: 'Battle' },

  // Equipment
  'Tank destroyed': { sidc: 'SHGPUCAT------', label: 'Tank (Destroyed)' },
  'Vehicle destroyed': { sidc: 'SHGPUCAW------', label: 'Vehicle (Destroyed)' },
  'APC/IFV destroyed': { sidc: 'SHGPUCAI------', label: 'APC/IFV (Destroyed)' },

  // Air / Naval
  'Aircraft': { sidc: 'SHAP----------', label: 'Aircraft' },
  'Naval': { sidc: 'SHSPCL--------', label: 'Naval' },

  // Other
  'Fire/Smoke': { sidc: 'SHGPUCF-------', label: 'Fire/Smoke' },
  'Fortification': { sidc: 'SHGPUCF-------', label: 'Fortification' },
  'Troops': { sidc: 'SHGPUCI-------', label: 'Troops' },
  'Conflict event': { sidc: 'SHGPE---------', label: 'Conflict Event' },

  // Strategic
  'Strategic developments': { sidc: 'SHGPE---------', label: 'Strategic Dev.' },
  'Other': { sidc: 'SHGPE---------', label: 'Event' },
};

// Default SIDC for unknown event types
const DEFAULT_SIDC: SIDCMapping = { sidc: 'SHGPE---------', label: 'Unknown Event' };

export function getEventSIDC(eventType: string, side?: string): SIDCMapping {
  const mapping = EVENT_SIDC_MAP[eventType] || DEFAULT_SIDC;

  // Adjust affiliation based on side
  if (side === 'friendly' || side === 'Ukraine') {
    return {
      ...mapping,
      sidc: 'SF' + mapping.sidc.substring(2), // Friend
    };
  }

  return mapping; // Default is Hostile (H)
}

export function getAllEventTypes(): string[] {
  return Object.keys(EVENT_SIDC_MAP);
}
