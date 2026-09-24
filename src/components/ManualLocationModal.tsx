import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  Crosshair,
  Check,
  X,
  Anchor,
  Search,
  Sparkles,
  AlertCircle,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { CustomUserLocation } from '../types/maritime';
import {
  REGIONAL_POINTS_OF_INTEREST,
  decimalToDMS,
  parseDMSToDecimal,
  calculateDistanceNM,
} from '../data/vesselTrafficData';

interface ManualLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: CustomUserLocation;
  onUpdateLocation: (newLocation: CustomUserLocation) => void;
  onEnableMapClickMode?: () => void;
}

export const ManualLocationModal: React.FC<ManualLocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onUpdateLocation,
  onEnableMapClickMode,
}) => {
  const [inputMode, setInputMode] = useState<'dms' | 'decimal'>('dms');

  // DMS inputs
  const [latDeg, setLatDeg] = useState<string>('4');
  const [latMin, setLatMin] = useState<string>('49');
  const [latSec, setLatSec] = useState<string>('06.3');
  const [latDir, setLatDir] = useState<'S' | 'N'>('S');

  const [lngDeg, setLngDeg] = useState<string>('37');
  const [lngMin, setLngMin] = useState<string>('02');
  const [lngSec, setLngSec] = useState<string>('39.8');
  const [lngDir, setLngDir] = useState<'W' | 'E'>('W');

  // Decimal inputs
  const [decLat, setDecLat] = useState<string>(currentLocation.lat.toFixed(6));
  const [decLng, setDecLng] = useState<string>(currentLocation.lng.toFixed(6));

  const [customName, setCustomName] = useState<string>(currentLocation.name);
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // populate from currentLocation
      setDecLat(currentLocation.lat.toFixed(6));
      setDecLng(currentLocation.lng.toFixed(6));
      setCustomName(currentLocation.name);

      const latAbs = Math.abs(currentLocation.lat);
      const lDeg = Math.floor(latAbs);
      const lMinFull = (latAbs - lDeg) * 60;
      const lMin = Math.floor(lMinFull);
      const lSec = ((lMinFull - lMin) * 60).toFixed(1);

      setLatDeg(String(lDeg));
      setLatMin(String(lMin));
      setLatSec(lSec);
      setLatDir(currentLocation.lat >= 0 ? 'N' : 'S');

      const lngAbs = Math.abs(currentLocation.lng);
      const gDeg = Math.floor(lngAbs);
      const gMinFull = (lngAbs - gDeg) * 60;
      const gMin = Math.floor(gMinFull);
      const gSec = ((gMinFull - gMin) * 60).toFixed(1);

      setLngDeg(String(gDeg));
      setLngMin(String(gMin));
      setLngSec(gSec);
      setLngDir(currentLocation.lng >= 0 ? 'E' : 'W');
      setGpsError(null);
    }
  }, [isOpen, currentLocation]);

  if (!isOpen) return null;

  const handleApplyDMS = () => {
    const dLat = parseFloat(latDeg) || 0;
    const mLat = parseFloat(latMin) || 0;
    const sLat = parseFloat(latSec) || 0;
    let finalLat = dLat + mLat / 60 + sLat / 3600;
    if (latDir === 'S') finalLat = -finalLat;

    const dLng = parseFloat(lngDeg) || 0;
    const mLng = parseFloat(lngMin) || 0;
    const sLng = parseFloat(lngSec) || 0;
    let finalLng = dLng + mLng / 60 + sLng / 3600;
    if (lngDir === 'W') finalLng = -finalLng;

    const dmsLat = `${latDeg}°${String(latMin).padStart(2, '0')}'${String(latSec).padStart(4, '0')}"${latDir}`;
    const dmsLng = `${lngDeg}°${String(lngMin).padStart(2, '0')}'${String(lngSec).padStart(4, '0')}"${lngDir}`;

    onUpdateLocation({
      lat: Number(finalLat.toFixed(6)),
      lng: Number(finalLng.toFixed(6)),
      name: customName || `Posição Manual (${dmsLat})`,
      dmsLat,
      dmsLng,
      isManual: true,
      estimatedBaseZHDepth: 4.5,
    });
    onClose();
  };

  const handleApplyDecimal = () => {
    const lat = parseFloat(decLat);
    const lng = parseFloat(decLng);

    if (isNaN(lat) || isNaN(lng)) {
      setGpsError('Coordenadas decimais inválidas.');
      return;
    }

    const dmsLat = decimalToDMS(lat, true);
    const dmsLng = decimalToDMS(lng, false);

    onUpdateLocation({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      name: customName || `Posição Manual (${dmsLat})`,
      dmsLat,
      dmsLng,
      isManual: true,
      estimatedBaseZHDepth: 4.5,
    });
    onClose();
  };

  const handleSelectPreset = (preset: typeof REGIONAL_POINTS_OF_INTEREST[0]) => {
    onUpdateLocation({
      lat: preset.lat,
      lng: preset.lng,
      name: preset.name,
      dmsLat: preset.dmsLat,
      dmsLng: preset.dmsLng,
      isManual: true,
      estimatedBaseZHDepth: preset.estimatedBaseZHDepth,
    });
    onClose();
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada pelo navegador.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dmsLat = decimalToDMS(lat, true);
        const dmsLng = decimalToDMS(lng, false);

        onUpdateLocation({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          name: 'GPS Atual do Dispositivo (Bordo)',
          dmsLat,
          dmsLng,
          isManual: true,
          estimatedBaseZHDepth: 4.0,
        });
        setIsLocatingGPS(false);
        onClose();
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsError('Não foi possível obter GPS (permissão recusada ou fora de alcance).');
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Definir Posição Geográfica Manual
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Insira coordenadas náuticas (DMS / Decimal), use GPS ou selecione pontos regionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* GPS Button */}
            <button
              onClick={handleGetGPS}
              disabled={isLocatingGPS}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Navigation className={`w-4 h-4 ${isLocatingGPS ? 'animate-spin' : ''}`} />
              {isLocatingGPS ? 'Obtendo GPS...' : 'Usar GPS Real do Dispositivo (Bordo)'}
            </button>

            {/* Click on Map Mode */}
            {onEnableMapClickMode && (
              <button
                onClick={() => {
                  onEnableMapClickMode();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                Marcar Clicando na Carta Náutica
              </button>
            )}
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Coordinate Format Tabs */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                <Compass className="w-4 h-4 text-cyan-400" />
                Entrada Manual de Coordenadas
              </span>
              <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setInputMode('dms')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    inputMode === 'dms' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Graus/Min/Seg (DMS)
                </button>
                <button
                  onClick={() => setInputMode('decimal')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    inputMode === 'decimal' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Decimal (Lat/Lng)
                </button>
              </div>
            </div>

            {/* Custom Location Label Name */}
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">
                Identificação do Ponto / Embarcação (Opcional):
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Minha Posição no Canal / Balsa Salineira 2"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* DMS Form Inputs */}
            {inputMode === 'dms' ? (
              <div className="space-y-3 pt-1">
                {/* Latitude DMS */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-300 block mb-1.5 font-mono">
                    Latitude (Ex: 4°49'20.5"S)
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Graus (°)</span>
                      <input
                        type="number"
                        value={latDeg}
                        onChange={(e) => setLatDeg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Minutos (')</span>
                      <input
                        type="number"
                        value={latMin}
                        onChange={(e) => setLatMin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Segundos (")</span>
                      <input
                        type="number"
                        step="0.1"
                        value={latSec}
                        onChange={(e) => setLatSec(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hemisfério</span>
                      <select
                        value={latDir}
                        onChange={(e) => setLatDir(e.target.value as 'S' | 'N')}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
                      >
                        <option value="S">S (Sul)</option>
                        <option value="N">N (Norte)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Longitude DMS */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-300 block mb-1.5 font-mono">
                    Longitude (Ex: 37°02'37.7"W)
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Graus (°)</span>
                      <input
                        type="number"
                        value={lngDeg}
                        onChange={(e) => setLngDeg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Minutos (')</span>
                      <input
                        type="number"
                        value={lngMin}
                        onChange={(e) => setLngMin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Segundos (")</span>
                      <input
                        type="number"
                        step="0.1"
                        value={lngSec}
                        onChange={(e) => setLngSec(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hemisfério</span>
                      <select
                        value={lngDir}
                        onChange={(e) => setLngDir(e.target.value as 'W' | 'E')}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
                      >
                        <option value="W">W (Oeste)</option>
                        <option value="E">E (Leste)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleApplyDMS}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/30 transition"
                >
                  <Check className="w-4 h-4" />
                  Aplicar Coordenadas DMS
                </button>
              </div>
            ) : (
              /* Decimal Coordinates */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Latitude Decimal</label>
                    <input
                      type="text"
                      value={decLat}
                      onChange={(e) => setDecLat(e.target.value)}
                      placeholder="-4.82236"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Longitude Decimal</label>
                    <input
                      type="text"
                      value={decLng}
                      onChange={(e) => setDecLng(e.target.value)}
                      placeholder="-37.04381"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyDecimal}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/30 transition"
                >
                  <Check className="w-4 h-4" />
                  Aplicar Coordenadas Decimais
                </button>
              </div>
            )}
          </div>

          {/* Regional Quick Presets List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Anchor className="w-4 h-4 text-cyan-400" />
              Pontos Notáveis Regionais (1-Clique para Selecionar)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REGIONAL_POINTS_OF_INTEREST.map((preset) => {
                const isCurrent =
                  Math.abs(preset.lat - currentLocation.lat) < 0.001 &&
                  Math.abs(preset.lng - currentLocation.lng) < 0.001;

                const distNM = calculateDistanceNM(
                  currentLocation.lat,
                  currentLocation.lng,
                  preset.lat,
                  preset.lng
                );

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-950'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block">{preset.name}</span>
                        <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
                          {preset.dmsLat} {preset.dmsLng}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {preset.category}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-1.5">
                      <span>Prof. ZH: ~{preset.estimatedBaseZHDepth}m</span>
                      <span>{distNM > 0 ? `${distNM} NM de distância` : 'Posição Atual'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Sistema Geodésico: WGS84 / Carta DHN 703</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
