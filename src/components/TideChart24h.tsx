import React from 'react';
import { PortConfig } from '../types/maritime';
import { get48hTideCurve, calculateCurrentTide } from '../utils/tideCalculations';
import { getTidesForDay } from '../data/tideData2026';

interface TideChart48hProps {
  port: PortConfig;
  selectedDate: Date;
  onChangeDate?: (newDate: Date) => void;
  currentTime: Date;
  onSelectTime?: (time: Date) => void;
}

export const TideChart24h: React.FC<TideChart48hProps> = ({
  port,
  selectedDate,
  currentTime,
}) => {
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
  const curvePoints = get48hTideCurve(selectedDate, port, 192);

  // SVG dimensions - Height increased for clearer vertical amplitude on mobile
  const svgWidth = 900;
  const svgHeight = 390;
  const padding = { top: 40, right: 28, bottom: 65, left: 45 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minHeight = 0.0;
  const maxHeight = 4.0;

  const scaleX = (fraction: number) => padding.left + fraction * chartWidth;
  const scaleY = (height: number) => padding.top + (1 - (height - minHeight) / (maxHeight - minHeight)) * chartHeight;

  // Build SVG Path for 48 Hours
  const pathD = curvePoints.reduce((acc, pt, idx) => {
    const fraction = idx / (curvePoints.length - 1);
    const x = scaleX(fraction);
    const y = scaleY(pt.height);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${scaleX(1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  // Midnight / Day separation X coordinate (exactly 24h in 48h = fraction 0.5)
  const midnightX = scaleX(0.5);

  // Calculate position of current time cursor within the 48h window
  const startWindowTs = new Date(selectedDate).setHours(0, 0, 0, 0);
  const endWindowTs = startWindowTs + 48 * 60 * 60 * 1000;
  const currentTs = currentTime.getTime();
  const isCurrentTimeInWindow = currentTs >= startWindowTs && currentTs <= endWindowTs;
  const currentWindowFraction = (currentTs - startWindowTs) / (48 * 60 * 60 * 1000);
  const currentCursorX = scaleX(Math.max(0, Math.min(1, currentWindowFraction)));

  return (
    <div className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-2.5 sm:p-4 md:p-5 shadow-xl text-slate-100">
      {/* SVG Chart Container - Fully visible and scalable on mobile screens */}
      <div className="relative w-full overflow-hidden select-none bg-slate-950/50 rounded-lg sm:rounded-xl border border-slate-800/70 p-1 sm:p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block cursor-default"
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="tideGradient48" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Day Sections Shading */}
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

          {/* Midnight 24h / 00h Vertical Divider Line */}
          <line
            x1={midnightX}
            y1={padding.top}
            x2={midnightX}
            y2={svgHeight - padding.bottom}
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Y Axis labels without horizontal grid lines */}
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

          {/* X Axis Time Marks across 48 Hours (Every 6 hours) */}
          {[
            { hour: 0, day: 1, label: '00h' },
            { hour: 6, day: 1, label: '06h' },
            { hour: 12, day: 1, label: '12h' },
            { hour: 18, day: 1, label: '18h' },
            { hour: 24, day: 2, label: '00h' },
            { hour: 30, day: 2, label: '06h' },
            { hour: 36, day: 2, label: '12h' },
            { hour: 42, day: 2, label: '18h' },
            { hour: 48, day: 2, label: '24h' },
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
                  y={svgHeight - padding.bottom + 17}
                  fill={item.hour === 24 ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight={item.hour === 24 ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
                {item.hour === 24 && (
                  <text
                    x={x}
                    y={svgHeight - padding.bottom + 29}
                    fill="#0ea5e9"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Virada de Dia
                  </text>
                )}
              </g>
            );
          })}

          {/* Day Date Legends positioned below the hours axis */}
          <g>
            {/* Day 1 bracket & date */}
            <line
              x1={scaleX(0.04)}
              y1={svgHeight - padding.bottom + 34}
              x2={scaleX(0.44)}
              y2={svgHeight - padding.bottom + 34}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={scaleX(0.25)}
              y={svgHeight - padding.bottom + 50}
              fill="#38bdf8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {d1.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </text>

            {/* Day 2 bracket & date */}
            <line
              x1={scaleX(0.56)}
              y1={svgHeight - padding.bottom + 34}
              x2={scaleX(0.96)}
              y2={svgHeight - padding.bottom + 34}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={scaleX(0.75)}
              y={svgHeight - padding.bottom + 50}
              fill="#94a3b8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {d2.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </text>
          </g>

          {/* 48h Tide Area and Line */}
          <path d={areaD} fill="url(#tideGradient48)" />
          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

          {/* Day 1 High Tide Events Markers (0-24h) - Low tides removed */}
          {day1Tides.events
            .filter((evt) => evt.type === 'high')
            .map((evt, idx) => {
              const [h, m] = evt.time.split(':').map(Number);
              const fraction = (h * 60 + m) / 2880; // in 48h
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
                  <circle
                    cx={x}
                    cy={y}
                    r={4.5}
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                  />
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

          {/* Day 2 High Tide Events Markers (24-48h) - Low tides removed */}
          {day2Tides.events
            .filter((evt) => evt.type === 'high')
            .map((evt, idx) => {
              const [h, m] = evt.time.split(':').map(Number);
              const fraction = (1440 + h * 60 + m) / 2880; // in 48h
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
                  <circle
                    cx={x}
                    cy={y}
                    r={4.5}
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                  />
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

          {/* Real-time Current Position Marker (AGORA) */}
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
                AGORA ({currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </text>
            </g>
          )}

        </svg>
      </div>
    </div>
  );
};

