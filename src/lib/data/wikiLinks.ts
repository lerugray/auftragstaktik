// Maps ICAO aircraft type designators to Wikipedia article slugs
const AIRCRAFT_WIKI: Record<string, string> = {
  // US Military
  C17: 'Boeing_C-17_Globemaster_III',
  C130: 'Lockheed_C-130_Hercules',
  C5M: 'Lockheed_C-5_Galaxy',
  C5: 'Lockheed_C-5_Galaxy',
  F16: 'General_Dynamics_F-16_Fighting_Falcon',
  F15: 'McDonnell_Douglas_F-15_Eagle',
  F18: 'McDonnell_Douglas_F/A-18_Hornet',
  F22: 'Lockheed_Martin_F-22_Raptor',
  F35: 'Lockheed_Martin_F-35_Lightning_II',
  B52: 'Boeing_B-52_Stratofortress',
  B1: 'Rockwell_B-1_Lancer',
  B2: 'Northrop_Grumman_B-2_Spirit',
  KC135: 'Boeing_KC-135_Stratotanker',
  KC10: 'McDonnell_Douglas_KC-10_Extender',
  KC46: 'Boeing_KC-46_Pegasus',
  E3: 'Boeing_E-3_Sentry',
  E6: 'Boeing_E-6_Mercury',
  E8: 'Northrop_Grumman_E-8_Joint_STARS',
  P8: 'Boeing_P-8_Poseidon',
  P3: 'Lockheed_P-3_Orion',
  RQ4: 'Northrop_Grumman_RQ-4_Global_Hawk',
  MQ9: 'General_Atomics_MQ-9_Reaper',
  V22: 'Bell_Boeing_V-22_Osprey',
  A10: 'Fairchild_Republic_A-10_Thunderbolt_II',
  C2: 'Grumman_C-2_Greyhound',
  H60: 'Sikorsky_UH-60_Black_Hawk',
  C40: 'Boeing_C-40_Clipper',
  C32: 'Boeing_C-32',
  C37: 'Gulfstream_V',
  RC135: 'Boeing_RC-135',
  RC12: 'Beechcraft_RC-12_Guardrail',
  MC12: 'Beechcraft_MC-12_Liberty',
  E2: 'Northrop_Grumman_E-2_Hawkeye',
  CH47: 'Boeing_CH-47_Chinook',
  AH64: 'Boeing_AH-64_Apache',
  UH1: 'Bell_UH-1_Iroquois',
  C12: 'Beechcraft_C-12_Huron',

  // European Military
  EF2K: 'Eurofighter_Typhoon',
  RFAL: 'Dassault_Rafale',
  F2TH: 'Dassault_Falcon_2000',
  A400: 'Airbus_A400M_Atlas',
  C295: 'Airbus_C-295',
  MRTT: 'Airbus_A330_MRTT',
  NH90: 'NHIndustries_NH90',
  SA34: 'Eurocopter_AS365_Dauphin',

  // Russian
  SU27: 'Sukhoi_Su-27',
  SU30: 'Sukhoi_Su-30',
  SU34: 'Sukhoi_Su-34',
  SU35: 'Sukhoi_Su-35',
  SU57: 'Sukhoi_Su-57',
  SU25: 'Sukhoi_Su-25',
  MIG29: 'Mikoyan_MiG-29',
  MIG31: 'Mikoyan_MiG-31',
  IL76: 'Ilyushin_Il-76',
  IL96: 'Ilyushin_Il-96',
  TU95: 'Tupolev_Tu-95',
  TU160: 'Tupolev_Tu-160',
  TU22M: 'Tupolev_Tu-22M',
  TU204: 'Tupolev_Tu-204',
  TU154: 'Tupolev_Tu-154',
  AN124: 'Antonov_An-124_Ruslan',
  AN26: 'Antonov_An-26',
  AN72: 'Antonov_An-72',
  AN148: 'Antonov_An-148',
  MI8: 'Mil_Mi-8',
  MI24: 'Mil_Mi-24',
  MI26: 'Mil_Mi-26',
  MI28: 'Mil_Mi-28',
  KA52: 'Kamov_Ka-52',

  // Airbus Commercial
  A388: 'Airbus_A380',
  A380: 'Airbus_A380',
  A359: 'Airbus_A350',
  A35K: 'Airbus_A350',
  A350: 'Airbus_A350',
  A333: 'Airbus_A330',
  A332: 'Airbus_A330',
  A339: 'Airbus_A330neo',
  A330: 'Airbus_A330',
  A321: 'Airbus_A321',
  A320: 'Airbus_A320_family',
  A319: 'Airbus_A319',
  A318: 'Airbus_A318',
  A21N: 'Airbus_A321neo',
  A20N: 'Airbus_A320neo_family',

  // Boeing Commercial
  B738: 'Boeing_737_Next_Generation',
  B737: 'Boeing_737',
  B739: 'Boeing_737_Next_Generation',
  B38M: 'Boeing_737_MAX',
  B39M: 'Boeing_737_MAX',
  B744: 'Boeing_747-400',
  B748: 'Boeing_747-8',
  B747: 'Boeing_747',
  B752: 'Boeing_757',
  B753: 'Boeing_757',
  B757: 'Boeing_757',
  B762: 'Boeing_767',
  B763: 'Boeing_767',
  B764: 'Boeing_767',
  B767: 'Boeing_767',
  B772: 'Boeing_777',
  B773: 'Boeing_777',
  B77L: 'Boeing_777',
  B77W: 'Boeing_777',
  B779: 'Boeing_777X',
  B777: 'Boeing_777',
  B788: 'Boeing_787_Dreamliner',
  B789: 'Boeing_787_Dreamliner',
  B78X: 'Boeing_787_Dreamliner',
  B787: 'Boeing_787_Dreamliner',

  // Other Commercial / Business
  E170: 'Embraer_E-Jet_family',
  E175: 'Embraer_E-Jet_family',
  E190: 'Embraer_E-Jet_family',
  E195: 'Embraer_E-Jet_family',
  E75L: 'Embraer_E-Jet_family',
  E75S: 'Embraer_E-Jet_family',
  CRJ2: 'Bombardier_CRJ200',
  CRJ7: 'Bombardier_CRJ700_series',
  CRJ9: 'Bombardier_CRJ700_series',
  CRJX: 'Bombardier_CRJ700_series',
  DH8D: 'De_Havilland_Canada_Dash_8',
  DH8A: 'De_Havilland_Canada_Dash_8',
  AT76: 'ATR_72',
  AT75: 'ATR_72',
  AT72: 'ATR_72',
  AT45: 'ATR_42',
  GLEX: 'Bombardier_Global_Express',
  GL7T: 'Bombardier_Global_7500',
  GLF5: 'Gulfstream_V',
  GLF6: 'Gulfstream_G650',
  G280: 'Gulfstream_G280',
  CL60: 'Bombardier_Challenger_600_series',
  CL35: 'Bombardier_Challenger_300',
  C56X: 'Cessna_Citation_Excel',
  C680: 'Cessna_Citation_Sovereign',
  C750: 'Cessna_Citation_X',
  LJ45: 'Learjet_45',
  LJ75: 'Learjet_75',
  PC12: 'Pilatus_PC-12',
  PC24: 'Pilatus_PC-24',
  BE40: 'Beechcraft_Beechjet',
  B350: 'Beechcraft_King_Air_350',
  BE20: 'Beechcraft_Super_King_Air',
  C208: 'Cessna_208_Caravan',
  C172: 'Cessna_172',
  PA28: 'Piper_PA-28_Cherokee',
  DA42: 'Diamond_DA42',

  // Ground infrastructure (not aircraft — but show up in ADS-B data)
  TWR: 'Air_traffic_control',
  GND: 'Air_traffic_control',
  RAMP: 'Airport_ramp',
};

