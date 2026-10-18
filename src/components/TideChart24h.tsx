import React from 'react';
import { PortConfig } from '../types/maritime';
import { get48hTideCurve, calculateCurrentTide } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';
import { translations, Language } from '../utils/i18n';
import { Waves, Calendar } from 'lucide-react';

interface TideChart48hProps {
  port: PortConfig;
  selectedDate: Date;
  onChangeDate?: (newDate: Date) => void;
  currentTime: Date;
  onSelectTime?: (time: Date) => void;
  language?: Language;
}

export const TideChart24h: React.FC<TideChart48hProps> = ({
  port,
  selectedDate,
  currentTime,
  language = 'pt',
}) => {
  const t = translations[language];

  // Day 1 (Reference Date)
  const d1 = new Date(selectedDate);
  const year1 = d1.getFullYear();
  const month1 = d1.getMonth() + 1;
  const day1 = d1.getDate();
  const day1Tides = getTidesForDay(year1, month1, day1);

  // Day 2 (Next Day)
  const d2 = new Date(selectedDate);
  d2.setDate(d2.getDate() + 1);
  const year2 = d2.getFullYear();
  const month2 = d2.getMonth() + 1;
  const day2 = d2.getDate();
  const day2Tides = getTidesForDay(year2, month2, day2);

  // 48h curve points (192 points = 15-minute resolution across 48h)
  const rawCurvePoints = get48hTideCurve(selectedDate, port, 192);
  const curvePoints = rawCurvePoints.map((pt, idx) => ({
    ...pt,
    hourOffset: (idx / (rawCurvePoints.length - 1)) * 48,
  }));

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 390;
  const padding = { top: 40, right: 28, bottom: 65, left: 45 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minVal = 0.0;
  const maxVal = 4.0;

  const scaleX = (val: number) => padding.left + val * chartWidth;
  const scaleY = (val: number) => svgHeight - padding.bottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  // Generate SVG path for 48h curve
  const pathData = curvePoints.reduce((acc, pt, idx) => {
    const x = scaleX(pt.hourOffset / 48);
    const y = scaleY(pt.height);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Gradient area fill path
  const firstPt = curvePoints[0];
  const lastPt = curvePoints[curvePoints.length - 1];
  const areaPath = `M ${scaleX(firstPt.hourOffset / 48)} ${svgHeight - padding.bottom} L ${pathData.replace(/^M\s+/, '')} L ${scaleX(lastPt.hourOffset / 48)} ${svgHeight - padding.bottom} Z`;

  // Midnight (24h) divider position on 48h scale
  const midnightX = scaleX(24 / 48);

  // Check if currentTime falls within the 48h window from selectedDate 00:00
  const startWindow = new Date(selectedDate);
  startWindow.setHours(0, 0, 0, 0);
  const endWindow = new Date(startWindow);
  endWindow.setTime(endWindow.getTime() + 48 * 3600 * 1000);

  const isCurrentTimeInWindow = currentTime >= startWindow && currentTime <= endWindow;
  const currentHourOffset = (currentTime.getTime() - startWindow.getTime()) / (3600 * 1000);
  const currentCursorX = scaleX(Math.max(0, Math.min(48, currentHourOffset)) / 48);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Waves className="w-5 h-5 text-cyan-400" />
              {t.tideChartTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.tideChartSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.selectDate}: {selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR')}</span>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[650px] select-none"
        >
          <defs>
            <linearGradient id="tideAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="tideLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Background Split: Day 1 vs Day 2 */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth / 2}
            height={chartHeight}
            fill="#0f172a"
            opacity="0.2"
          />
          <rect
            x={midnightX}
            y={padding.top}
            width={chartWidth / 2}
            height={chartHeight}
            fill="#1e293b"
            opacity="0.1"
          />

          {/* Midnight 24h Vertical Divider Line */}
          <line
            x1={midnightX}
            y1={padding.top}
            x2={midnightX}
            y2={svgHeight - padding.bottom}
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Y Axis labels */}
          {[0, 1, 2, 3, 4].map((level) => {
            const y = scaleY(level);
            return (
              <g key={level}>
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {level.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* X Axis Time Marks (Every 6 hours) */}
          {[
            { hour: 0, label: '00h' },
            { hour: 6, label: '06h' },
            { hour: 12, label: '12h' },
            { hour: 18, label: '18h' },
            { hour: 24, label: language === 'en' ? '00h (Day 2)' : '00h (Dia 2)' },
            { hour: 30, label: '06h' },
            { hour: 36, label: '12h' },
            { hour: 42, label: '18h' },
            { hour: 48, label: '24h' },
          ].map((item, idx) => {
            const fraction = item.hour / 48;
            const x = scaleX(fraction);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 5}
                  stroke={item.hour === 24 ? '#0ea5e9' : '#475569'}
                  strokeWidth={item.hour === 24 ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  fill={item.hour === 24 ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight={item.hour === 24 ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#tideAreaGrad)" />

          {/* Harmonic Curve Stroke */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#tideLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Day 1 High Tide Markers */}
          {day1Tides.events
            .filter((evt) => evt.type === 'high')
            .map((evt, idx) => {
              const [h, m] = evt.time.split(':').map(Number);
              const fraction = (h * 60 + m) / 2880;
              const x = scaleX(fraction);
              const adjustedHeight = evt.height * port.heightMultiplier;
              const y = scaleY(adjustedHeight);

              return (
                <g key={`d1-${idx}`}>
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={svgHeight - padding.bottom}
                    stroke="#38bdf8"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <circle cx={x} cy={y} r={4.5} fill="#0284c7" stroke="#38bdf8" strokeWidth="1.8" />
                  <text
                    x={x}
                    y={y - 8}
                    fill="#7dd3fc"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {evt.time} ({adjustedHeight.toFixed(2)}m)
                  </text>
                </g>
              );
            })}

          {/* Day 2 High Tide Markers */}
          {day2Tides.events
            .filter((evt) => evt.type === 'high')
            .map((evt, idx) => {
              const [h, m] = evt.time.split(':').map(Number);
              const fraction = (1440 + h * 60 + m) / 2880;
              const x = scaleX(fraction);
              const adjustedHeight = evt.height * port.heightMultiplier;
              const y = scaleY(adjustedHeight);

              return (
                <g key={`d2-${idx}`}>
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={svgHeight - padding.bottom}
                    stroke="#38bdf8"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <circle cx={x} cy={y} r={4.5} fill="#0284c7" stroke="#38bdf8" strokeWidth="1.8" />
                  <text
                    x={x}
                    y={y - 8}
                    fill="#7dd3fc"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {evt.time} ({adjustedHeight.toFixed(2)}m)
                  </text>
                </g>
              );
            })}

          {/* Current Time Indicator */}
          {isCurrentTimeInWindow && (
            <g>
              <line
                x1={currentCursorX}
                y1={padding.top}
                x2={currentCursorX}
                y2={svgHeight - padding.bottom}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={currentCursorX}
                cy={scaleY(calculateCurrentTide(currentTime, port).currentHeight)}
                r="5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={currentCursorX}
                y={padding.top - 8}
                fill="#f87171"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {language === 'en' ? 'NOW' : 'AGORA'} ({currentTime.toLocaleTimeString(language === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
