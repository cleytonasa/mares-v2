export interface TideEvent {
  time: string; // HH:mm format, e.g. "02:12"
  height: number; // in meters, e.g. 3.26
  type: 'high' | 'low';
}

export type MoonPhase = 'new' | 'first_quarter' | 'full' | 'last_quarter' | null;

export interface DayTides {
  day: number;
  month: number; // 1 - 12
  year: number; // 2026
  dayOfWeek: string; // DOM, SEG, TER, QUA, QUI, SEX, SÁB
  moonPhase?: MoonPhase;
  events: TideEvent[];
}

export interface PortConfig {
  id: 'areia_branca' | 'macau';
  name: string;
  fullName: string;
  state: string;
  chartNumber: string;
  dhnStation: string;
  coordinates: {
    lat: number;
    lng: number;
    dmsLat: string;
    dmsLng: string;
  };
  meanLevel: number; // Nível Médio (m)
  chartDatum: number; // Zero Hidrográfico (m)
  criticalShallowDepth: number; // Profundidade do banco de areia no ZH (m)
  maxNormalDraft: number; // Calado operacional recomendado (m)
  timeOffsetMinutes: number; // Offset relative to Termisa
  heightMultiplier: number;
  description: string;
  barCharacteristics: string;
}

export interface DailyForecastDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  formattedDate: string; // 21 ago
  isToday: boolean;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeedMaxKmH: number;
  windSpeedMaxKnots: number;
  windGustsMaxKmH: number;
  windGustsMaxKnots: number;
  windDirectionDominant: number;
  windDirectionLabel: string;
  precipitationProb: number;
  precipitationSum: number;
  uvIndexMax: number;
  waveHeightMeters: number;
  wavePeriodSeconds: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  pressure: number;
  windSpeedKmH: number;
  windSpeedKnots: number;
  windDirection: number;
  windDirectionLabel: string;
  windGustKnots: number;
  waveHeightMeters: number;
  wavePeriodSeconds: number;
  waveDirection: number;
  visibilityKm: number;
  uvIndex: number;
  precipitationProb: number;
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  nauticalDawn: string;
  nauticalDusk: string;
  lastUpdated: string;
  weeklyForecast?: DailyForecastDay[];
}

export interface VesselParameters {
  name: string;
  vesselType: 'salineiro' | 'pesqueiro' | 'rebocador' | 'graneleiro' | 'lancha';
  draftMeters: number; // Calado (m)
  speedKnots: number; // Velocidade
  squatMarginMeters: number; // Efeito Squat estimado (m)
  safetyMarginMeters: number; // Folga de segurança mínima requerida (m)
}

export interface AlertThresholds {
  minTideHeight: number; // Alerta de maré baixa (m)
  minUnderKeelClearance: number; // FAQ mínima (m)
  maxWindKnots: number; // Limite de vento para travessia de barra (nós)
  maxWaveHeightMeters: number; // Limite de onda na arrebentação (m)
  soundAlertEnabled: boolean;
  autoRefreshInterval: number; // em segundos
}

export type BarStatusType = 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'CLOSED';

export type VesselCategory = 'barcaca' | 'rebocador' | 'navio' | 'praticagem' | 'pesqueiro' | 'offshore';

export interface VesselAIS {
  id: string;
  name: string;
  type: VesselCategory;
  typeName: string;
  mmsi: string;
  callSign: string;
  imo?: string;
  flag: string;
  lat: number;
  lng: number;
  dmsLat: string;
  dmsLng: string;
  heading: number; // COG (0 - 359°)
  speedKnots: number; // SOG
  draftMeters: number; // Calado
  lengthMeters: number; // LOA
  beamMeters: number; // Boca
  status: 'Navegando no Canal' | 'Fundeado' | 'Operando no TERMISA' | 'Manobra de Reboque' | 'Espera de Maré' | 'Atracado no Cais' | 'Patrulha / Apoio';
  destination: string;
  eta: string;
  vhfChannel: string;
  lastAisUpdate: string;
  cargo?: string;
}

export interface CustomUserLocation {
  lat: number;
  lng: number;
  name: string;
  dmsLat: string;
  dmsLng: string;
  isManual: boolean;
  estimatedBaseZHDepth: number; // Profundidade do fundo no ZH em metros
}

export interface BarStatusEvaluation {
  status: BarStatusType;
  title: string;
  message: string;
  reasons: string[];
  currentWaterDepth: number;
  effectiveClearance: number;
  isSafeForDraft: boolean;
  nextSafeWindow?: {
    start: string;
    end: string;
    maxHeight: number;
  };
}
