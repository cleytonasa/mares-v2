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
import { translations, Language } from '../utils/i18n';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSavePreferences: (prefs: NotificationPreferences) => void;
  port: PortConfig;
  tideState: CurrentTideState;
  language?: Language;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  port,
  tideState,
  language = 'pt',
}) => {
  const t = translations[language];
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>(preferences);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(getNotificationPermission());
  const [testSent, setTestSent] = useState<boolean>(false);

  React.useEffect(() => {
    setLocalPrefs(preferences);
    setPermissionState(getNotificationPermission());
  }, [preferences, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePreferences(localPrefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl relative text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            {t.notificationSettings}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span>{language === 'en' ? 'Enable Notifications' : 'Ativar Notificações'}</span>
            <input
              type="checkbox"
              checked={localPrefs.enabled}
              onChange={(e) => setLocalPrefs({ ...localPrefs, enabled: e.target.checked })}
              className="w-4 h-4 text-cyan-600 bg-slate-950 border-slate-700 rounded focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
