import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Locate,
  Loader2,
} from 'lucide-react';
import { PortConfig, CustomUserLocation } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { translations, Language } from '../utils/i18n';

interface InteractiveNauticalMapProps {
  port: PortConfig;
  tideState: CurrentTideState;
  userLocation: CustomUserLocation;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  onUpdateUserLocation: (newLoc: CustomUserLocation) => void;
  language?: Language;
}

export const InteractiveNauticalMap: React.FC<InteractiveNauticalMapProps> = ({
  port,
  tideState,
  userLocation,
  onSelectPort,
  onUpdateUserLocation,
  language = 'pt',
}) => {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = port?.lat ?? -5.1092;
    const lng = port?.lng ?? -36.6841;
    const zoom = port?.zoom ?? 12;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([lat, lng], zoom);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter nautical-style tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap & CARTO',
      }).addTo(map);

      // Add marker for port
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${port?.name || 'Port'}</b><br/>Tide: ${tideState.currentHeight.toFixed(2)}m`);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    } catch (err) {
      console.error('Leaflet map initialization error:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [port, tideState.currentHeight]);

  const handleLocateMe = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(language === 'en' ? 'Geolocation not supported' : 'Geolocalização não suportada');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onUpdateUserLocation({ lat: latitude, lng: longitude, label: language === 'en' ? 'Current GPS Location' : 'Localização GPS Atual' });
        setGpsLoading(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 13, { animate: true });
          L.marker([latitude, longitude])
            .addTo(mapInstanceRef.current)
            .bindPopup(language === 'en' ? 'Your GPS Location' : 'Sua Localização GPS')
            .openPopup();
        }
      },
      (err) => {
        setGpsError(err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            {t.nauticalMapTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.nauticalMapSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {gpsError && <span className="text-xs text-rose-400">{gpsError}</span>}
          <button
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow"
          >
            {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />}
            {language === 'en' ? 'My GPS' : 'Meu GPS'}
          </button>
        </div>
      </div>

      <div className="w-full h-[450px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
