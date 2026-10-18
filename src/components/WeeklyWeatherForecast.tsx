import React, { useState } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Waves,
  Droplets,
  Calendar,
  Compass,
  Sunrise,
  Sunset,
  ChevronRight,
} from 'lucide-react';
import { DailyForecastDay, PortConfig } from '../types/maritime';
import { translations, Language } from '../utils/i18n';

interface WeeklyWeatherForecastProps {
  forecast?: DailyForecastDay[];
  port: PortConfig;
  loading?: boolean;
  language?: Language;
}

export const WeeklyWeatherForecast: React.FC<WeeklyWeatherForecastProps> = ({
  forecast,
  port,
  loading = false,
  language = 'pt',
}) => {
  const t = translations[language];
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [useKnots, setUseKnots] = useState<boolean>(true);

  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center text-slate-400">
        {language === 'en' ? 'Loading weather forecast...' : 'Carregando previsão meteorológica...'}
      </div>
    );
  }

  const selectedDay = forecast[selectedDayIndex] || forecast[0];

  const getWeatherIcon = (code: number, className: string = 'w-6 h-6') => {
    if (code === 0) return <Sun className={`${className} text-amber-400 animate-pulse`} />;
    if (code <= 2) return <CloudSun className={`${className} text-amber-300`} />;
    if (code <= 45) return <Cloud className={`${className} text-slate-400`} />;
    if (code <= 65) return <CloudRain className={`${className} text-cyan-400`} />;
    return <CloudLightning className={`${className} text-purple-400 animate-bounce`} />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return language === 'en' ? 'Clear Sky / Sunny' : 'Céu Limpo / Ensolarado';
    if (code <= 2) return language === 'en' ? 'Partly Cloudy' : 'Parcialmente Nublado';
    if (code <= 45) return language === 'en' ? 'Overcast / Mist' : 'Nublado / Névoa';
    if (code <= 65) return language === 'en' ? 'Light Rain / Showers' : 'Chuva Fraca / Pancadas';
    return language === 'en' ? 'Thunderstorms' : 'Tempestade com Raios';
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background glow accent */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-cyan-400" />
            {t.weeklyForecastTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.weeklyForecastSubtitle}
          </p>
        </div>

        {/* Wind Unit Switcher */}
        <button
          onClick={() => setUseKnots(!useKnots)}
          className="px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-300 hover:border-cyan-500 transition self-start sm:self-auto"
          title={language === 'en' ? 'Toggle wind unit' : 'Alternar unidade de vento'}
        >
          <span className="hidden xs:inline">{language === 'en' ? 'Wind: ' : 'Vento: '}</span>
          <span className="text-cyan-400 font-bold">{useKnots ? 'Nós (kts)' : 'km/h'}</span>
        </button>
      </div>

      {/* 7-Day Responsive Horizontal Carousel / Grid */}
      <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x -mx-1 px-1">
        {forecast.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const isToday = day.isToday;
          const windSpd = useKnots ? `${day.windSpeedMaxKnots} kts` : `${day.windSpeedMaxKmH} km/h`;

          return (
            <button
              key={day.date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-shrink-0 w-[105px] sm:w-auto p-2 sm:p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between gap-1.5 snap-start relative ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-500/80 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-950/50'
                  : isToday
                  ? 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider block ${
                      isToday ? 'text-cyan-300' : 'text-slate-200'
                    }`}
                  >
                    {day.dayOfWeek}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  {day.formattedDate}
                </span>
              </div>

              <div className="my-0.5 transform hover:scale-110 transition duration-300">
                {getWeatherIcon(day.weatherCode, 'w-6 h-6 sm:w-7 sm:h-7')}
              </div>

              <div className="w-full">
                <div className="flex items-baseline justify-center gap-1 font-mono">
                  <span className="text-xs sm:text-sm font-black text-white">{day.tempMax}°</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">{day.tempMin}°</span>
                </div>

                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1 flex">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 rounded-full"
                    style={{
                      marginLeft: `${Math.max(0, ((day.tempMin - 20) / 18) * 100)}%`,
                      width: `${Math.max(20, ((day.tempMax - day.tempMin) / 18) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="w-full pt-1 border-t border-slate-800/80 flex flex-col gap-0.5 text-[10px] font-mono">
                <div className="flex items-center justify-center gap-1 text-slate-300 truncate" title={`Vento: ${windSpd}`}>
                  <Wind className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{windSpd}</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-slate-400" title={`Ondulação: ${day.waveHeightMeters}m`}>
                  <Waves className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span>{day.waveHeightMeters.toFixed(1)}m</span>
                </div>
              </div>

              {day.precipitationProb >= 15 && (
                <div className="absolute -top-1.5 -right-1 px-1 py-0.2 bg-blue-600/90 text-[8px] font-mono font-bold text-white rounded-full flex items-center gap-0.5 shadow-sm">
                  <Droplets className="w-2.5 h-2.5" />
                  {day.precipitationProb}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detailed Breakdown Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div>
          <span className="text-slate-400 text-[10px] uppercase block">
            {language === 'en' ? 'Condition' : 'Condição'}
          </span>
          <span className="font-bold text-white mt-0.5 block truncate">
            {getWeatherDescription(selectedDay.weatherCode)}
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase block">
            {language === 'en' ? 'Wind / Gusts' : 'Vento / Rajadas'}
          </span>
          <span className="font-bold text-cyan-300 mt-0.5 block">
            {useKnots ? `${selectedDay.windSpeedMaxKnots} kts` : `${selectedDay.windSpeedMaxKmH} km/h`} (Raj: {selectedDay.windGustMaxKnots} kts)
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase block">
            {language === 'en' ? 'Wave Height' : 'Ondulação (Vaga)'}
          </span>
          <span className="font-bold text-indigo-300 mt-0.5 block">
            {selectedDay.waveHeightMeters.toFixed(1)} m ({selectedDay.waveDirection})
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase block">
            {language === 'en' ? 'Precipitation' : 'Precipitação'}
          </span>
          <span className="font-bold text-blue-300 mt-0.5 block">
            {selectedDay.precipitationProb}% ({selectedDay.precipitationMm} mm)
          </span>
        </div>
      </div>
    </div>
  );
};
