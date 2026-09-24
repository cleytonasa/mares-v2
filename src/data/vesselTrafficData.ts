import { VesselAIS, CustomUserLocation } from '../types/maritime';

export const INITIAL_USER_LOCATION: CustomUserLocation = {
  lat: -4.818417,
  lng: -37.044389,
  name: 'Canal de Acesso TERMISA (Coordenada Padrão)',
  dmsLat: `4°49'06.3"S`,
  dmsLng: `37°02'39.8"W`,
  isManual: false,
  estimatedBaseZHDepth: 4.8,
};

export const REGIONAL_POINTS_OF_INTEREST: {
  id: string;
  name: string;
  category: 'Canal' | 'Terminal' | 'Barra' | 'Porto' | 'Fundeio';
  lat: number;
  lng: number;
  dmsLat: string;
  dmsLng: string;
  estimatedBaseZHDepth: number;
  description: string;
}[] = [
  {
    id: 'user_base',
    name: `Coordenada Oficial (4°49'06.3"S 37°02'39.8"W)`,
    category: 'Canal',
    lat: -4.818417,
    lng: -37.044389,
    dmsLat: `4°49'06.3"S`,
    dmsLng: `37°02'39.8"W`,
    estimatedBaseZHDepth: 4.8,
    description: 'Ponto de controle e navegação oficial no alinhamento do canal de acesso ao TERMISA.',
  },
  {
    id: 'termisa_island',
    name: 'TERMISA - Terminal Salineiro de Areia Branca',
    category: 'Terminal',
    lat: -4.82500,
    lng: -37.04000,
    dmsLat: `4°49'30.0"S`,
    dmsLng: `37°02'24.0"W`,
    estimatedBaseZHDepth: 14.5,
    description: 'Ilha artificial de carregamento de sal marinho offshore (Capacidade para navios Panamax).',
  },
  {
    id: 'barra_upanema',
    name: 'Barra de Areia Branca (Ponta do Upanema)',
    category: 'Barra',
    lat: -4.91200,
    lng: -37.13500,
    dmsLat: `4°54'43.2"S`,
    dmsLng: `37°08'06.0"W`,
    estimatedBaseZHDepth: 2.2,
    description: 'Banco arenoso crítico na embocadura do Rio Mossoró. Requer monitoramento rigoroso de maré.',
  },
  {
    id: 'foz_rio_mossoro',
    name: 'Foz do Rio Mossoró (Entrada Fluvial)',
    category: 'Canal',
    lat: -4.95500,
    lng: -37.14200,
    dmsLat: `4°57'18.0"S`,
    dmsLng: `37°08'31.2"W`,
    estimatedBaseZHDepth: 1.9,
    description: 'Travessia de barcaças salineiras carregadas originárias das salinas fluviais.',
  },
  {
    id: 'porto_areia_branca',
    name: 'Porto de Areia Branca (Cais Fluvial)',
    category: 'Porto',
    lat: -4.95800,
    lng: -37.13300,
    dmsLat: `4°57'28.8"S`,
    dmsLng: `37°07'58.8"W`,
    estimatedBaseZHDepth: 2.5,
    description: 'Cais de atracação de barcaças, rebocadores de apoio e lanchas de praticagem.',
  },
  {
    id: 'barra_macau',
    name: 'Barra de Macau (Foz do Rio Piranhas-Açu)',
    category: 'Barra',
    lat: -5.06830,
    lng: -36.63420,
    dmsLat: `5°04'05.9"S`,
    dmsLng: `36°38'03.1"W`,
    estimatedBaseZHDepth: 1.8,
    description: 'Zona de arrebentação e baixio na saída de pesqueiros e barcaças salineiras de Macau.',
  },
  {
    id: 'fundeio_externo',
    name: 'Área de Fundeio de Navios Graneleiros (TERMISA)',
    category: 'Fundeio',
    lat: -4.80500,
    lng: -37.02500,
    dmsLat: `4°48'18.0"S`,
    dmsLng: `37°01'30.0"W`,
    estimatedBaseZHDepth: 16.0,
    description: 'Área de espera de maré e praticagem para navios de grande porte aguardando atracação.',
  },
  {
    id: 'guamare_terminal',
    name: 'Polo Petroquímico & Terminal de Guamaré',
    category: 'Terminal',
    lat: -5.10500,
    lng: -36.32000,
    dmsLat: `5°06'18.0"S`,
    dmsLng: `36°19'12.0"W`,
    estimatedBaseZHDepth: 12.0,
    description: 'Polo de petróleo e gás da Costa Branca com tráfego de rebocadores e PSVs de apoio offshore.',
  },
];

