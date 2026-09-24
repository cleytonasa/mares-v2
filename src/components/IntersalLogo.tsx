import React from 'react';

interface IntersalLogoProps {
  className?: string;
  size?: number | string;
}

export const IntersalLogo: React.FC<IntersalLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Subtle radial radar background */}
        <radialGradient id="intersal-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#f3f8f4" />
          <stop offset="100%" stopColor="#e2efe5" />
        </radialGradient>

        {/* Clip path for badge wave */}
        <clipPath id="badge-clip">
          <rect x="48" y="60" width="204" height="82" rx="14" ry="14" />
        </clipPath>
      </defs>

      {/* Outer Circle Background */}
      <circle cx="150" cy="150" r="142" fill="url(#intersal-bg)" stroke="#016836" strokeWidth="12" />

      {/* Tech / Radar Circles & Markings */}
      <circle cx="150" cy="150" r="126" fill="none" stroke="#a3cbb3" strokeWidth="1.5" strokeDasharray="3,4" opacity="0.6" />
      <circle cx="150" cy="150" r="105" fill="none" stroke="#7eb894" strokeWidth="1" opacity="0.4" />
      <circle cx="150" cy="150" r="80" fill="none" stroke="#a3cbb3" strokeWidth="1" strokeDasharray="2,3" opacity="0.5" />

      {/* Small tech accent ticks */}
      <path d="M 28 150 L 38 150 M 262 150 L 272 150 M 150 28 L 150 38" stroke="#016836" strokeWidth="2" opacity="0.5" />

      {/* Intersal Top Green Badge */}
      <g>
        <rect x="48" y="60" width="204" height="82" rx="14" ry="14" fill="#016836" />
        
        {/* White bottom wave inside green badge */}
        <path
          d="M 48 126 C 85 112, 115 138, 150 120 C 185 102, 215 128, 252 116 L 252 142 L 48 142 Z"
          fill="#ffffff"
          clipPath="url(#badge-clip)"
        />

        {/* INTERSAL Text */}
        <text
          x="150"
          y="105"
          fontFamily="'Arial Black', 'Helvetica Neue', sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="36"
          fill="#ffffff"
          textAnchor="middle"
          letterSpacing="2"
        >
          INTERSAL
        </text>
      </g>

      {/* "SALA DE" Text */}
      <text
        x="150"
        y="178"
        fontFamily="'Arial Black', 'Trebuchet MS', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill="#016836"
        textAnchor="middle"
        letterSpacing="1"
      >
        SALA DE
      </text>

      {/* "OPERAÇÃO" Text */}
      <text
        x="150"
        y="218"
        fontFamily="'Arial Black', 'Trebuchet MS', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill="#016836"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        OPERAÇÃO
      </text>

      {/* Bottom Trend & Bar Chart Icon */}
      <g transform="translate(112, 222)">
        {/* Baseline */}
        <line x1="0" y1="52" x2="76" y2="52" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        
        {/* 4 Bars */}
        <rect x="5" y="38" width="10" height="14" fill="#111827" rx="1" />
        <rect x="22" y="28" width="10" height="24" fill="#111827" rx="1" />
        <rect x="40" y="20" width="10" height="32" fill="#111827" rx="1" />
        <rect x="58" y="10" width="10" height="42" fill="#111827" rx="1" />

        {/* Rising Trendline Arrow */}
        <path
          d="M 5 32 L 24 22 L 40 28 L 65 6"
          fill="none"
          stroke="#016836"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead */}
        <path
          d="M 52 5 L 66 5 L 66 19"
          fill="none"
          stroke="#016836"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Point marker dot */}
        <circle cx="5" cy="32" r="2.5" fill="#016836" />
      </g>
    </svg>
  );
};
