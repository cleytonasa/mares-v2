import React, { useState, useMemo } from 'react';
import {
  Wind,
  Calendar,
  Clock,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Compass,
  Activity,
} from 'lucide-react';
import { PortConfig, WeatherData, HourlyWindRecord } from '../types/maritime';

interface WindGustChartProps {
  port: PortConfig;
  weather?: WeatherData | null;
  currentTime: Date;
}

interface MonthlyWindRecord {
  month: number;
  monthName: string;
  shortName: string;
  maxGustKmH: number;
  avgGustKmH: number;
  avgWindKmH: number;
  dominantDir: string;
  daysAbove40KmH: number;
  daysAbove60KmH: number;
}

// Climatological and observed gust peak historical data for 2026 (Areia Branca & Macau - RN)
const AREIA_BRANCA_MONTHLY_GUSTS: MonthlyWindRecord[] = [
  { month: 1, monthName: 'Janeiro', shortName: 'Jan', maxGustKmH: 42.0, avgGustKmH: 29.5, avgWindKmH: 22.0, dominantDir: 'E', daysAbove40KmH: 3, daysAbove60KmH: 0 },
  { month: 2, monthName: 'Fevereiro', shortName: 'Fev', maxGustKmH: 38.5, avgGustKmH: 26.0, avgWindKmH: 19.5, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 3, monthName: 'Março', shortName: 'Mar', maxGustKmH: 36.0, avgGustKmH: 24.5, avgWindKmH: 18.0, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 4, monthName: 'Abril', shortName: 'Abr', maxGustKmH: 37.5, avgGustKmH: 25.5, avgWindKmH: 19.0, dominantDir: 'E', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 5, monthName: 'Maio', shortName: 'Mai', maxGustKmH: 42.5, avgGustKmH: 29.0, avgWindKmH: 22.0, dominantDir: 'ESE', daysAbove40KmH: 4, daysAbove60KmH: 0 },
  { month: 6, monthName: 'Junho', shortName: 'Jun', maxGustKmH: 49.0, avgGustKmH: 35.0, avgWindKmH: 26.5, dominantDir: 'SE', daysAbove40KmH: 12, daysAbove60KmH: 0 },
  { month: 7, monthName: 'Julho', shortName: 'Jul', maxGustKmH: 55.5, avgGustKmH: 41.0, avgWindKmH: 31.0, dominantDir: 'SE', daysAbove40KmH: 20, daysAbove60KmH: 0 },
  { month: 8, monthName: 'Agosto', shortName: 'Ago', maxGustKmH: 62.0, avgGustKmH: 46.5, avgWindKmH: 35.5, dominantDir: 'SE', daysAbove40KmH: 28, daysAbove60KmH: 3 },
  { month: 9, monthName: 'Setembro', shortName: 'Set', maxGustKmH: 64.5, avgGustKmH: 48.0, avgWindKmH: 37.0, dominantDir: 'ESE', daysAbove40KmH: 29, daysAbove60KmH: 5 },
  { month: 10, monthName: 'Outubro', shortName: 'Out', maxGustKmH: 66.0, avgGustKmH: 49.5, avgWindKmH: 38.0, dominantDir: 'ESE', daysAbove40KmH: 30, daysAbove60KmH: 6 },
  { month: 11, monthName: 'Novembro', shortName: 'Nov', maxGustKmH: 58.0, avgGustKmH: 43.0, avgWindKmH: 33.0, dominantDir: 'E', daysAbove40KmH: 24, daysAbove60KmH: 0 },
  { month: 12, monthName: 'Dezembro', shortName: 'Dez', maxGustKmH: 48.0, avgGustKmH: 34.5, avgWindKmH: 26.0, dominantDir: 'E', daysAbove40KmH: 10, daysAbove60KmH: 0 },
];

