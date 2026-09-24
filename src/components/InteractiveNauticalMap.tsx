import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Locate,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PortConfig, CustomUserLocation } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { decimalToDMS } from '../data/vesselTrafficData';

interface InteractiveNauticalMapProps {
  port: PortConfig;
  tideState: CurrentTideState;
  userLocation: CustomUserLocation;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  onUpdateUserLocation: (newLoc: CustomUserLocation) => void;
}

export const InteractiveNauticalMap: React.FC<InteractiveNauticalMapProps> = ({
  port,
  tideState,
  userLocation,
  onSelectPort,
  onUpdateUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'nautical'>('nautical');
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isRealGps, setIsRealGps] = useState<boolean>(false);

  // Request Real Device GPS Location
  const requestDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada neste navegador.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const dmsLat = decimalToDMS(lat, true);
        const dmsLng = decimalToDMS(lng, false);
        const accuracy = Math.round(position.coords.accuracy || 0);

        const realLocation: CustomUserLocation = {
          lat,
          lng,
          name: `Localização Real do Dispositivo (±${accuracy}m)`,
          dmsLat,
          dmsLng,
          isManual: false,
          estimatedBaseZHDepth: 4.0,
        };

        onUpdateUserLocation(realLocation);
        setIsRealGps(true);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Permissão de GPS negada. Ative a localização no navegador/celular.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError('Sinal de GPS indisponível no momento.');
        } else {
          setGpsError('Tempo limite ao obter localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  }, [onUpdateUserLocation]);

  // Request GPS automatically when opening map
  useEffect(() => {
    if (!isRealGps && !userLocation.isManual) {
      requestDeviceLocation();
    }
  }, []);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Handle map clicks to set manual location
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        const dmsLat = decimalToDMS(lat, true);
        const dmsLng = decimalToDMS(lng, false);

        onUpdateUserLocation({
          lat,
          lng,
          name: `Posição Marcada (${dmsLat} ${dmsLng})`,
          dmsLat,
          dmsLng,
          isManual: true,
          estimatedBaseZHDepth: 4.5,
        });
        setIsRealGps(false);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if unmounted
    };
  }, []);

  // Update Layers & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing overlay layers
    map.eachLayer((layer) => {
      if (
        layer instanceof L.TileLayer ||
        layer instanceof L.Marker ||
        layer instanceof L.Polygon ||
        layer instanceof L.Polyline ||
        layer instanceof L.Circle
      ) {
        map.removeLayer(layer);
      }
    });

    // 1. Base Tile Layer
    if (mapType === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri World Imagery, DigitalGlobe',
        maxZoom: 18,
      }).addTo(map);
    } else {
      // Nautical Chart (OpenSeaMap overlays)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; OpenSeaMap contributors',
        maxZoom: 18,
      }).addTo(map);
    }

    // 2. Navigation Channel & Regional Navigational Features
    const termisaOffshoreCoords: [number, number] = [-4.825, -37.040];
    const pontaUpanemaCoords: [number, number] = [-4.912, -37.135];
    const fozRioMossoroCoords: [number, number] = [-4.955, -37.142];
    const portoAreiaBrancaCoords: [number, number] = [-4.958, -37.133];

    const macauBarraCoords: [number, number] = [-5.0683, -36.6342];

    // Helper for Div Icons
    const createPOI_Icon = (color: string, iconStr: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-poi',
        html: `
          <div style="background: ${color}; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 11px; font-family: monospace; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>${iconStr}</span>
            <span>${label}</span>
          </div>
        `,
        iconSize: [130, 30],
        iconAnchor: [65, 15],
      });
    };

    // Areia Branca Points
    L.marker(termisaOffshoreCoords, {
      icon: createPOI_Icon('#0284c7', '🏝️', 'TERMISA (Ilha Salineira)'),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #0284c7;">TERMISA - Terminal Salineiro</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Ilha artificial a 14km da costa</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Calado máximo: 15.0m (Berço de Navios)</p>
      </div>
    `);

    L.marker(pontaUpanemaCoords, {
      icon: createPOI_Icon('#eab308', '⚠️', 'Barra da Ponta do Upanema'),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #ca8a04;">Barra da Ponta do Upanema</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Profundidade crítica no ZH: 2.2 metros</p>
      </div>
    `);

    L.marker(portoAreiaBrancaCoords, {
      icon: createPOI_Icon('#475569', '⚓', 'Porto de Areia Branca'),
    }).addTo(map);

    // Channel Polyline (Areia Branca)
    const areiaBrancaChannel: [number, number][] = [
      fozRioMossoroCoords,
      pontaUpanemaCoords,
      [-4.86, -37.08],
      [-4.82236, -37.04381],
      termisaOffshoreCoords,
    ];

    L.polyline(areiaBrancaChannel, {
      color: '#06b6d4',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85,
    }).addTo(map);

    // Critical Shallow Bank Polygon (Ponta do Upanema)
    const shallowBankCoords: [number, number][] = [
      [-4.905, -37.145],
      [-4.920, -37.125],
      [-4.928, -37.132],
      [-4.915, -37.155],
    ];

    L.polygon(shallowBankCoords, {
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.25,
      weight: 2,
      dashArray: '4, 4',
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #d97706;">Banco Crítico de Areia</h4>
        <p style="margin: 2px 0 0 0; font-size: 11px;">Restrição de calado em maré de sizígia baixa.</p>
      </div>
    `);

    // Macau Marker
    L.marker(macauBarraCoords, {
      icon: createPOI_Icon('#06b6d4', '🧭', 'Barra de Macau (Rio Açu)'),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #0891b2;">Barra de Macau</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Profundidade crítica no ZH: 1.8 metros</p>
      </div>
    `);

    // User / Device Location Marker (Pulsing Circle)
    const userMarkerIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #06b6d4; border: 3px solid #ffffff; box-shadow: 0 0 15px #06b6d4; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            📍
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userMarkerIcon,
      zIndexOffset: 1000,
      draggable: true,
    }).addTo(map);

    userMarker.on('dragend', (e) => {
      const latlng = (e.target as L.Marker).getLatLng();
      const lat = Number(latlng.lat.toFixed(6));
      const lng = Number(latlng.lng.toFixed(6));
      const dmsLat = decimalToDMS(lat, true);
      const dmsLng = decimalToDMS(lng, false);

      onUpdateUserLocation({
        lat,
        lng,
        name: `Posição Marcada (${dmsLat})`,
        dmsLat,
        dmsLng,
        isManual: true,
        estimatedBaseZHDepth: 4.5,
      });
      setIsRealGps(false);
    });

    userMarker.bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 6px; min-width: 200px;">
        <div style="display: flex; align-items: center; gap: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
          <span style="font-size: 14px;">📍</span>
          <h4 style="margin: 0; font-weight: bold; color: #0891b2; font-size: 13px;">${userLocation.name}</h4>
        </div>
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; font-family: monospace;">
          ${userLocation.dmsLat} ${userLocation.dmsLng}
        </p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">
          Lâmina d'água estimada: <strong style="color: #0891b2;">${(userLocation.estimatedBaseZHDepth + tideState.currentHeight).toFixed(2)}m</strong>
        </p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8; font-style: italic;">
          (Dica: Arraste este pino ou clique no mapa para mudar)
        </p>
      </div>
    `);

    // Range rings from user location (1 NM, 3 NM, 5 NM)
    if (showRangeRings) {
      const nm1InMeters = 1852;
      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 4',
        weight: 1,
      }).addTo(map);

      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters * 3,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 6',
        weight: 1,
        opacity: 0.6,
      }).addTo(map);

      L.circle([userLocation.lat, userLocation.lng], {
        radius: nm1InMeters * 5,
        color: '#06b6d4',
        fill: false,
        dashArray: '4 8',
        weight: 1,
        opacity: 0.4,
      }).addTo(map);
    }
  }, [port, mapType, userLocation, showRangeRings, tideState.currentHeight]);

  return (
    <div className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-2.5 sm:p-5 shadow-xl text-slate-100 space-y-3">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800">
        {/* GPS Status / Current Coords */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={requestDeviceLocation}
            disabled={isLocating}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              isRealGps
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Obter localização real via GPS do celular/dispositivo"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Locate className={`w-3.5 h-3.5 ${isRealGps ? 'text-emerald-400' : 'text-cyan-400'}`} />
            )}
            <span>{isLocating ? 'Buscando GPS...' : isRealGps ? 'GPS em Tempo Real' : 'Ativar GPS Real'}</span>
          </button>

          <span className="text-xs font-mono text-slate-300 truncate hidden xs:inline">
            {userLocation.dmsLat} {userLocation.dmsLng}
          </span>
        </div>

        {/* Map Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px] sm:text-xs">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded-md font-medium transition ${
                mapType === 'satellite' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satélite
            </button>
            <button
              onClick={() => setMapType('nautical')}
              className={`px-2 py-1 rounded-md font-medium transition ${
                mapType === 'nautical' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Carta Náutica
            </button>
          </div>
        </div>
      </div>

      {/* GPS Error alert if any */}
      {gpsError && (
        <div className="p-2 bg-amber-950/60 border border-amber-500/50 rounded-lg flex items-center gap-2 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative w-full h-[460px] sm:h-[520px] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Depth Overlay Card in Top-Left */}
        <div className="absolute top-3 left-3 z-10 bg-slate-950/90 border border-slate-700/80 p-2.5 sm:p-3 rounded-xl shadow-2xl backdrop-blur text-xs font-mono text-slate-200 pointer-events-auto">
          <span className="text-[10px] uppercase text-cyan-400 font-bold block">
            {isRealGps ? 'Localização Real do Dispositivo' : 'Posição no Mapa'}
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold text-white">
              {(userLocation.estimatedBaseZHDepth + tideState.currentHeight).toFixed(2)} m
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">lâmina total</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {userLocation.dmsLat} {userLocation.dmsLng}
          </div>
        </div>

        {/* Map Rings Toggle Overlay in Top-Right */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-slate-950/90 border border-slate-700 p-1.5 sm:p-2 rounded-xl text-xs font-mono backdrop-blur">
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] sm:text-[11px] text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showRangeRings}
              onChange={(e) => setShowRangeRings(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Anéis (1, 3, 5 NM)</span>
          </label>
        </div>

        {/* Quick Port Focus Buttons in Bottom-Left */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 flex gap-1.5 flex-wrap">
          <button
            onClick={() => {
              onSelectPort('areia_branca');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([-4.825, -37.040], 12);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold shadow-lg backdrop-blur transition border ${
              port.id === 'areia_branca'
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Focar TERMISA
          </button>
          <button
            onClick={() => {
              onSelectPort('macau');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([-5.0683, -36.6342], 12);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold shadow-lg backdrop-blur transition border ${
              port.id === 'macau'
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Focar Macau
          </button>
          <button
            onClick={() => {
              if (isRealGps && mapInstanceRef.current) {
                mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
              } else {
                requestDeviceLocation();
              }
            }}
            className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold shadow-lg backdrop-blur transition border bg-slate-900/90 text-cyan-300 border-cyan-500/50 hover:bg-slate-800 flex items-center gap-1"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            Minha Posição
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="p-2.5 sm:p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-300">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white inline-block shadow-sm" />
            Sua Posição
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            TERMISA (Ilha)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Ponta do Upanema
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Barra de Macau
          </span>
        </div>

        <span className="text-slate-500 font-mono text-[10px]">
          WGS84 • GPS em Tempo Real
        </span>
      </div>
    </div>
  );
};