// Maps vessel class names to Wikipedia slugs
const VESSEL_WIKI: Record<string, string> = {
  'Nimitz-class': 'Nimitz-class_aircraft_carrier',
  'Gerald R. Ford-class': 'Gerald_R._Ford-class_aircraft_carrier',
  'Arleigh Burke-class': 'Arleigh_Burke-class_destroyer',
  'Ticonderoga-class': 'Ticonderoga-class_cruiser',
  'Virginia-class': 'Virginia-class_submarine',
  'Ohio-class': 'Ohio-class_submarine',
  'San Antonio-class': 'San_Antonio-class_amphibious_transport_dock',
  'Wasp-class': 'Wasp-class_amphibious_assault_ship',
  'Kilo-class': 'Kilo-class_submarine',
  'Admiral Gorshkov-class': 'Admiral_Gorshkov-class_frigate',
  'Slava-class': 'Slava-class_cruiser',
  'Kirov-class': 'Kirov-class_battlecruiser',
  'Kuznetsov-class': 'Russian_aircraft_carrier_Admiral_Kuznetsov',
  'Type 45': 'Type_45_destroyer',
  'Type 23': 'Type_23_frigate',
  'Queen Elizabeth-class': 'Queen_Elizabeth-class_aircraft_carrier',
  'FREMM': 'FREMM_multipurpose_frigate',
  'Sachsen-class': 'Sachsen-class_frigate',
  'Sa\'ar 6-class': "Sa'ar_6-class_corvette",
};