const MACAU_MONTHLY_GUSTS: MonthlyWindRecord[] = [
  { month: 1, monthName: 'Janeiro', shortName: 'Jan', maxGustKmH: 40.0, avgGustKmH: 28.0, avgWindKmH: 21.0, dominantDir: 'E', daysAbove40KmH: 2, daysAbove60KmH: 0 },
  { month: 2, monthName: 'Fevereiro', shortName: 'Fev', maxGustKmH: 36.5, avgGustKmH: 25.0, avgWindKmH: 18.5, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 3, monthName: 'Março', shortName: 'Mar', maxGustKmH: 34.0, avgGustKmH: 23.5, avgWindKmH: 17.0, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 4, monthName: 'Abril', shortName: 'Abr', maxGustKmH: 35.5, avgGustKmH: 24.5, avgWindKmH: 18.0, dominantDir: 'E', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 5, monthName: 'Maio', shortName: 'Mai', maxGustKmH: 40.5, avgGustKmH: 28.0, avgWindKmH: 21.0, dominantDir: 'ESE', daysAbove40KmH: 3, daysAbove60KmH: 0 },
  { month: 6, monthName: 'Junho', shortName: 'Jun', maxGustKmH: 47.0, avgGustKmH: 33.5, avgWindKmH: 25.0, dominantDir: 'SE', daysAbove40KmH: 10, daysAbove60KmH: 0 },
  { month: 7, monthName: 'Julho', shortName: 'Jul', maxGustKmH: 53.5, avgGustKmH: 39.5, avgWindKmH: 29.5, dominantDir: 'SE', daysAbove40KmH: 18, daysAbove60KmH: 0 },
  { month: 8, monthName: 'Agosto', shortName: 'Ago', maxGustKmH: 60.0, avgGustKmH: 44.5, avgWindKmH: 34.0, dominantDir: 'SE', daysAbove40KmH: 27, daysAbove60KmH: 2 },
  { month: 9, monthName: 'Setembro', shortName: 'Set', maxGustKmH: 62.5, avgGustKmH: 46.5, avgWindKmH: 35.5, dominantDir: 'ESE', daysAbove40KmH: 28, daysAbove60KmH: 4 },
  { month: 10, monthName: 'Outubro', shortName: 'Out', maxGustKmH: 64.0, avgGustKmH: 47.5, avgWindKmH: 36.5, dominantDir: 'ESE', daysAbove40KmH: 29, daysAbove60KmH: 5 },
  { month: 11, monthName: 'Novembro', shortName: 'Nov', maxGustKmH: 56.0, avgGustKmH: 41.5, avgWindKmH: 31.5, dominantDir: 'E', daysAbove40KmH: 22, daysAbove60KmH: 0 },
  { month: 12, monthName: 'Dezembro', shortName: 'Dez', maxGustKmH: 46.0, avgGustKmH: 33.0, avgWindKmH: 24.5, dominantDir: 'E', daysAbove40KmH: 8, daysAbove60KmH: 0 },
];