export const INITIAL_VESSELS: VesselAIS[] = [
  {
    id: 'vsl_barcaca_norsal_4',
    name: 'BARCAÇA NORSAL IV',
    type: 'barcaca',
    typeName: 'Barcaça Salineira Autopropelida',
    mmsi: '710004291',
    callSign: 'PP7842',
    flag: '🇧🇷 Brasil',
    lat: -4.8650,
    lng: -37.0850,
    dmsLat: `4°51'54.0"S`,
    dmsLng: `37°05'06.0"W`,
    heading: 42, // Subindo o canal rumo ao TERMISA
    speedKnots: 6.4,
    draftMeters: 3.2,
    lengthMeters: 65,
    beamMeters: 14,
    status: 'Navegando no Canal',
    destination: 'TERMISA OFFSHORE',
    eta: 'Hoje às 11:45',
    vhfChannel: 'Canal 16 / 68',
    lastAisUpdate: 'Há 1 min',
    cargo: 'Sal Marinho Granel (1.800 Ton)',
  },
  {
    id: 'vsl_barcaca_salimar_3',
    name: 'BARCAÇA SALIMAR III',
    type: 'barcaca',
    typeName: 'Barcaça Salineira',
    mmsi: '710005820',
    callSign: 'PX3491',
    flag: '🇧🇷 Brasil',
    lat: -4.9250,
    lng: -37.1320,
    dmsLat: `4°55'30.0"S`,
    dmsLng: `37°07'55.2"W`,
    heading: 350,
    speedKnots: 4.8,
    draftMeters: 3.0,
    lengthMeters: 58,
    beamMeters: 12,
    status: 'Navegando no Canal',
    destination: 'TERMISA',
    eta: 'Hoje às 12:30',
    vhfChannel: 'Canal 68',
    lastAisUpdate: 'Há 3 min',
    cargo: 'Sal Industrial (1.450 Ton)',
  },
  {
    id: 'vsl_barcaca_ab_1',
    name: 'SALINEIRA AREIA BRANCA I',
    type: 'barcaca',
    typeName: 'Barcaça Empurrada',
    mmsi: '710006114',
    callSign: 'PQ9012',
    flag: '🇧🇷 Brasil',
    lat: -4.8258,
    lng: -37.0392,
    dmsLat: `4°49'32.9"S`,
    dmsLng: `37°02'21.1"W`,
    heading: 180,
    speedKnots: 0.1,
    draftMeters: 2.1,
    lengthMeters: 70,
    beamMeters: 16,
    status: 'Operando no TERMISA',
    destination: 'TERMISA PIER SUL',
    eta: 'Operando',
    vhfChannel: 'Canal 12 / 16',
    lastAisUpdate: 'Tempo Real',
    cargo: 'Descarregando Sal em Silo',
  },
  {
    id: 'vsl_rebocador_camocim',
    name: 'REBOCADOR CAMOCIM',
    type: 'rebocador',
    typeName: 'Rebocador Portuário ASD (Azimutal)',
    mmsi: '710002340',
    callSign: 'PP3301',
    flag: '🇧🇷 Brasil',
    lat: -4.8210,
    lng: -37.0425,
    dmsLat: `4°49'15.6"S`,
    dmsLng: `37°02'33.0"W`,
    heading: 95,
    speedKnots: 3.2,
    draftMeters: 3.8,
    lengthMeters: 28,
    beamMeters: 9,
    status: 'Manobra de Reboque',
    destination: 'MANOBRA MV PANORMITIS',
    eta: 'Em Manobra',
    vhfChannel: 'Canal 16 / 68',
    lastAisUpdate: 'Tempo Real',
    cargo: 'Tração Estática: 55 Tons (Bollard Pull)',
  },
  {
    id: 'vsl_rebocador_titan',
    name: 'REBOCADOR TITAN',
    type: 'rebocador',
    typeName: 'Rebocador Costeiro & Empurrador',
    mmsi: '710007891',
    callSign: 'PW4421',
    flag: '🇧🇷 Brasil',
    lat: -4.8720,
    lng: -37.0910,
    dmsLat: `4°52'19.2"S`,
    dmsLng: `37°05'27.6"W`,
    heading: 45,
    speedKnots: 5.5,
    draftMeters: 2.9,
    lengthMeters: 24,
    beamMeters: 8,
    status: 'Manobra de Reboque',
    destination: 'CONVOI SALINEIRO',
    eta: 'Hoje às 11:50',
    vhfChannel: 'Canal 68',
    lastAisUpdate: 'Há 2 min',
    cargo: 'Empurrando Barcaça de Sal',
  },
  {
    id: 'vsl_rebocador_saveiros',
    name: 'REBOCADOR SAVEIROS PONTAL',
    type: 'rebocador',
    typeName: 'Rebocador Oceânico & Salvatagem',
    mmsi: '710001923',
    callSign: 'PP8810',
    flag: '🇧🇷 Brasil',
    lat: -4.8020,
    lng: -37.0210,
    dmsLat: `4°48'07.2"S`,
    dmsLng: `37°01'15.6"W`,
    heading: 120,
    speedKnots: 1.0,
    draftMeters: 4.2,
    lengthMeters: 32,
    beamMeters: 10,
    status: 'Fundeado',
    destination: 'FUNDEIO TERMISA',
    eta: 'Standby Praticagem',
    vhfChannel: 'Canal 16',
    lastAisUpdate: 'Há 4 min',
    cargo: 'Standby Operacional',
  },
  {
    id: 'vsl_navio_panormitis',
    name: 'MV PANORMITIS',
    type: 'navio',
    typeName: 'Navio Graneleiro (Bulk Carrier - Panamax)',
    mmsi: '354892000',
    callSign: '3E2914',
    imo: 'IMO 9482718',
    flag: '🇵🇦 Panamá',
    lat: -4.8242,
    lng: -37.0398,
    dmsLat: `4°49'27.1"S`,
    dmsLng: `37°02'23.3"W`,
    heading: 265,
    speedKnots: 0.0,
    draftMeters: 10.8,
    lengthMeters: 225,
    beamMeters: 32,
    status: 'Operando no TERMISA',
    destination: 'TERMISA / ROTTERDAM',
    eta: 'Atracado',
    vhfChannel: 'Canal 16 / 12',
    lastAisUpdate: 'Tempo Real',
    cargo: 'Carregando 48.000 Tons de Sal Marinho',
  },
  {
    id: 'vsl_navio_nord_baltic',
    name: 'MV NORD BALTIC',
    type: 'navio',
    typeName: 'Navio Graneleiro (Supramax)',
    mmsi: '563098200',
    callSign: '9V8812',
    imo: 'IMO 9621544',
    flag: '🇸🇬 Singapura',
    lat: -4.7950,
    lng: -37.0180,
    dmsLat: `4°47'42.0"S`,
    dmsLng: `37°01'04.8"W`,
    heading: 80,
    speedKnots: 0.2,
    draftMeters: 7.2, // Em lastro
    lengthMeters: 199,
    beamMeters: 32,
    status: 'Fundeado',
    destination: 'AREIA BRANCA / TERMISA',
    eta: 'Aguardando Berço',
    vhfChannel: 'Canal 16',
    lastAisUpdate: 'Tempo Real',
    cargo: 'Navio em Lastro para Embarque de Sal',
  },
  {
    id: 'vsl_praticagem_cb1',
    name: 'LANCHA PRATICAGEM COSTA BRANCA I',
    type: 'praticagem',
    typeName: 'Lancha de Praticagem Rápida',
    mmsi: '710009988',
    callSign: 'PR7711',
    flag: '🇧🇷 Brasil',
    lat: -4.8450,
    lng: -37.0620,
    dmsLat: `4°50'42.0"S`,
    dmsLng: `37°03'43.2"W`,
    heading: 38,
    speedKnots: 16.5,
    draftMeters: 1.2,
    lengthMeters: 14,
    beamMeters: 4,
    status: 'Patrulha / Apoio',
    destination: 'EMBARQUE DE PRÁTICO - TERMISA',
    eta: 'Hoje às 11:15',
    vhfChannel: 'Canal 16 / 68',
    lastAisUpdate: 'Tempo Real',
    cargo: 'Transporte de Práticos da Barra',
  },
  {
    id: 'vsl_pesqueiro_dom_bosco',
    name: 'B/P DOM BOSCO VII',
    type: 'pesqueiro',
    typeName: 'Embarcação de Pesca Oceânica (Atuneiro)',
    mmsi: '710003445',
    callSign: 'PW9923',
    flag: '🇧🇷 Brasil',
    lat: -4.9080,
    lng: -37.1320,
    dmsLat: `4°54'28.8"S`,
    dmsLng: `37°07'55.2"W`,
    heading: 175,
    speedKnots: 7.2,
    draftMeters: 2.4,
    lengthMeters: 22,
    beamMeters: 6,
    status: 'Navegando no Canal',
    destination: 'PORTO DE AREIA BRANCA',
    eta: 'Hoje às 11:35',
    vhfChannel: 'Canal 68',
    lastAisUpdate: 'Há 1 min',
    cargo: 'Pescado Fresco (Atum e Cavala)',
  },
  {
    id: 'vsl_pesqueiro_macau',
    name: 'B/P ESTRELA DE MACAU',
    type: 'pesqueiro',
    typeName: 'Barco Pesqueiro Regional',
    mmsi: '710008819',
    callSign: 'PQ2104',
    flag: '🇧🇷 Brasil',
    lat: -5.0640,
    lng: -36.6280,
    dmsLat: `5°03'50.4"S`,
    dmsLng: `36°37'40.8"W`,
    heading: 310,
    speedKnots: 5.8,
    draftMeters: 1.9,
    lengthMeters: 18,
    beamMeters: 5,
    status: 'Navegando no Canal',
    destination: 'BARRA DE MACAU',
    eta: 'Hoje às 12:10',
    vhfChannel: 'Canal 16',
    lastAisUpdate: 'Há 2 min',
    cargo: 'Camarão e Pescado',
  },
  {
    id: 'vsl_offshore_cbo',
    name: 'CBO FLAMENGO',
    type: 'offshore',
    typeName: 'Supridor Offshore PSV (Platform Supply Vessel)',
    mmsi: '710006734',
    callSign: 'PP4920',
    flag: '🇧🇷 Brasil',
    lat: -5.0150,
    lng: -36.3800,
    dmsLat: `5°00'54.0"S`,
    dmsLng: `36°22'48.0"W`,
    heading: 295,
    speedKnots: 11.2,
    draftMeters: 5.4,
    lengthMeters: 76,
    beamMeters: 16,
    status: 'Navegando no Canal',
    destination: 'TERMINAL DE GUAMARÉ',
    eta: 'Hoje às 13:00',
    vhfChannel: 'Canal 16 / 72',
    lastAisUpdate: 'Há 5 min',
    cargo: 'Apoio a Plataformas da Bacia Potiguar',
  },
];

