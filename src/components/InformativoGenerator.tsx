import React, { useState } from 'react';
import { FileText, Copy, Check, Waves, Wind, Ship, CheckCircle2, Clock } from 'lucide-react';
import { PortConfig, WeatherData } from '../types/maritime';
import { getTidesForDay } from '../data/tideData2026';
import { calculateCurrentTide, get24hTideCurve } from '../utils/tideCalculations';
import { IntersalLogo } from './IntersalLogo';
import { SALT_SHIPMENTS_2026 } from '../data/saltShipmentsData';
import { translations, Language } from '../utils/i18n';

interface InformativoGeneratorProps {
  port: PortConfig;
  selectedDate: Date;
  weather: WeatherData | null;
  currentTime: Date;
  language?: Language;
}

export const InformativoGenerator: React.FC<InformativoGeneratorProps> = ({
  port,
  selectedDate,
  weather,
  currentTime,
  language = 'pt',
}) => {
  const t = translations[language];
  const [copied, setCopied] = useState(false);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();

  const dayTides = getTidesForDay(year, month, day);

  const handleCopy = () => {
    const text = `⚓ INTERSAL BULLETIN - ${port.name} (${selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR')})\n` +
      `Tides: ${dayTides.events.map(e => `${e.type.toUpperCase()} ${e.time} (${e.height}m)`).join(' | ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            {t.informativoTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t.informativoSubtitle}</p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? (language === 'en' ? 'Copied!' : 'Copiado!') : t.copyText}
        </button>
      </div>

      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 space-y-4">
        <div className="text-center font-bold text-cyan-300 text-sm">
          {language === 'en' ? 'OFFICIAL DAILY MARITIME BULLETIN (DHN / INTERSAL)' : 'BOLETIM DIÁRIO OFICIAL DE MARÉ & NAVEGAÇÃO (DHN / INTERSAL)'}
        </div>
        <div>
          <span className="text-slate-400">{language === 'en' ? 'Port:' : 'Porto:'}</span> <strong className="text-white">{port.name}</strong>
        </div>
        <div>
          <span className="text-slate-400">{language === 'en' ? 'Date:' : 'Data:'}</span> <strong className="text-white">{selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR')}</strong>
        </div>
        <div className="pt-2 border-t border-slate-800">
          <span className="text-slate-400 block mb-1">{language === 'en' ? 'Tide Schedule:' : 'Tábua de Marés do Dia:'}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {dayTides.events.map((evt, idx) => (
              <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold block">{evt.type === 'high' ? (language === 'en' ? 'High' : 'Preamar') : (language === 'en' ? 'Low' : 'Baixa-mar')}</span>
                <span className="text-white font-mono">{evt.time}</span> ({evt.height}m)
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
