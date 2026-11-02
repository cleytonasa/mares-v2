import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Locate,
  Loader2,
  AlertCircle,
  Navigation,
  Gauge,
  Clock,
  ArrowRight,
  RotateCcw,
  Wind,
} from 'lucide-react';
import { PortConfig, CustomUserLocation, WeatherData } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { decimalToDMS } from '../data/vesselTrafficData';

interface InteractiveNauticalMapProps {
  port: PortConfig;
  tideState: CurrentTideState;
  userLocation: CustomUserLocation;
  weather?: WeatherData | null;
  weatherLoading?: boolean;
  onSelectPort: (portId: 'areia_branca' | 'macau') => void;
  onUpdateUserLocation: (newLoc: CustomUserLocation) => void;
}

export type TerminalRouteId = 'areia_branca' | 'macau';

export const InteractiveNauticalMap: React.FC<InteractiveNauticalMapProps> = ({
  port,
  tideState,
  userLocation,
  weather,
  weatherLoading = false,
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

  // Nautical Route Calculation & Speed Controller (knots)
  const [activeRoute, setActiveRoute] = useState<TerminalRouteId>('areia_branca');
  const [speedKnots, setSpeedKnots] = useState<number>(7.5); // standard barge / tug speed: ~7.5 knots
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });

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

  // Request GPS in background when opening map without forcing override of the initial regional overview
  useEffect(() => {
    if (!isRealGps && !userLocation.isManual && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const dmsLat = decimalToDMS(lat, true);
          const dmsLng = decimalToDMS(lng, false);
          const accuracy = Math.round(position.coords.accuracy || 0);

          onUpdateUserLocation({
            lat,
            lng,
            name: `Localização Real do Dispositivo (±${accuracy}m)`,
            dmsLat,
            dmsLng,
            isManual: false,
            estimatedBaseZHDepth: 4.0,
          });
          setIsRealGps(true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Regional center capturing both Areia Branca (TERMISA / Barra) and Macau
      const regionalCenter: [number, number] = [-4.95, -36.90];
      const regionalZoom = 10;

      const map = L.map(mapContainerRef.current, {
        center: regionalCenter,
        zoom: regionalZoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Ensure proper rendering of tiles when map tab is opened
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

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
    const portoAreiaBrancaCoords: [number, number] = [-4.958694, -37.138250]; // 4°57'31.3"S 37°08'17.7"W

    const macauBarraCoords: [number, number] = [-5.0683, -36.6342];
    // Macau offshore approach waypoint clear of shallows
    const macauOffshoreWaypoint: [number, number] = [-4.980, -36.680];
    const macauIntermediateWaypoint: [number, number] = [-4.890, -36.850];

    // Área Externa TSI (Área de Fondeio / Espera Offshore) - 4°42'28.9"S 36°54'23.4"W
    const areaExternaTSICoords: [number, number] = [-4.708028, -36.906500];

    // Nautical Routes to TSI (Terminal Salineiro)
    const areiaBrancaToTSIRoute: [number, number][] = [
      pontaUpanemaCoords,
      [-4.865, -37.085],
      [-4.822, -37.043],
      termisaOffshoreCoords,
    ];

    const macauToTSIRoute: [number, number][] = [
      macauBarraCoords,
      macauOffshoreWaypoint,
      macauIntermediateWaypoint,
      [-4.845, -37.015],
      termisaOffshoreCoords,
    ];

    // Standard Nautical Channel / Route Lines
    // Both routes rendered with standard nautical channel styling:
    L.polyline(areiaBrancaToTSIRoute, {
      color: activeRoute === 'areia_branca' ? '#00e5ff' : '#0284c7',
      weight: activeRoute === 'areia_branca' ? 3.5 : 2.5,
      dashArray: '6, 6',
      opacity: activeRoute === 'areia_branca' ? 0.95 : 0.65,
      lineCap: 'round',
    }).addTo(map);

    L.polyline(macauToTSIRoute, {
      color: activeRoute === 'macau' ? '#00e5ff' : '#0284c7',
      weight: activeRoute === 'macau' ? 3.5 : 2.5,
      dashArray: '6, 6',
      opacity: activeRoute === 'macau' ? 0.95 : 0.65,
      lineCap: 'round',
    }).addTo(map);

    // Connection line from TSI to Área Externa TSI (offshore anchorage approach)
    L.polyline([termisaOffshoreCoords, areaExternaTSICoords], {
      color: '#38bdf8',
      weight: 2,
      dashArray: '3, 6',
      opacity: 0.6,
    }).addTo(map);

    // Helper for Div Icons with standard and highlighted states (clean, without blinking animation)
    const createPOI_Icon = (
      color: string,
      iconStr: string,
      label: string,
      isSelectedBarra: boolean = false
    ) => {
      const border = isSelectedBarra ? '2.5px solid #22d3ee' : '1.5px solid white';
      const shadow = isSelectedBarra
        ? '0 0 10px rgba(34, 211, 238, 0.8), 0 3px 10px rgba(0,0,0,0.6)'
        : '0 2px 8px rgba(0,0,0,0.45)';
      const scale = isSelectedBarra ? 'transform: scale(1.04);' : '';

      return L.divIcon({
        className: 'custom-leaflet-poi',
        html: `
          <div style="position: relative; width: fit-content; max-width: 140px; background: ${color}; color: white; padding: 2.5px 8px; border-radius: 6px; font-weight: bold; font-size: 9.5px; font-family: monospace; border: ${border}; box-shadow: ${shadow}; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; line-height: 1.2; ${scale}">
            <span style="font-size: 10px; flex-shrink: 0;">${iconStr}</span>
            <span style="overflow: hidden; text-overflow: ellipsis;">${label}</span>
          </div>
        `,
        iconSize: [130, 24],
        iconAnchor: [65, 12],
      });
    };

    // Terminal (TSI - INTERSAL)
    L.marker(termisaOffshoreCoords, {
      icon: createPOI_Icon('#0284c7', '🏝️', 'TSI - INTERSAL', false),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #0284c7;">TSI - INTERSAL</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Terminal Salineiro de Areia Branca (Ilha Artificial)</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Calado máximo: 15.0m (Berço de Navios)</p>
      </div>
    `);

    // Nova Localização: Área Externa TSI
    L.marker(areaExternaTSICoords, {
      icon: createPOI_Icon('#10b981', '⚓', 'Área Externa TSI', false),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #059669;">Área Externa TSI</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Área de Espera / Fondeio Offshore de Navios</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">4°42'28.9"S 36°54'23.4"W</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7;">Distância até TSI: <strong>10.6 NM</strong></p>
      </div>
    `);

    // Círculo indicativo de raio da Área de Fondeio Externa (1.5 NM)
    L.circle(areaExternaTSICoords, {
      radius: 1852 * 1.5,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4 6',
    }).addTo(map);

    // Barra Areia Branca (Highlighted ONLY when activeRoute === 'areia_branca')
    const isABSelected = activeRoute === 'areia_branca';
    const markerAB = L.marker(pontaUpanemaCoords, {
      icon: createPOI_Icon(isABSelected ? '#ca8a04' : '#eab308', '⚠️', 'Barra Areia Branca', isABSelected),
      zIndexOffset: isABSelected ? 500 : 100,
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #ca8a04;">Barra Areia Branca</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Profundidade crítica no ZH: 2.2 metros (Ponta do Upanema)</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7;">Distância até TSI: <strong>7.8 NM</strong></p>
      </div>
    `);
    markerAB.on('click', () => setActiveRoute('areia_branca'));

    // TPI - INTERSAL
    L.marker(portoAreiaBrancaCoords, {
      icon: createPOI_Icon('#475569', '⚓', 'TPI - INTERSAL', false),
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #334155;">TPI - INTERSAL</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Terminal Portuário Interno (Areia Branca)</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">4°57'31.3"S 37°08'17.7"W</p>
      </div>
    `);

    // Barra de Macau (Highlighted ONLY when activeRoute === 'macau')
    const isMacauSelected = activeRoute === 'macau';
    const markerMacau = L.marker(macauBarraCoords, {
      icon: createPOI_Icon(isMacauSelected ? '#0891b2' : '#06b6d4', '🧭', 'Barra de Macau', isMacauSelected),
      zIndexOffset: isMacauSelected ? 500 : 100,
    }).addTo(map).bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; color: #0891b2;">Barra de Macau</h4>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Profundidade crítica no ZH: 1.8 metros</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7;">Distância até TSI: <strong>28.5 NM</strong></p>
      </div>
    `);
    markerMacau.on('click', () => setActiveRoute('macau'));

    // River channel from TPI to Barra Areia Branca
    L.polyline([portoAreiaBrancaCoords, fozRioMossoroCoords, pontaUpanemaCoords], {
      color: '#64748b',
      weight: 2.5,
      dashArray: '4, 6',
      opacity: 0.7,
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
      icon: createPOI_Icon('#06b6d4', '🧭', 'Barra de Macau'),
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
  }, [port, mapType, userLocation, showRangeRings, tideState.currentHeight, activeRoute]);

  return (
    <div className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-1.5 sm:p-2.5 shadow-xl text-slate-100 flex flex-col">
      {/* GPS Error alert if any */}
      {gpsError && (
        <div className="mb-2 p-2 bg-amber-950/60 border border-amber-500/50 rounded-lg flex items-center gap-2 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Interactive Navigation Route & Speed (Knots) Calculator - Placed at TOP above map */}
      {(() => {
        const routeDistanceNM = activeRoute === 'areia_branca' ? 7.8 : 28.5;
        const safeSpeed = Math.max(0.5, speedKnots);
        const travelHours = routeDistanceNM / safeSpeed;
        const totalMinutes = Math.round(travelHours * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const speedKmH = (speedKnots * 1.852).toFixed(1);

        // Calculate Estimated Arrival Time (ETA) based on departureTime
        let etaString = '--:--';
        try {
          const [depH, depM] = departureTime.split(':').map(Number);
          if (!isNaN(depH) && !isNaN(depM)) {
            const arrTotalMinutes = depH * 60 + depM + totalMinutes;
            const arrH = Math.floor((arrTotalMinutes / 60) % 24);
            const arrM = arrTotalMinutes % 60;
            etaString = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
          }
        } catch {
          etaString = '--:--';
        }

        return (
          <div className="mb-2 p-2 sm:p-2.5 bg-slate-950/90 rounded-xl border border-cyan-500/30 shadow-lg text-slate-200">
            {/* Header: Route Selection Buttons on Left Side with User Prompt */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              {/* Route Selector with clear prompt on the Left */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Selecione a Barra para calcular a rota:
                </span>

                <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] shadow-inner">
                  <button
                    onClick={() => {
                      setActiveRoute('areia_branca');
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([-4.87, -37.08], 11);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      activeRoute === 'areia_branca'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barra Areia Branca (7.8 NM)
                  </button>
                  <button
                    onClick={() => {
                      setActiveRoute('macau');
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([-4.95, -36.85], 10);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      activeRoute === 'macau'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barra Macau (28.5 NM)
                  </button>
                </div>
              </div>

              {/* Destination indicator on the Right */}
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-cyan-300">
                <span className="text-slate-400">Destino:</span>
                <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  TSI - INTERSAL
                </span>
              </div>
            </div>

            {/* Interactive Controls & Navigation Metrics */}
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              {/* Speed Slider in Nautical Miles / Hour (Knots) + Live Wind Context */}
              <div className="sm:col-span-7 bg-slate-900/80 p-2 sm:p-2.5 rounded-lg border border-slate-800">
                {/* Wind At The Moment (Knots) & Heading Bar */}
                <div className="mb-2 p-1.5 sm:p-2 bg-slate-950/90 rounded-md border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-200">
                      Vento no momento:
                    </span>
                    {weatherLoading ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Carregando...
                      </span>
                    ) : weather ? (
                      <span className="font-mono text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                        <span className={weather.windSpeedKnots >= 30 ? 'text-red-400 font-bold bg-red-950/60 px-1 rounded border border-red-800' : 'text-cyan-300'}>
                          {weather.windSpeedKnots} knots
                        </span>
                        <span className="text-slate-400 font-normal">({weather.windSpeedKmH} km/h)</span>
                        <span className="text-emerald-400 font-semibold uppercase ml-0.5">{weather.windDirectionLabel}</span>
                        {weather.windGustKnots > 0 && (
                          <span className={`text-[10px] font-normal ${weather.windGustKnots >= 30 ? 'text-red-400 font-bold bg-red-950/60 px-1 py-0.5 rounded border border-red-800/80 animate-pulse' : 'text-amber-300'}`}>
                            • Rajada {weather.windGustKnots} kn
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        12.5 knots ENE (Médio Alísios)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    Velocidade da rota em Milhas Náuticas/hora:
                  </span>
                  <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80 text-[11px]">
                    {speedKnots.toFixed(1)} NM/h
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">2.0 NM/h</span>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    step="0.5"
                    value={speedKnots}
                    onChange={(e) => setSpeedKnots(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[10px] font-mono text-slate-400">18.0 NM/h</span>
                </div>

                {/* Quick Speed Presets in Nautical Miles / Knots */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[9.5px] text-slate-400">Padrão:</span>
                  {[
                    { label: '5.0 NM/h (Comboio/Balsa)', val: 5.0 },
                    { label: '7.5 NM/h (Rebocador)', val: 7.5 },
                    { label: '10.0 NM/h (Praticagem)', val: 10.0 },
                    { label: '12.0 NM/h (Lancha)', val: 12.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSpeedKnots(preset.val)}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono transition border ${
                        speedKnots === preset.val
                          ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.val} NM/h
                    </button>
                  ))}
                </div>
              </div>

              {/* Departure Time Input & ETA Output */}
              <div className="sm:col-span-5 grid grid-cols-2 sm:grid-cols-1 gap-1.5">
                {/* Departure Time */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> Saída da Barra
                  </span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => {
                        const now = new Date();
                        setDepartureTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                      }}
                      title="Definir hora atual"
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Horário local (BRT)</span>
                </div>

                {/* Calculated Time & ETA */}
                <div className="bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/40">
                  <span className="text-[9.5px] uppercase font-bold text-cyan-300 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-cyan-400" /> Chegada no TSI (ETA)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-black text-cyan-200 font-mono">
                      {etaString}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300/80">
                      (+{hours > 0 ? `${hours}h ` : ''}{minutes}m)
                    </span>
                  </div>
                  <span className="text-[9px] text-cyan-400/70 font-mono mt-0.5 block truncate">
                    Distância: {routeDistanceNM} NM ({ (routeDistanceNM * 1.852).toFixed(1) } km)
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Map Canvas */}
      <div className="relative w-full h-[calc(100vh-250px)] min-h-[460px] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Depth Overlay Card in Top-Left (Compact & Sleek) */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-slate-950/90 border border-slate-700/80 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl shadow-xl backdrop-blur text-xs font-mono text-slate-200 pointer-events-auto">
          <span className="text-[9px] uppercase text-cyan-400 font-bold block leading-tight">
            {isRealGps ? 'Localização Real' : 'Posição no Mapa'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base sm:text-lg font-black text-white leading-none">
              {(userLocation.estimatedBaseZHDepth + tideState.currentHeight).toFixed(2)} m
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">lâmina total</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-mono leading-tight">
            {userLocation.dmsLat} {userLocation.dmsLng}
          </div>
        </div>

        {/* Floating Layer Controls in Top-Right */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center p-0.5 bg-slate-950/90 backdrop-blur rounded-lg border border-slate-700/80 text-[11px] shadow-lg">
          <button
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              mapType === 'satellite' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satélite
          </button>
          <button
            onClick={() => setMapType('nautical')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              mapType === 'nautical' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Carta Náutica
          </button>
        </div>

        {/* Quick Port Focus Buttons in Bottom-Left */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 flex gap-1.5 flex-wrap">
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([-4.95, -36.90], 10);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold shadow-lg backdrop-blur transition border bg-slate-900/90 text-cyan-300 border-cyan-500/50 hover:bg-slate-800"
            title="Visão ampla pegando Barra de Areia Branca, TERMISA e Macau"
          >
            Visão Geral (RN)
          </button>
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
            Focar TSI
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
    </div>
  );
};