/**
 * Calculates distance in Nautical Miles between two coordinates using Haversine formula
 */
export function calculateDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in Nautical Miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calculates bearing in degrees (0 - 360) from point 1 to point 2
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Converts decimal degrees to DMS string
 */
export function decimalToDMS(deg: number, isLat: boolean): string {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction = '';
  if (isLat) {
    direction = deg >= 0 ? 'N' : 'S';
  } else {
    direction = deg >= 0 ? 'E' : 'W';
  }

  return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(4, '0')}"${direction}`;
}

/**
 * Attempts to parse DMS strings like "4°49'20.5"S" or "4 49 20.5 S" to decimal degrees
 */
export function parseDMSToDecimal(dmsStr: string): number | null {
  const clean = dmsStr.trim().toUpperCase();
  if (!clean) return null;

  // If already decimal
  const directNum = parseFloat(clean);
  if (!isNaN(directNum) && (clean.endsWith('S') || clean.endsWith('W') || clean.endsWith('N') || clean.endsWith('E') || clean.indexOf('°') === -1)) {
    if (clean.endsWith('S') || clean.endsWith('W')) {
      return -Math.abs(directNum);
    }
    if (clean.endsWith('N') || clean.endsWith('E')) {
      return Math.abs(directNum);
    }
    return directNum;
  }

  // Regex pattern for DMS: 4°49'20.5"S or 4 49 20.5 S
  const match = clean.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)["]?\s*([NSEW])?/);
  if (match) {
    const deg = parseFloat(match[1]);
    const min = parseFloat(match[2]);
    const sec = parseFloat(match[3]);
    const dir = match[4];

    let dec = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') {
      dec = -dec;
    }
    return Number(dec.toFixed(6));
  }

  return null;
}
