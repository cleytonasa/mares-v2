import { DayTides, PortConfig, TideEvent } from '../types/maritime';
import { getTidesForDay } from '../data/tideData2026';

export interface AbsoluteTidePoint {
  date: Date;
  timeStr: string;
  height: number;
  type: 'high' | 'low';
  timestamp: number;
}

export interface CurrentTideState {
  currentHeight: number;
  rateOfChangeCmPerHour: number;
  trend: 'ENCHENDO' | 'VAZANDO' | 'ESTOFO';
  trendDescription: string;
  previousEvent: AbsoluteTidePoint;
  nextEvent: AbsoluteTidePoint;
  nextHighEvent: AbsoluteTidePoint;
  percentCycle: number; // 0 to 100% from prev to next
  amplitude: number; // difference in m between prev and next
  coefficientType: 'SIZÍGIA' | 'QUADRATURA' | 'INTERMEDIÁRIA';
  minutesToNextEvent: number;
  minutesToNextHighEvent: number;
  currentWaterDepth: number; // datum depth + tide height
}

// Convert "HH:mm" on a given day to a Date object in local time
export function parseTideDate(year: number, month: number, day: number, timeStr: string, timeOffsetMinutes = 0): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (timeOffsetMinutes !== 0) {
    date.setMinutes(date.getMinutes() + timeOffsetMinutes);
  }
  return date;
}

// Get continuous chronological list of tide events spanning around target date
export function getChronologicalEvents(targetDate: Date, port: PortConfig): AbsoluteTidePoint[] {
  const result: AbsoluteTidePoint[] = [];

  // Query 5 days (-2 to +2) to ensure full 48h interpolation coverage with previous and next bounds
  for (let offset = -2; offset <= 3; offset++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + offset);

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    const dayTides: DayTides = getTidesForDay(year, month, day);

    for (const evt of dayTides.events) {
      const evtDate = parseTideDate(year, month, day, evt.time, port.timeOffsetMinutes);
      // Adjusted height for port multiplier and offset
      const adjustedHeight = Number((evt.height * port.heightMultiplier).toFixed(2));

      result.push({
        date: evtDate,
        timeStr: `${String(evtDate.getHours()).padStart(2, '0')}:${String(evtDate.getMinutes()).padStart(2, '0')}`,
        height: adjustedHeight,
        type: evt.type,
        timestamp: evtDate.getTime(),
      });
    }
  }

  // Sort chronologically and deduplicate
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

