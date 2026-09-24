import React from 'react';
import { X, Bell, ShieldAlert, Wind, Waves, Volume2, VolumeX, Check } from 'lucide-react';
import { AlertThresholds } from '../types/maritime';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: AlertThresholds;
  onSaveThresholds: (thresholds: AlertThresholds) => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds,
}) => {
  const [local, setLocal] = React.useState<AlertThresholds>(thresholds);

  React.useEffect(() => {
    setLocal(thresholds);
  }, [thresholds]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveThresholds(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurar Alertas Visuais da Barra</h3>
              <p className="text-xs text-slate-400 font-mono">Limiares de segurança para travessia e marés</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* 1. Low Tide Threshold */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-400" />
                Alerta de Maré Baixa Crítica (m)
              </label>
              <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                {local.minTideHeight.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.05"
              value={local.minTideHeight}
              onChange={(e) => setLocal({ ...local, minTideHeight: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Dispara alerta visual quando a altura da maré for inferior a este valor.
            </span>
          </div>

          {/* 2. Minimum FAQ (Under Keel Clearance) */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Folga de Quilha Mínima (FAQ em metros)
              </label>
              <span className="font-mono font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded">
                {local.minUnderKeelClearance.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.05"
              value={local.minUnderKeelClearance}
              onChange={(e) => setLocal({ ...local, minUnderKeelClearance: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Limiar para mudar o status da barra de 'Livre' para 'Atenção / Restrita'.
            </span>
          </div>

          {/* 3. Wind Speed Limit */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-cyan-400" />
                Limite de Vento para Travessia (nós)
              </label>
              <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                {local.maxWindKnots} nós
              </span>
            </div>
            <input
              type="range"
              min="14"
              max="35"
              step="1"
              value={local.maxWindKnots}
              onChange={(e) => setLocal({ ...local, maxWindKnots: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Alerta de ventos fortes de través ou contra-maré na embocadura.
            </span>
          </div>

          {/* 4. Wave swell limit */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-400" />
                Limite de Ondulação na Arrebentação (m)
              </label>
              <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
                {local.maxWaveHeightMeters.toFixed(1)} m
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={local.maxWaveHeightMeters}
              onChange={(e) => setLocal({ ...local, maxWaveHeightMeters: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* 5. Sound toggle & auto-refresh */}
          <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              {local.soundAlertEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="font-semibold text-slate-200">Alertas Sonoros de Mudança de Status</span>
            </div>
            <input
              type="checkbox"
              checked={local.soundAlertEnabled}
              onChange={(e) => setLocal({ ...local, soundAlertEnabled: e.target.checked })}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition"
          >
            <Check className="w-4 h-4" />
            Salvar Limiares
          </button>
        </div>
      </div>
    </div>
  );
};
