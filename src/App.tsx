import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CurrentTideCard } from './components/CurrentTideCard';
import { TideChart24h } from './components/TideChart24h';
import { WeeklyWeatherForecast } from './components/WeeklyWeatherForecast';
import { RainfallChart } from './components/RainfallChart';
import { InteractiveNauticalMap } from './components/InteractiveNauticalMap';
import { TideTableMonthly } from './components/TideTableMonthly';
import { InformativoGenerator } from './components/InformativoGenerator';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { NotificationModal } from './components/NotificationModal';
import { SaltShipmentsDashboard } from './components/SaltShipmentsDashboard';
import { PORTS_DATA } from './data/portsData';
import { PortConfig, WeatherData, AlertThresholds, CustomUserLocation } from './types/maritime';
import { INITIAL_USER_LOCATION, decimalToDMS } from './data/vesselTrafficData';
import { calculateCurrentTide } from './utils/tideCalculations';
import { fetchPortWeather } from './services/weatherService';
import {
  getSavedNotificationPreferences,
  saveNotificationPreferences,
  processMaritimeNotifications,
  NotificationPreferences,
} from './services/notificationService';
import { AlertTriangle, MapPin, Compass, Table, Crosshair, CloudSun, Map, Ship } from 'lucide-react';

const DEFAULT_THRESHOLDS: AlertThresholds = {
  minTideHeight: 1.0,
  minUnderKeelClearance: 0.6,
  maxWindKnots: 22,
  maxWaveHeightMeters: 1.8,
  soundAlertEnabled: false,
  autoRefreshInterval: 300,
};

