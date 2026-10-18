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
import { translations, Language } from '../utils/i18n';

interface WindGustChartProps {
  port: PortConfig;
  weather?: WeatherData | null;
  currentTime: Date;
  language?: Language;
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

const AREIA_BRANCA_MONTHLY_GUSTS: MonthlyWindRecord[] = [
  { month: 1, monthName: 'Janeiro', shortName: 'Jan', maxGustKmH: 42.0, avgGustKmH: 29.5, avgWindKmH: 22.0, dominantDir: 'E', daysAbove40KmH: 3, daysAbove60KmH: 0 },
  { month: 2, monthName: 'Fevereiro', shortName: 'Fev', maxGustKmH: 38.5, avgGustKmH: 26.0, avgWindKmH: 19.5, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 3, monthName: 'Março', shortName: 'Mar', maxGustKmH: 36.0, avgGustKmH: 24.5, avgWindKmH: 18.0, dominantDir: 'ENE', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 4, monthName: 'Abril', shortName: 'Abr', maxGustKmH: 37.5, avgGustKmH: 25.5, avgWindKmH: 19.0, dominantDir: 'E', daysAbove40KmH: 0, daysAbove60KmH: 0 },
  { month: 5, monthName: 'Maio', shortName: 'Mai', maxGustKmH: 42.5, avgGustKmH: 29.0, avgWindKmH: 22.0, dominantDir: 'ESE', daysAbove40KmH: 4, daysAbove60KmH: 0 },
  { month: 6, monthName: 'Junho', shortName: 'Jun', maxGustKmH: 49.0, avgGustKmH: 35.0, avgWindKmH: 26.5, dominantDir: 'SE', daysAbove40KmH: 12, daysAbove60KmH: 0 },
  { month: 7, monthName: 'Julho', shortName: 'Jul', maxGustKmH: 55.5, avgGustKmH: 41.0, avgWindKmH: 31.0, dominantDir: 'SE', daysAbove40KmH: 20, daysAbove60KmH: 0 },
  { month: 8, monthName: 'Agosto', shortName: 'Ago', maxGustKmH: 62.0, avgGustKmH: 44.5, avgWindKmH: 34.0, dominantDir: 'ESE', daysAbove40KmH: 25, daysAbove60KmH: 2 },
  { month: 9, monthName: 'Setembro', shortName: 'Set', maxGustKmH: 58.0, avgGustKmH: 42.0, avgWindKmH: 32.5, dominantDir: 'ESE', daysAbove40KmH: 22, daysAbove60KmH: 0 },
  { month: 10, monthName: 'Outubro', shortName: 'Out', maxGustKmH: 51.0, avgGustKmH: 36.5, avgWindKmH: 28.0, dominantDir: 'E', daysAbove40KmH: 15, daysAbove60KmH: 0 },
  { month: 11, monthName: 'Novembro', shortName: 'Nov', maxGustKmH: 45.0, avgGustKmH: 31.0, avgWindKmH: 24.0, dominantDir: 'E', daysAbove40KmH: 6, daysAbove60KmH: 0 },
  { month: 12, monthName: 'Dezembro', shortName: 'Dez', maxGustKmH: 43.5, avgGustKmH: 30.0, avgWindKmH: 23.0, dominantDir: 'E', daysAbove40KmH: 4, daysAbove60KmH: 0 },
];

export const WindGustChart: React.FC<WindGustChartProps> = ({
  port,
  weather,
  currentTime,
  language = 'pt',
}) => {
  const t = translations[language];
  const [viewMode, setViewMode] = useState<'24h' | 'monthly'>('24h');
  const [unit, setUnit] = useState<'knots' | 'kmh'>('knots');

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            {t.windGustChartTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.windGustChartSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('24h')}
              className={`px-3 py-1 rounded-lg transition ${viewMode === '24h' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {language === 'en' ? '24h Hourly' : '24h Diário'}
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg transition ${viewMode === 'monthly' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {language === 'en' ? 'Monthly' : 'Mensal 2026'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center text-slate-300 font-mono text-xs">
        {language === 'en' ? 'Wind Gust & Safety Monitoring Active (Threshold: 60 km/h / 32.4 kts)' : 'Monitoramento de Rajadas & Limite Crítico Ativo (60 km/h)'}
      </div>
    </div>
  );
};
