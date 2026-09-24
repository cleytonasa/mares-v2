import React, { useState } from 'react';
import { Calendar, Search, Printer, Download, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { PortConfig, DayTides } from '../types/maritime';
import { getMonthTides } from '../data/tideData2026';

interface TideTableMonthlyProps {
  port: PortConfig;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TideTableMonthly: React.FC<TideTableMonthlyProps> = ({
  port,
  selectedDate,
  onSelectDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(selectedDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const year = 2026;

  const monthTides = getMonthTides(year, selectedMonth);

  const filteredDays = monthTides.filter((day) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const dayStr = String(day.day).padStart(2, '0');
    const dow = day.dayOfWeek.toLowerCase();
    return dayStr.includes(term) || dow.includes(term);
  });

  const getMoonIcon = (phase?: string | null) => {
    switch (phase) {
      case 'full':
        return <span className="text-yellow-300" title="Lua Cheia (Sizígia)">🌕</span>;
      case 'new':
        return <span className="text-slate-400" title="Lua Nova (Sizígia)">🌑</span>;
      case 'first_quarter':
        return <span className="text-cyan-300" title="Quarto Crescente">🌓</span>;
      case 'last_quarter':
        return <span className="text-cyan-300" title="Quarto Minguante">🌗</span>;
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = `Data,DiaSemana,FaseLua,Hora1,Alt1_m,Hora2,Alt2_m,Hora3,Alt3_m,Hora4,Alt4_m\n`;
    monthTides.forEach((dt) => {
      const dateStr = `${String(dt.day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${year}`;
      const evts = dt.events.map(e => `${e.time},${(e.height * port.heightMultiplier).toFixed(2)}`).join(',');
      csv += `${dateStr},${dt.dayOfWeek},${dt.moonPhase || ''},${evts}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tabua_Mares_${port.id}_${selectedMonth}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl text-slate-100 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Tábua Anual de Marés {year}
            </h3>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 text-xs font-mono font-bold">
              {port.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {port.fullName} • Nível Médio {port.meanLevel}m
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-md shadow-cyan-600/30 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Tábua
          </button>
        </div>
      </div>

      {/* Month Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MONTH_NAMES.map((mName, idx) => {
          const mNum = idx + 1;
          const isSelected = selectedMonth === mNum;
          return (
            <button
              key={mNum}
              onClick={() => setSelectedMonth(mNum)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mName}
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar dia (ex: 15 ou DOM)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <span className="text-xs font-mono text-slate-400">
          Mostrando {filteredDays.length} dias de {MONTH_NAMES[selectedMonth - 1]} {year}
        </span>
      </div>

      {/* Grid of Day Cards matching the Official Navy Publication */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredDays.map((dayTide) => {
          const isToday =
            selectedDate.getDate() === dayTide.day &&
            selectedDate.getMonth() + 1 === selectedMonth;

          return (
            <div
              key={dayTide.day}
              onClick={() => {
                const newD = new Date(year, selectedMonth - 1, dayTide.day);
                onSelectDate(newD);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                isToday
                  ? 'bg-cyan-950/80 border-cyan-500 shadow-lg shadow-cyan-950'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black font-mono text-white">
                    {String(dayTide.day).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold uppercase text-cyan-400 font-mono">
                    {dayTide.dayOfWeek}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {dayTide.moonPhase && getMoonIcon(dayTide.moonPhase)}
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500 text-slate-950 uppercase font-mono">
                      HOJE
                    </span>
                  )}
                </div>
              </div>

              {/* Tides Events List */}
              <div className="space-y-1.5 my-2.5">
                {dayTide.events.map((evt, eIdx) => {
                  const adjustedHeight = evt.height * port.heightMultiplier;
                  return (
                    <div
                      key={eIdx}
                      className="flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-400 font-bold">
                        {evt.time}
                      </span>
                      <span
                        className={`font-bold ${
                          evt.type === 'high' ? 'text-cyan-300' : 'text-slate-300'
                        }`}
                      >
                        {adjustedHeight.toFixed(2)} m
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Daily Amplitude Footer */}
              <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Amplitude:</span>
                <span className="font-bold text-slate-200">
                  {(
                    (Math.max(...dayTide.events.map(e => e.height)) -
                      Math.min(...dayTide.events.map(e => e.height))) *
                    port.heightMultiplier
                  ).toFixed(2)}{' '}
                  m
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