// Sinusoidal interpolation conforming to Admiralty Tide calculation method
export function calculateCurrentTide(targetDate: Date, port: PortConfig): CurrentTideState {
  const events = getChronologicalEvents(targetDate, port);
  const nowTs = targetDate.getTime();

  let prev = events[0];
  let next = events[events.length - 1];

  for (let i = 0; i < events.length - 1; i++) {
    if (nowTs >= events[i].timestamp && nowTs <= events[i + 1].timestamp) {
      prev = events[i];
      next = events[i + 1];
      break;
    }
  }

  // If outside bounds, clamp
  if (nowTs < events[0].timestamp) {
    prev = events[0];
    next = events[1] || events[0];
  } else if (nowTs > events[events.length - 1].timestamp) {
    prev = events[events.length - 2] || events[events.length - 1];
    next = events[events.length - 1];
  }

  const durationMs = next.timestamp - prev.timestamp;
  const elapsedMs = Math.max(0, Math.min(durationMs, nowTs - prev.timestamp));
  const fraction = durationMs > 0 ? elapsedMs / durationMs : 0;

  // Harmonic cosine curve: h(t) = h0 + (h1 - h0) * (1 - cos(pi * f)) / 2
  const cosFactor = (1 - Math.cos(Math.PI * fraction)) / 2;
  const currentHeight = Number((prev.height + (next.height - prev.height) * cosFactor).toFixed(2));

  // Rate of change dh/dt (cm per hour)
  const durationHours = durationMs / (1000 * 60 * 60);
  const totalChangeM = next.height - prev.height;
  const currentRateCmH = durationHours > 0 
    ? ((totalChangeM * Math.PI) / (2 * durationHours)) * Math.sin(Math.PI * fraction) * 100
    : 0;

  let trend: 'ENCHENDO' | 'VAZANDO' | 'ESTOFO' = 'ESTOFO';
  let trendDescription = 'Estofo de Maré';

  if (Math.abs(currentRateCmH) < 8) {
    trend = 'ESTOFO';
    trendDescription = prev.height > next.height ? 'Estofo de Baixa-mar (Inversão)' : 'Estofo de Preamar (Inversão)';
  } else if (next.height > prev.height) {
    trend = 'ENCHENDO';
    trendDescription = 'Maré Enchendo (Fluxo / Enchente)';
  } else {
    trend = 'VAZANDO';
    trendDescription = 'Maré Vazando (Refluxo / Vazante)';
  }

  const amplitude = Math.abs(next.height - prev.height);
  let coefficientType: 'SIZÍGIA' | 'QUADRATURA' | 'INTERMEDIÁRIA' = 'INTERMEDIÁRIA';
  if (amplitude >= 2.7) {
    coefficientType = 'SIZÍGIA'; // Marés de grande amplitude
  } else if (amplitude <= 1.8) {
    coefficientType = 'QUADRATURA'; // Marés de baixa amplitude
  }

  const minutesToNextEvent = Math.max(0, Math.round((next.timestamp - nowTs) / (1000 * 60)));
  const currentWaterDepth = Number((port.criticalShallowDepth + currentHeight).toFixed(2));

  // Find the next high tide (Preamar) event specifically
  let nextHighEvent = events.find((evt) => evt.type === 'high' && evt.timestamp > nowTs);
  if (!nextHighEvent) {
    nextHighEvent = next.type === 'high' ? next : prev;
  }
  const minutesToNextHighEvent = Math.max(0, Math.round((nextHighEvent.timestamp - nowTs) / (1000 * 60)));

  return {
    currentHeight,
    rateOfChangeCmPerHour: Number(currentRateCmH.toFixed(1)),
    trend,
    trendDescription,
    previousEvent: prev,
    nextEvent: next,
    nextHighEvent,
    percentCycle: Math.round(fraction * 100),
    amplitude: Number(amplitude.toFixed(2)),
    coefficientType,
    minutesToNextEvent,
    minutesToNextHighEvent,
    currentWaterDepth,
  };
}

// Generate 24-hour continuous curve points for chart rendering
export function get24hTideCurve(referenceDate: Date, port: PortConfig, pointsCount = 48) {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  const points: { time: string; timestamp: number; height: number; depth: number }[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const d = new Date(startOfDay.getTime() + (i * 24 * 60 * 60 * 1000) / pointsCount);
    const state = calculateCurrentTide(d, port);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    points.push({
      time: timeStr,
      timestamp: d.getTime(),
      height: state.currentHeight,
      depth: state.currentWaterDepth,
    });
  }

  return points;
}

// Generate 48-hour continuous curve points for chart rendering (Today & Next Day)
export function get48hTideCurve(referenceDate: Date, port: PortConfig, pointsCount = 192) {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  const points: { time: string; timestamp: number; height: number; depth: number; date: Date; isNextDay: boolean }[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const d = new Date(startOfDay.getTime() + (i * 48 * 60 * 60 * 1000) / pointsCount);
    const state = calculateCurrentTide(d, port);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const isNextDay = d.getDate() !== startOfDay.getDate() || d.getTime() >= startOfDay.getTime() + 24 * 60 * 60 * 1000;
    points.push({
      time: timeStr,
      timestamp: d.getTime(),
      height: state.currentHeight,
      depth: state.currentWaterDepth,
      date: d,
      isNextDay,
    });
  }

  return points;
}
