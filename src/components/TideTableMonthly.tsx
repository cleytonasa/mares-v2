import React, { useState } from 'react';
import { Calendar, Search, Printer, Download, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { PortConfig, DayTides } from '../types/maritime';
import { getMonthTides } from '../data/tideData2026';
import { translations, Language } from '../utils/i18n';

interface TideTableMonthlyProps {
  port: PortConfig;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  language?: Language;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const TideTableMonthly: React.FC<TideTableMonthlyProps> = ({
  port,
  selectedDate,
  onSelectDate,
  language = 'pt',
}) => {
  const t = translations[language];
  const [selectedMonth, setSelectedMonth] = useState<number>(selectedDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const year = 2026;

  const monthTides = getMonthTides(year, selectedMonth);
  const monthNames = language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_PT;

  const filteredDays = monthTides.filter((day) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return day.dateStr.toLowerCase().includes(term) || day.dayOfWeek.toLowerCase().includes(term);
  });

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {t.monthlyTableTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t.monthlyTableSubtitle}</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-950 text-slate-100 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-cyan-500"
          >
            {monthNames.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m} 2026
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-slate-950 text-slate-300 sticky top-0 uppercase tracking-wider text-[10px] border-b border-slate-800 z-10">
            <tr>
              <th className="p-3">{language === 'en' ? 'Date' : 'Data'}</th>
              <th className="p-3">{language === 'en' ? 'Day' : 'Dia da Semana'}</th>
              <th className="p-3">{language === 'en' ? 'High & Low Tides (DHN 2026)' : 'Preamares e Baixa-mares (DHN 2026)'}</th>
              <th className="p-3 text-right">{language === 'en' ? 'Action' : 'Ação'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-200">
            {filteredDays.map((day) => {
              const dObj = new Date(year, selectedMonth - 1, day.day);
              return (
                <tr key={day.day} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 font-bold text-cyan-300">{day.dateStr}</td>
                  <td className="p-3 text-slate-400 capitalize">{day.dayOfWeek}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {day.events.map((evt, idx) => {
                        const adjH = evt.height * port.heightMultiplier;
                        const isHigh = evt.type === 'high';
                        return (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              isHigh
                                ? 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            {isHigh ? (language === 'en' ? 'High' : 'P') : (language === 'en' ? 'Low' : 'B')} {evt.time} ({adjH.toFixed(2)}m)
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectDate(dObj)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded-lg transition"
                    >
                      {language === 'en' ? 'Simulate' : 'Simular'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
