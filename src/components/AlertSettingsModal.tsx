import React from 'react';
import { X, Bell, ShieldAlert, Wind, Waves, Volume2, VolumeX, Check } from 'lucide-react';
import { AlertThresholds } from '../types/maritime';
import { translations, Language } from '../utils/i18n';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: AlertThresholds;
  onSaveThresholds: (thresholds: AlertThresholds) => void;
  language?: Language;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds,
  language = 'pt',
}) => {
  const t = translations[language];
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
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.alertThresholds}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">{language === 'en' ? 'Max Wind Limit (Knots)' : 'Limite Máximo de Vento (Nós)'}</label>
            <input
              type="number"
              value={local.maxWindKnots}
              onChange={(e) => setLocal({ ...local, maxWindKnots: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-slate-950 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300">
            {t.cancel}
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-semibold text-white shadow">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};
