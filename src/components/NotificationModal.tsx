import React, { useState } from 'react';
import { Bell, BellRing, BellOff, Clock, Waves, Volume2, VolumeX, Check, Sparkles, X, ShieldCheck } from 'lucide-react';
import {
  NotificationPreferences,
  requestNotificationPermission,
  getNotificationPermission,
  sendBrowserNotification,
  playNotificationSound,
} from '../services/notificationService';
import { PortConfig } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSavePreferences: (prefs: NotificationPreferences) => void;
  port: PortConfig;
  tideState: CurrentTideState;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  port,
  tideState,
}) => {
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>(preferences);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(getNotificationPermission());
  const [testSent, setTestSent] = useState<boolean>(false);

  React.useEffect(() => {
    setLocalPrefs(preferences);
    setPermissionState(getNotificationPermission());
  }, [preferences, isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionState(getNotificationPermission());
    if (granted) {
      setLocalPrefs((prev) => ({ ...prev, enabled: true }));
    }
  };

  const handleToggleMaster = async () => {
    if (!localPrefs.enabled) {
      if (permissionState !== 'granted') {
        const granted = await requestNotificationPermission();
        setPermissionState(getNotificationPermission());
        if (granted) {
          setLocalPrefs((prev) => ({ ...prev, enabled: true }));
        }
      } else {
        setLocalPrefs((prev) => ({ ...prev, enabled: true }));
      }
    } else {
      setLocalPrefs((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleSendTestNotification = () => {
    if (permissionState !== 'granted') {
      handleRequestPermission();
      return;
    }

    sendBrowserNotification(
      `🌊 Teste de Alerta: Preamar (${port.name})`,
      {
        body: `Próximo Preamar às ${tideState.nextHighEvent.timeStr} (${tideState.nextHighEvent.height.toFixed(2)}m).\nNotificações ativas no Chrome/Android!`,
      },
      localPrefs.sound
    );

    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSave = () => {
    onSavePreferences(localPrefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notificações no Chrome & Android</h3>
              <p className="text-xs text-slate-400">Avisos de Preamar (Maré Alta) e hora em hora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Permission Card */}
          {permissionState !== 'granted' && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Permissão de Notificação do Navegador
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-900/60 text-[10px] text-amber-200 font-mono">
                  {permissionState === 'denied' ? 'Bloqueado' : 'Pendente'}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Para receber os alertas no Chrome ou na barra de status do seu celular Android, autorize o envio de notificações.
              </p>
              <button
                onClick={handleRequestPermission}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition text-xs shadow"
              >
                Permitir Notificações no Dispositivo
              </button>
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${localPrefs.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {localPrefs.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Ativar Alertas de Notificação</h4>
                <p className="text-[11px] text-slate-400">Receba no celular ou computador com o app aberto ou em segundo plano</p>
              </div>
            </div>
            <button
              onClick={handleToggleMaster}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                localPrefs.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Options Group */}
          <div className={`space-y-3 transition-opacity ${localPrefs.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* 1. Next Preamar Pre-Alert (30 min before) */}
            <div className="flex items-start justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5 pr-2">
                <Waves className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-200 text-xs">Aviso de Próximo Preamar (30 min antes)</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Notifica antecedendo o pico da maré alta com a altura máxima e tipo ({tideState.coefficientType}).
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.highTidePreAlert}
                onChange={(e) => setLocalPrefs({ ...localPrefs, highTidePreAlert: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 mt-1"
              />
            </div>

            {/* 2. Next Preamar on Peak */}
            <div className="flex items-start justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5 pr-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-200 text-xs">Preamar Atingido (No Momento do Pico)</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Avisa quando a maré atinge seu nível máximo (estofo de preamar).
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.highTideOnPeak}
                onChange={(e) => setLocalPrefs({ ...localPrefs, highTideOnPeak: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 mt-1"
              />
            </div>

            {/* 3. Hourly Tide Updates */}
            <div className="flex items-start justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5 pr-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-200 text-xs">Atualização de Hora em Hora</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Resumo horário com altura da água em tempo real e tendência (enchendo/vazando).
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.hourlyUpdates}
                onChange={(e) => setLocalPrefs({ ...localPrefs, hourlyUpdates: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 mt-1"
              />
            </div>

            {/* 4. Notification Sound */}
            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                {localPrefs.sound ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <h5 className="font-bold text-slate-200 text-xs">Sinal Sonoro Marítimo</h5>
                  <p className="text-[10px] text-slate-400">Tocar sinal sonoro ao disparar a notificação</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playNotificationSound()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded border border-slate-700 transition"
                >
                  Ouvir
                </button>
                <input
                  type="checkbox"
                  checked={localPrefs.sound}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, sound: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Test Notification Button */}
          <div className="pt-1">
            <button
              onClick={handleSendTestNotification}
              className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 font-semibold transition flex items-center justify-center gap-2 shadow-sm text-xs"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>{testSent ? '✓ Notificação de Teste Enviada!' : 'Testar Notificação Agora'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <span className="text-[10px] text-slate-500 font-mono">
            {port.name} • DHN 2026
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition"
            >
              <Check className="w-4 h-4" />
              Salvar Preferências
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
