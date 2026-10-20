import React from 'react';
import { Anchor, Bell, BellRing, Compass, Map, Ship, Table, Waves } from 'lucide-react';
import { PortConfig, CustomUserLocation } from '../types/maritime';
import { IntersalLogo } from './IntersalLogo';

interface NavbarProps {
  activePort: PortConfig;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  activeTab: 'dashboard' | 'table' | 'map' | 'report' | 'shipments';
  onChangeTab: (tab: 'dashboard' | 'table' | 'map' | 'report' | 'shipments') => void;
  currentTime: Date;
  userLocation: CustomUserLocation;
  notificationsEnabled?: boolean;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePort,
  onSelectPort,
  activeTab,
  onChangeTab,
  currentTime,
  userLocation,
  notificationsEnabled = false,
  onOpenNotifications,
}) => {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
        {/* Top Info Bar: Brand + Realtime Clock + Notification Button in a single compact row */}
        <div className="py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center shrink-0 border border-emerald-500/40">
              <IntersalLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-white truncate font-sans">
                Sala de Controle - Marés
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-sans truncate">
                <span className="font-medium text-slate-300">Areia Branca & Macau - RN</span>
              </p>
            </div>
          </div>

          {/* Right Controls: Notification Action + Compact Live Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notification Bell Button */}
            <button
              onClick={onOpenNotifications}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                notificationsEnabled
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Configurar Notificações de Preamar e Hora em Hora"
            >
              {notificationsEnabled ? (
                <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
              ) : (
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">
                {notificationsEnabled ? 'Alertas Ativos' : 'Notificações'}
              </span>
            </button>

            {/* Compact Live Clock */}
            <div className="shrink-0 font-mono bg-slate-800/80 px-2 sm:px-3 py-1 rounded-lg border border-slate-700/70 text-right shadow-sm">
              <div className="text-[11px] sm:text-xs font-bold text-white leading-tight flex items-center justify-end gap-1">
                <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="text-[9px] sm:text-[10px] text-cyan-400 font-medium">BRT</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 leading-tight">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation & Port Selector Bar */}
        <div className="py-1.5 sm:py-2 flex flex-col md:flex-row md:items-center justify-between gap-1.5 sm:gap-2.5">
          {/* Grouped Controls Container (Scrollable on small screens) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full justify-between md:justify-start">
            {/* Port Toggle (Compact on mobile) */}
            <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-950/80 rounded-lg sm:rounded-xl border border-slate-800 shrink-0">
              <button
                id="port-select-areia-branca"
                onClick={() => onSelectPort('areia_branca')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1 sm:gap-1.5 ${
                  activePort.id === 'areia_branca'
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Anchor className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Areia Branca</span>
              </button>
              <button
                id="port-select-macau"
                onClick={() => onSelectPort('macau')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1 sm:gap-1.5 ${
                  activePort.id === 'macau'
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Macau</span>
              </button>
            </div>

            {/* Subtle Divider (Desktop only or inline) */}
            <div className="hidden md:block w-px h-5 bg-slate-800" />

            {/* Tab Navigation (Responsive pills with icons and short labels on mobile) */}
            <nav className="flex items-center gap-1 shrink-0 ml-auto md:ml-0 overflow-x-auto scrollbar-none">
              <button
                id="nav-tab-dashboard"
                onClick={() => onChangeTab('dashboard')}
                title="Painel em Tempo Real"
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Waves className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-cyan-400" />
                <span>Painel</span>
              </button>

              <button
                id="nav-tab-shipments"
                onClick={() => onChangeTab('shipments')}
                title="Line-Up de Navios INTERSAL"
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'shipments'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Ship className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-cyan-400" />
                <span>Line-Up</span>
              </button>

              <button
                id="nav-tab-map"
                onClick={() => onChangeTab('map')}
                title="Mapa Náutico Georreferenciado"
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'map'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Map className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-indigo-400" />
                <span className="hidden sm:inline">Mapa Náutico</span>
                <span className="sm:hidden">Mapa</span>
              </button>

              <button
                id="nav-tab-table"
                onClick={() => onChangeTab('table')}
                title="Tábua de Marés DHN"
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'table'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Table className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-400" />
                <span className="hidden sm:inline">Tábua DHN</span>
                <span className="sm:hidden">Tábua</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};
