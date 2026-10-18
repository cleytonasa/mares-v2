import React from 'react';
import { CloudRain, Droplets, Calendar } from 'lucide-react';
import { PortConfig } from '../types/maritime';
import { translations, Language } from '../utils/i18n';

interface RainfallChartProps {
  port: PortConfig;
  language?: Language;
}

export const RainfallChart: React.FC<RainfallChartProps> = ({ port, language = 'pt' }) => {
  const t = translations[language];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-400" />
            {t.rainfallTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t.rainfallSubtitle}</p>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          {language === 'en' ? 'Region: Rio Grande do Norte Coast (Areia Branca / Macau)' : 'Região: Costa Salineira do RN (Areia Branca / Macau)'}
        </span>
        <span className="text-cyan-400 font-bold">2026: 620 mm ({language === 'en' ? 'Normal Year' : 'Ano Normal'})</span>
      </div>
    </div>
  );
};
