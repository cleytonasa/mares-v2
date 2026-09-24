import { DayTides, MoonPhase, TideEvent } from '../types/maritime';
import { JAN_2026, FEB_2026, MAR_2026, APR_2026 } from './tides/jan_apr';
import { MAY_2026, JUN_2026, JUL_2026, AUG_2026 } from './tides/may_aug';
import { SEP_2026, OCT_2026, NOV_2026, DEC_2026 } from './tides/sep_dec';

const MONTH_RAW_MAP: Record<number, Record<number, [string, number][]>> = {
  1: JAN_2026,
  2: FEB_2026,
  3: MAR_2026,
  4: APR_2026,
  5: MAY_2026,
  6: JUN_2026,
  7: JUL_2026,
  8: AUG_2026,
  9: SEP_2026,
  10: OCT_2026,
  11: NOV_2026,
  12: DEC_2026,
};

// 2026 Official DHN Moon Phases
const MOON_PHASES_2026: Record<string, MoonPhase> = {
  '1-3': 'full',
  '1-10': 'last_quarter',
  '1-18': 'new',
  '1-26': 'first_quarter',
  
  '2-1': 'full',
  '2-9': 'last_quarter',
  '2-17': 'new',
  '2-24': 'first_quarter',

  '3-3': 'full',
  '3-11': 'last_quarter',
  '3-19': 'new',
  '3-25': 'first_quarter',

  '4-2': 'full',
  '4-9': 'last_quarter',
  '4-17': 'new',
  '4-24': 'first_quarter',

  '5-1': 'full',
  '5-9': 'last_quarter',
  '5-16': 'new',
  '5-23': 'first_quarter',
  '5-31': 'full',

  '6-7': 'last_quarter',
  '6-15': 'new',
  '6-22': 'first_quarter',
  '6-29': 'full',

  '7-7': 'last_quarter',
  '7-14': 'new',
  '7-21': 'first_quarter',
  '7-29': 'full',

  '8-5': 'last_quarter',
  '8-13': 'new',
  '8-20': 'first_quarter',
  '8-27': 'full',

  '9-3': 'last_quarter',
  '9-11': 'new',
  '9-18': 'first_quarter',
  '9-26': 'full',

  '10-3': 'last_quarter',
  '10-10': 'new',
  '10-18': 'first_quarter',
  '10-25': 'full',

  '11-1': 'last_quarter',
  '11-9': 'new',
  '11-17': 'first_quarter',
  '11-24': 'full',

  '12-1': 'last_quarter',
  '12-9': 'new',
  '12-17': 'first_quarter',
  '12-24': 'full',
  '12-31': 'last_quarter',
};

const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function getTidesForDay(year: number, month: number, day: number): DayTides {
  // Safe default to 2026 data if year differs
  const targetMonth = Math.min(Math.max(month, 1), 12);
  const monthData = MONTH_RAW_MAP[targetMonth] || JAN_2026;
  const rawEvents = monthData[day] || monthData[1] || [["00:00", 1.88], ["06:00", 3.2], ["12:00", 0.5], ["18:00", 3.3]];

  // Determine high or low based on relative heights
  const events: TideEvent[] = rawEvents.map(([time, height], idx) => {
    let type: 'high' | 'low' = 'high';
    if (idx === 0) {
      // Compare with second item if exists
      if (rawEvents.length > 1) {
        type = height > rawEvents[1][1] ? 'high' : 'low';
      } else {
        type = height >= 1.88 ? 'high' : 'low';
      }
    } else {
      const prevHeight = rawEvents[idx - 1][1];
      type = height > prevHeight ? 'high' : 'low';
    }
    return { time, height, type };
  });

  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = DAY_NAMES[dateObj.getDay()];
  const moonPhaseKey = `${month}-${day}`;
  const moonPhase = MOON_PHASES_2026[moonPhaseKey] || null;

  return {
    day,
    month: targetMonth,
    year,
    dayOfWeek,
    moonPhase,
    events,
  };
}

export function getMonthTides(year: number, month: number): DayTides[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const list: DayTides[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    list.push(getTidesForDay(year, month, d));
  }
  return list;
}