// ICAO type code prefix → manufacturer name for smarter search fallback
const MANUFACTURER_PREFIX: Record<string, string> = {
  A: 'Airbus',
  B7: 'Boeing 7',
  B3: 'Boeing 737',
  C1: 'Cessna',
  C5: 'Cessna Citation',
  C6: 'Cessna Citation',
  C7: 'Cessna Citation',
  E1: 'Embraer',
  E7: 'Embraer',
  GL: 'Gulfstream',
  G2: 'Gulfstream',
  G5: 'Gulfstream',
  LJ: 'Learjet',
  CL: 'Bombardier Challenger',
  CR: 'Bombardier CRJ',
  DH: 'De Havilland Dash',
  AT: 'ATR',
  PC: 'Pilatus',
  BE: 'Beechcraft',
  PA: 'Piper',
  DA: 'Diamond',
  SU: 'Sukhoi Su-',
  MI: 'Mil Mi-',
  AN: 'Antonov An-',
  TU: 'Tupolev Tu-',
  IL: 'Ilyushin Il-',
  KA: 'Kamov Ka-',
  F1: 'Fighter F-',
  F2: 'Fighter F-',
  F3: 'Fighter F-',
  KC: 'Boeing KC-',
  RC: 'Boeing RC-',
};

const WIKI_BASE = 'https://en.wikipedia.org/wiki/';

function buildSmartSearchUrl(typeCode: string): string {
  // Try to find a manufacturer prefix match for a better search
  const upper = typeCode.toUpperCase();
  for (const [prefix, manufacturer] of Object.entries(MANUFACTURER_PREFIX)) {
    if (upper.startsWith(prefix)) {
      // Extract the numeric part after the prefix for a more specific search
      const remainder = upper.substring(prefix.length);
      const searchTerm = `${manufacturer}${remainder} aircraft`;
      return WIKI_BASE + 'Special:Search/' + encodeURIComponent(searchTerm);
    }
  }
  // Last resort: search with "ICAO" context so Wikipedia knows it's an aircraft code
  return WIKI_BASE + 'Special:Search/' + encodeURIComponent(`${typeCode} ICAO aircraft type`);
}

export function getAircraftWikiUrl(typeCode: string): string {
  const normalized = typeCode.replace(/[-\s]/g, '').toUpperCase();
  const slug = AIRCRAFT_WIKI[normalized];
  if (slug) return WIKI_BASE + slug;
  return buildSmartSearchUrl(typeCode);
}

export function getVesselWikiUrl(shipClass: string): string {
  const slug = VESSEL_WIKI[shipClass];
  if (slug) return WIKI_BASE + slug;
  return WIKI_BASE + 'Special:Search/' + encodeURIComponent(shipClass + ' warship class');
}