export default function App() {
  const [selectedPortId, setSelectedPortId] = useState<'areia_branca' | 'macau'>('areia_branca');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'map' | 'report' | 'shipments'>('dashboard');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Notifications State (Preamar & Hourly)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(getSavedNotificationPreferences());
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);

  // Custom User Location state (starts with default, attempts real GPS)
  const [userLocation, setUserLocation] = useState<CustomUserLocation>(INITIAL_USER_LOCATION);

  // Attempt real device GPS location on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const dmsLat = decimalToDMS(lat, true);
          const dmsLng = decimalToDMS(lng, false);
          const accuracy = Math.round(pos.coords.accuracy || 0);

          setUserLocation({
            lat,
            lng,
            name: `Localização Real do Dispositivo (±${accuracy}m)`,
            dmsLat,
            dmsLng,
            isManual: false,
            estimatedBaseZHDepth: 4.0,
          });
        },
        () => {
          // Keep default if permission denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // Alerts
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  const activePort: PortConfig = PORTS_DATA[selectedPortId];
  const effectiveTime = simulatedTime || currentTime;

  // Real-time clock interval & Notification Engine
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Current calculated tide
  const currentTideState = calculateCurrentTide(effectiveTime, activePort);

  // Check and fire scheduled push notifications every 10 seconds
  useEffect(() => {
    if (!simulatedTime) {
      processMaritimeNotifications(currentTime, activePort, currentTideState, notifPrefs);
    }
  }, [currentTime, activePort, currentTideState, notifPrefs, simulatedTime]);

  const handleSaveNotifPrefs = (newPrefs: NotificationPreferences) => {
    setNotifPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  // Fetch weather when port or user location changes
  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await fetchPortWeather(userLocation.lat, userLocation.lng);
      setWeather(data);
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, [userLocation.lat, userLocation.lng]);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, thresholds.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [loadWeather, thresholds.autoRefreshInterval]);

  // Active Environmental Alerts
  const activeAlerts: string[] = [];
  const gustKmH = weather ? Math.round(weather.windGustKnots * 1.852) : 0;
  if (gustKmH >= 60) {
    activeAlerts.push(`ALERTA CRÍTICO: Rajada de vento severa de ${gustKmH} km/h (${weather?.windGustKnots} nós) acima do limite de segurança (60 km/h)`);
  } else if (weather && weather.windSpeedKnots >= thresholds.maxWindKnots) {
    activeAlerts.push(`Vento forte na região (${weather.windSpeedKnots} nós > limite de ${thresholds.maxWindKnots} nós)`);
  }
  if (weather && weather.waveHeightMeters >= thresholds.maxWaveHeightMeters) {
    activeAlerts.push(`Ondulação elevada (${weather.waveHeightMeters}m > limite de ${thresholds.maxWaveHeightMeters}m)`);
  }
  if (currentTideState.currentHeight < thresholds.minTideHeight) {
    activeAlerts.push(`Maré baixa crítica (${currentTideState.currentHeight.toFixed(2)}m < ${thresholds.minTideHeight}m)`);
  }

  const handleResetSimulation = () => {
    setSimulatedTime(null);
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Top Navbar */}
      <Navbar
        activePort={activePort}
        onSelectPort={(portId) => {
          setSelectedPortId(portId);
          setSimulatedTime(null);
        }}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        currentTime={currentTime}
        userLocation={userLocation}
        notificationsEnabled={notifPrefs.enabled}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 pt-3 sm:pt-5 space-y-3.5 sm:space-y-6">
        {/* Active Alert Banner */}
        {activeAlerts.length > 0 && (
          <div className="p-2.5 sm:p-3.5 bg-amber-950/50 border border-amber-500/50 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 text-xs text-amber-200 shadow-lg">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider block text-[11px] sm:text-xs text-amber-300">
                Condições Meteorológicas & Maré
              </span>
              <span className="text-[11px] sm:text-xs">{activeAlerts.join(' • ')}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* 1. Real-time Tide Gauge Card with Integrated Wind & Marine Conditions */}
            <CurrentTideCard
              tideState={currentTideState}
              port={activePort}
              currentTime={effectiveTime}
              weather={weather}
              isSimulated={Boolean(simulatedTime)}
              onResetSimulation={handleResetSimulation}
            />

            {/* 2. 48h Harmonic Variation Curve (Curva Harmônica de Variação - 48 Horas) */}
            <TideChart24h
              port={activePort}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              currentTime={effectiveTime}
            />

            {/* 3. 7-Day Weekly Weather & Marine Forecast (Previsão do Tempo 7 Dias) */}
            <WeeklyWeatherForecast
              forecast={weather?.weeklyForecast}
              port={activePort}
              loading={weatherLoading}
            />

            {/* 4. Pluviometer & Rainfall Monitor (Chuva no Período - Diário / Mensal) */}
            <RainfallChart port={activePort} />

            {/* Quick Actions & Navigation Module */}
            <div className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-2.5 sm:p-4 shadow-xl text-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* 1. Tábua Oficial */}
                <div
                  onClick={() => setActiveTab('table')}
                  className="p-2.5 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-950 cursor-pointer transition shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wide truncate">
                        Tábua Oficial
                      </span>
                      <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">DHN 2026</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-snug line-clamp-2">
                      365 dias, fases lunares, sizígias e quadraturas.
                    </p>
                  </div>
                </div>

                {/* 2. Carta Náutica */}
                <div
                  onClick={() => setActiveTab('map')}
                  className="p-2.5 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-950 cursor-pointer transition shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wide truncate">
                        Carta Náutica
                      </span>
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Mapa & Satélite</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-snug line-clamp-2">
                      TERMISA, Barra de Macau e GPS em tempo real.
                    </p>
                  </div>
                </div>

                {/* 3. Meteorologia Marinha */}
                <div
                  onClick={() => loadWeather()}
                  className="p-2.5 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-950 cursor-pointer transition shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wide truncate">
                        Meteorologia
                      </span>
                      <CloudSun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Ventos & Ondas</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-snug line-clamp-2">
                      Ventos alísios, rajadas, pressão e ondas.
                    </p>
                  </div>
                </div>

                {/* 4. Embarques de Sal (INTERSAL) */}
                <div
                  onClick={() => setActiveTab('shipments')}
                  className="p-2.5 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-950 cursor-pointer transition shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wide truncate">
                        INTERSAL
                      </span>
                      <Ship className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Painel de Embarque</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-snug line-clamp-2">
                      1.1M Tons, navios concluídos, gráficos e line-up.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Map */}
        {activeTab === 'map' && (
          <InteractiveNauticalMap
            port={activePort}
            tideState={currentTideState}
            userLocation={userLocation}
            onSelectPort={setSelectedPortId}
            onUpdateUserLocation={setUserLocation}
          />
        )}

        {/* Tab 3: 2026 DHN Monthly Table */}
        {activeTab === 'table' && (
          <TideTableMonthly
            port={activePort}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSimulatedTime(d);
              setActiveTab('dashboard');
            }}
          />
        )}

        {/* Tab 4: Maritime Bulletin / Informativo */}
        {activeTab === 'report' && (
          <InformativoGenerator
            port={activePort}
            selectedDate={selectedDate}
            weather={weather}
            currentTime={effectiveTime}
          />
        )}

        {/* Tab 5: Salt Shipments & Line-Up INTERSAL */}
        {activeTab === 'shipments' && (
          <SaltShipmentsDashboard />
        )}
      </main>

      {/* Alert Thresholds Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={setThresholds}
      />

      {/* Push Notifications Modal (Preamar & Hourly) */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        preferences={notifPrefs}
        onSavePreferences={handleSaveNotifPrefs}
        port={activePort}
        tideState={currentTideState}
      />
    </div>
  );
}