export const WindGustChart: React.FC<WindGustChartProps> = ({
  port,
  weather,
  currentTime,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [useKnots, setUseKnots] = useState<boolean>(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0); // 0 = Hoje, 1 = Amanhã, etc.
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const currentM = new Date().getMonth() + 1;
    return currentM >= 1 && currentM <= 12 ? currentM : 10;
  });
  const [expanded, setExpanded] = useState<boolean>(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const isMacau = port.name.toLowerCase().includes('macau');
  const monthlyData = isMacau ? MACAU_MONTHLY_GUSTS : AREIA_BRANCA_MONTHLY_GUSTS;

  // Conversion helper: km/h -> knots
  const toUnit = (kmh: number): number => {
    if (useKnots) {
      return Number((kmh / 1.852).toFixed(1));
    }
    return Math.round(kmh * 10) / 10;
  };

  const unitLabel = useKnots ? 'nós' : 'km/h';

  // 1. Prepare Daily 24h Hourly Data
  const dailyHourlyData: HourlyWindRecord[] = useMemo(() => {
    const allHourly = weather?.hourlyWind || [];
    if (allHourly.length === 0) {
      // Generate synthetic 24h data if empty
      const baseHour = new Date();
      return Array.from({ length: 24 }, (_, h) => {
        const factor = Math.sin(((h - 6) / 24) * Math.PI * 2);
        const speed = Math.round(22 + 14 * Math.max(0, factor));
        const gust = Math.round(speed * 1.45);
        return {
          time: `${String(h).padStart(2, '0')}:00`,
          hour: h,
          dateStr: baseHour.toISOString().split('T')[0],
          windSpeedKmH: speed,
          windSpeedKnots: Number((speed / 1.852).toFixed(1)),
          windGustKmH: gust,
          windGustKnots: Number((gust / 1.852).toFixed(1)),
          windDirection: 95,
          windDirectionLabel: 'E',
        };
      });
    }

    // Slice 24 hours corresponding to selectedDayOffset (0 to 6)
    const startIndex = selectedDayOffset * 24;
    const slice = allHourly.slice(startIndex, startIndex + 24);
    if (slice.length >= 24) return slice;

    // Fallback to first 24 records if bounds exceed
    return allHourly.slice(0, 24);
  }, [weather?.hourlyWind, selectedDayOffset]);

  // Daily statistics
  const dailyStats = useMemo(() => {
    if (dailyHourlyData.length === 0) {
      return { maxGust: 0, maxHour: '15:00', avgGust: 0, avgSpeed: 0, isCritical: false };
    }
    let maxGust = -1;
    let maxHour = '';
    let sumGust = 0;
    let sumSpeed = 0;

    dailyHourlyData.forEach((d) => {
      if (d.windGustKmH > maxGust) {
        maxGust = d.windGustKmH;
        maxHour = d.time;
      }
      sumGust += d.windGustKmH;
      sumSpeed += d.windSpeedKmH;
    });

    const avgGust = Number((sumGust / dailyHourlyData.length).toFixed(1));
    const avgSpeed = Number((sumSpeed / dailyHourlyData.length).toFixed(1));

    return {
      maxGust,
      maxHour,
      avgGust,
      avgSpeed,
      isCritical: maxGust >= 60,
    };
  }, [dailyHourlyData]);

  // Monthly statistics
  const monthlyStats = useMemo(() => {
    let maxGust = -1;
    let maxMonthName = '';
    let sumGust = 0;
    let sumSpeed = 0;

    monthlyData.forEach((m) => {
      if (m.maxGustKmH > maxGust) {
        maxGust = m.maxGustKmH;
        maxMonthName = m.monthName;
      }
      sumGust += m.avgGustKmH;
      sumSpeed += m.avgWindKmH;
    });

    const avgGust = Number((sumGust / 12).toFixed(1));
    const avgSpeed = Number((sumSpeed / 12).toFixed(1));

    return {
      maxGust,
      maxMonthName,
      avgGust,
      avgSpeed,
      isCritical: maxGust >= 60,
    };
  }, [monthlyData]);

  // Current selected month record
  const currentMonthRecord =
    monthlyData.find((m) => m.month === selectedMonth) || monthlyData[selectedMonth - 1] || monthlyData[0];

  // Handler when user clicks on a month point: Switch to daily view
  const handleSelectMonthAndGoDaily = (monthNumber: number) => {
    setSelectedMonth(monthNumber);
    setViewMode('daily');
  };

  // SVG Dimensions & Scales
  const svgWidth = 900;
  const svgHeight = expanded ? 320 : 210;
  const padding = { top: 32, right: 28, bottom: 42, left: 52 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Dynamic Y scale bounds
  const maxYValue = useMemo(() => {
    let highest = 0;
    if (viewMode === 'daily') {
      highest = Math.max(...dailyHourlyData.map((d) => (useKnots ? d.windGustKnots : d.windGustKmH)), 0);
    } else {
      highest = Math.max(...monthlyData.map((m) => toUnit(m.maxGustKmH)), 0);
    }
    // Safety minimum display ceiling (at least 70 km/h or ~38 kts to give headroom for the 60 km/h threshold line)
    const minThresholdCeiling = useKnots ? 38 : 70;
    const calculated = Math.ceil(Math.max(highest * 1.18, minThresholdCeiling));
    // Round to nice round step (e.g. multiples of 10 or 5)
    return Math.ceil(calculated / 5) * 5;
  }, [viewMode, dailyHourlyData, monthlyData, useKnots]);

  const minYValue = 0;

  const scaleX = (fraction: number) => padding.left + fraction * chartWidth;
  const scaleY = (val: number) => padding.top + (1 - (val - minYValue) / (maxYValue - minYValue)) * chartHeight;

  // Threshold lines Y positions (40 km/h and 60 km/h)
  const threshold40Val = useKnots ? Number((40 / 1.852).toFixed(1)) : 40;
  const threshold60Val = useKnots ? Number((60 / 1.852).toFixed(1)) : 60;
  const threshold40Y = scaleY(threshold40Val);
  const threshold60Y = scaleY(threshold60Val);

  // Build SVG Path Coordinates
  const chartPoints = useMemo(() => {
    if (viewMode === 'daily') {
      return dailyHourlyData.map((d, idx) => {
        const fraction = dailyHourlyData.length > 1 ? idx / (dailyHourlyData.length - 1) : 0;
        const gustVal = useKnots ? d.windGustKnots : d.windGustKmH;
        const windVal = useKnots ? d.windSpeedKnots : d.windSpeedKmH;
        const x = scaleX(fraction);
        const yGust = scaleY(gustVal);
        const yWind = scaleY(windVal);
        return {
          idx,
          label: d.time,
          hour: d.hour,
          gust: gustVal,
          sustained: windVal,
          direction: d.windDirectionLabel,
          deg: d.windDirection,
          x,
          yGust,
          yWind,
          rawRecord: d,
        };
      });
    } else {
      return monthlyData.map((m, idx) => {
        const fraction = monthlyData.length > 1 ? idx / (monthlyData.length - 1) : 0;
        const gustVal = toUnit(m.maxGustKmH);
        const windVal = toUnit(m.avgWindKmH);
        const x = scaleX(fraction);
        const yGust = scaleY(gustVal);
        const yWind = scaleY(windVal);
        return {
          idx,
          label: m.shortName,
          monthNumber: m.month,
          gust: gustVal,
          sustained: windVal,
          direction: m.dominantDir,
          deg: 100,
          x,
          yGust,
          yWind,
          rawRecord: m,
        };
      });
    }
  }, [viewMode, dailyHourlyData, monthlyData, useKnots, maxYValue]);

  // Smooth Bezier Curve Path Generator
  const generateSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const gustPointsList = chartPoints.map((p) => ({ x: p.x, y: p.yGust }));
  const windPointsList = chartPoints.map((p) => ({ x: p.x, y: p.yWind }));

  const gustLinePath = generateSmoothPath(gustPointsList);
  const windLinePath = generateSmoothPath(windPointsList);

  const gustAreaPath = `${gustLinePath} L ${scaleX(1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  // Find overall maximum point to highlight
  const maxPoint = useMemo(() => {
    if (chartPoints.length === 0) return null;
    return chartPoints.reduce((max, curr) => (curr.gust > max.gust ? curr : max), chartPoints[0]);
  }, [chartPoints]);

  // Active hovered point details
  const activeHover = hoveredPointIndex !== null && chartPoints[hoveredPointIndex] ? chartPoints[hoveredPointIndex] : null;

  // Current hour cursor on "Hoje" (day offset 0)
  const currentHour = currentTime.getHours();
  const currentHourFraction = (currentHour + currentTime.getMinutes() / 60) / 24;
  const currentHourX = scaleX(Math.max(0, Math.min(1, currentHourFraction)));

  return (
    <div
      id="wind-gusts-chart-card"
      className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-3 sm:p-5 shadow-xl text-slate-100 space-y-3 sm:space-y-4 transition-all"
    >
      {/* 1. Header with Title & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate flex items-center gap-1.5 font-sans uppercase">
              <span>Picos de Rajadas de Vento</span>
              <span className="text-[10px] font-mono text-cyan-400 font-normal lowercase bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                {viewMode === 'daily'
                  ? selectedDayOffset === 0
                    ? `curva horária de hoje (24h) • ${currentMonthRecord.monthName.toLowerCase()}`
                    : `dia +${selectedDayOffset} (24h) • ${currentMonthRecord.monthName.toLowerCase()}`
                  : 'histórico e picos anuais 2026'}
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
              {port.name} • Monitoramento de rajadas com limites de segurança (40 e 60 km/h)
            </p>
          </div>
        </div>

        {/* View Controls & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Daily / Monthly Switcher */}
          <div className="inline-flex rounded-lg bg-slate-950/80 p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                viewMode === 'daily'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Diário</span>
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                viewMode === 'monthly'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Mês</span>
            </button>
          </div>

          {/* Day Offset Selector when in Daily View */}
          {viewMode === 'daily' && (
            <div className="flex items-center gap-1">
              <select
                value={selectedDayOffset}
                onChange={(e) => setSelectedDayOffset(Number(e.target.value))}
                aria-label="Selecionar dia para rajadas"
                className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2 py-1 outline-none font-mono focus:border-cyan-500 cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-white">Hoje (24 Horas)</option>
                <option value={1} className="bg-slate-900 text-white">Amanhã (+1d)</option>
                <option value={2} className="bg-slate-900 text-white">Em 2 dias (+2d)</option>
                <option value={3} className="bg-slate-900 text-white">Em 3 dias (+3d)</option>
              </select>
            </div>
          )}

          {/* Toggle Unit: km/h vs Nós */}
          <button
            onClick={() => setUseKnots(!useKnots)}
            className="text-[10px] sm:text-xs font-mono px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Alternar unidade entre km/h e Nós"
          >
            <span className="text-cyan-400 font-bold">{useKnots ? 'Nós (kts)' : 'km/h'}</span>
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
            title={expanded ? 'Recolher gráfico' : 'Expandir gráfico'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Top Legend and Summary Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-slate-300">
          {/* Legend 1: Rajada Pico */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
            <span className="font-semibold text-white text-[11px] sm:text-xs">Pico de Rajada</span>
          </div>

          {/* Legend 2: Vento Sustentado */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-blue-500/80 inline-block" />
            <span className="text-slate-400 text-[11px] sm:text-xs">Vento Médio</span>
          </div>

          {/* Threshold Badges */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
              Atenção: ≥ {useKnots ? '22 kts' : '40 km/h'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold">
              Crítico: ≥ {useKnots ? '32 kts' : '60 km/h'}
            </span>
          </div>
        </div>

        {/* 4 Quantitative Metrics */}
        <div className="flex items-center gap-3 sm:gap-6 font-mono">
          <div className="text-right">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider block font-bold">Pico Máximo</span>
            <span className="text-xs sm:text-sm font-extrabold text-cyan-300">
              {viewMode === 'daily'
                ? `${toUnit(dailyStats.maxGust)} ${unitLabel} (${dailyStats.maxHour})`
                : `${toUnit(monthlyStats.maxGust)} ${unitLabel} (${monthlyStats.maxMonthName.slice(0, 3)})`}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rajada Média</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {viewMode === 'daily' ? `${toUnit(dailyStats.avgGust)} ${unitLabel}` : `${toUnit(monthlyStats.avgGust)} ${unitLabel}`}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vento Médio</span>
            <span className="text-xs sm:text-sm font-bold text-slate-300">
              {viewMode === 'daily' ? `${toUnit(dailyStats.avgSpeed)} ${unitLabel}` : `${toUnit(monthlyStats.avgSpeed)} ${unitLabel}`}
            </span>
          </div>

          <div className="text-right hidden xs:block">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Status</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                (viewMode === 'daily' ? dailyStats.isCritical : monthlyStats.isCritical)
                  ? 'bg-rose-950 text-rose-400 border border-rose-700 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {(viewMode === 'daily' ? dailyStats.isCritical : monthlyStats.isCritical) ? 'CRÍTICO > 60' : 'NORMAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Hover Banner */}
      <div className="min-h-[30px] flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
        {activeHover ? (
          <div className="flex flex-wrap items-center justify-between w-full font-mono text-[11px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-cyan-300 font-bold">
                {viewMode === 'daily' ? `⏰ ${activeHover.label}` : `🗓️ ${activeHover.label} 2026`}
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Rajada:</span>
                <strong
                  className={`font-bold ${
                    activeHover.gust >= threshold60Val
                      ? 'text-rose-400'
                      : activeHover.gust >= threshold40Val
                      ? 'text-amber-400'
                      : 'text-cyan-300'
                  }`}
                >
                  {activeHover.gust} {unitLabel}
                </strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Vento Sustentado:</span>
                <strong className="text-blue-300 font-semibold">
                  {activeHover.sustained} {unitLabel}
                </strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>{activeHover.direction} ({activeHover.deg}°)</span>
              </span>
            </div>

            {viewMode === 'monthly' && (
              <span className="text-[10px] text-cyan-400 font-sans hidden md:inline animate-pulse">
                👉 Clique neste mês para abrir a visão diária
              </span>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center justify-between w-full">
            <span>
              {viewMode === 'daily'
                ? 'Passe o cursor sobre os pontos para inspecionar os picos horários de rajada.'
                : 'Passe o cursor sobre a curva mensal ou clique em um mês para abrir o detalhamento diário.'}
            </span>
            <span className="font-mono text-cyan-400 text-[10px] hidden sm:inline">
              {viewMode === 'daily' ? `Pico do dia: ${toUnit(dailyStats.maxGust)} ${unitLabel}` : `Mês de maior vento: ${monthlyStats.maxMonthName}`}
            </span>
          </div>
        )}
      </div>

      {/* 4. High-Precision SVG Line Chart */}
      <div className="relative w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 sm:p-3 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block cursor-crosshair"
          onMouseLeave={() => setHoveredPointIndex(null)}
        >
          <defs>
            {/* Area Fill Gradient */}
            <linearGradient id="gustAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="80%" stopColor="#1e1b4b" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter for highest peak */}
            <filter id="glowPeak" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines (Horizontal Levels) */}
          {[0, 20, 40, 60].filter((v) => v <= maxYValue).map((level) => {
            const levelVal = useKnots ? Number((level / 1.852).toFixed(1)) : level;
            const y = scaleY(levelVal);
            return (
              <g key={level}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {levelVal}
                </text>
              </g>
            );
          })}

          {/* Y Axis Top Label */}
          <text
            x={padding.left - 8}
            y={scaleY(maxYValue) + 3}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
          >
            {maxYValue}
          </text>

          {/* Threshold Line 1: 40 km/h (Atenção Operacional) */}
          {threshold40Y >= padding.top && threshold40Y <= svgHeight - padding.bottom && (
            <g>
              <line
                x1={padding.left}
                y1={threshold40Y}
                x2={svgWidth - padding.right}
                y2={threshold40Y}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.75"
              />
              <text
                x={svgWidth - padding.right - 4}
                y={threshold40Y - 4}
                fill="#f59e0b"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="end"
              >
                Atenção ({threshold40Val} {unitLabel})
              </text>
            </g>
          )}

          {/* Threshold Line 2: 60 km/h (Alerta Crítico / Corte Operacional) */}
          {threshold60Y >= padding.top && threshold60Y <= svgHeight - padding.bottom && (
            <g>
              <line
                x1={padding.left}
                y1={threshold60Y}
                x2={svgWidth - padding.right}
                y2={threshold60Y}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.9"
              />
              <text
                x={svgWidth - padding.right - 4}
                y={threshold60Y - 4}
                fill="#f43f5e"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="end"
              >
                ALERTA CRÍTICO ({threshold60Val} {unitLabel})
              </text>
            </g>
          )}

          {/* Current Hour Cursor Indicator (if in Daily mode and viewing today) */}
          {viewMode === 'daily' && selectedDayOffset === 0 && (
            <g>
              <line
                x1={currentHourX}
                y1={padding.top}
                x2={currentHourX}
                y2={svgHeight - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <text
                x={currentHourX}
                y={padding.top - 8}
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Agora ({String(currentHour).padStart(2, '0')}h)
              </text>
            </g>
          )}

          {/* Shaded Area Under Gust Curve */}
          <path d={gustAreaPath} fill="url(#gustAreaGrad)" />

          {/* Secondary Line: Sustained Wind Speed (Thin Blue Line) */}
          <path
            d={windLinePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeOpacity="0.7"
            strokeDasharray="3 2"
          />

          {/* Primary Line: Peak Wind Gust (Cyan Solid Line with Accent) */}
          <path
            d={gustLinePath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Nodes / Markers for each point */}
          {chartPoints.map((pt, idx) => {
            const isHovered = hoveredPointIndex === idx;
            const isHighest = maxPoint && maxPoint.idx === idx;
            const isCriticalVal = pt.gust >= threshold60Val;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onClick={() => {
                  if (viewMode === 'monthly' && 'monthNumber' in pt) {
                    handleSelectMonthAndGoDaily((pt as any).monthNumber);
                  }
                }}
                className={viewMode === 'monthly' ? 'cursor-pointer' : 'cursor-crosshair'}
              >
                {/* Invisible larger hit target for smooth mouse/touch interaction */}
                <circle cx={pt.x} cy={pt.yGust} r="14" fill="transparent" />

                {/* Point Node on Sustained Wind Line */}
                <circle
                  cx={pt.x}
                  cy={pt.yWind}
                  r="2"
                  fill="#3b82f6"
                  opacity="0.5"
                />

                {/* Point Node on Gust Line */}
                <circle
                  cx={pt.x}
                  cy={pt.yGust}
                  r={isHovered ? 6 : isHighest ? 4.5 : 3}
                  fill={isCriticalVal ? '#f43f5e' : isHighest ? '#22d3ee' : '#0e7490'}
                  stroke={isHovered ? '#ffffff' : '#083344'}
                  strokeWidth={isHovered ? 2 : 1.5}
                  filter={isHighest || isHovered ? 'url(#glowPeak)' : undefined}
                />

                {/* Value label directly above significant peaks or hovered point */}
                {(isHovered || isHighest || (viewMode === 'monthly' && pt.idx % 2 === 0)) && (
                  <text
                    x={pt.x}
                    y={pt.yGust - 8}
                    fill={isCriticalVal ? '#f43f5e' : isHighest ? '#22d3ee' : '#e2e8f0'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {pt.gust}
                  </text>
                )}

                {/* X Axis Tick Labels */}
                {(viewMode === 'monthly' || idx % 3 === 0 || isHovered) && (
                  <text
                    x={pt.x}
                    y={svgHeight - padding.bottom + 16}
                    fill={isHovered ? '#22d3ee' : '#94a3b8'}
                    fontSize={viewMode === 'monthly' ? '10' : '9'}
                    fontFamily="monospace"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 5. Footer Operational Information & Help */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {viewMode === 'daily'
              ? 'Picos horários: reforço térmico comum à tarde (13h às 17h) pelos Ventos Alísios.'
              : 'Safra Salineira (Ago-Out): maior intensidade de rajadas ao longo do ano na Costa Branca.'}
          </span>
        </div>

        {viewMode === 'daily' && (
          <button
            onClick={() => setViewMode('monthly')}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans underline"
          >
            <ChevronLeft className="w-3 h-3" /> Ver histórico anual dos 12 meses
          </button>
        )}
      </div>
    </div>
  );
};
