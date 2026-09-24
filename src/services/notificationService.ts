// Web Notifications & Push Service for Intersal Port System
// Manages browser notifications for Next High Tide (Preamar) and Hourly Updates

import { PortConfig } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';

export interface NotificationPreferences {
  enabled: boolean;
  hourlyUpdates: boolean; // De hora em hora
  highTidePreAlert: boolean; // 30 min antes do preamar
  highTideOnPeak: boolean; // No momento exato do preamar
  sound: boolean;
}

const STORAGE_KEY = 'intersal_notification_prefs_v1';
const LAST_HOURLY_NOTIF_KEY = 'intersal_last_hourly_notif_hour';
const LAST_HIGH_TIDE_NOTIF_KEY = 'intersal_last_high_tide_event';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  hourlyUpdates: true,
  highTidePreAlert: true,
  highTideOnPeak: true,
  sound: true,
};

export function getSavedNotificationPreferences(): NotificationPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

// Play maritime notification sound
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // audio context might be blocked if no user interaction yet
  }
}

export function sendBrowserNotification(title: string, options: NotificationOptions, playSound = true) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notifOptions: NotificationOptions = {
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: options.tag || 'intersal-maritime',
      ...options,
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, notifOptions);
      }).catch(() => {
        new Notification(title, notifOptions);
      });
    } else {
      new Notification(title, notifOptions);
    }

    if (playSound) {
      playNotificationSound();
    }
  } catch {
    // notification error fallback
  }
}

// Check and trigger scheduled notifications (Hourly and Next Preamar)
export function processMaritimeNotifications(
  currentTime: Date,
  port: PortConfig,
  tideState: CurrentTideState,
  prefs: NotificationPreferences
) {
  if (!prefs.enabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const currentHour = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDate()}-${currentTime.getHours()}`;
  const nowMs = currentTime.getTime();

  // 1. Hourly Updates (Dispara no início de cada hora)
  if (prefs.hourlyUpdates) {
    const lastHourly = localStorage.getItem(LAST_HOURLY_NOTIF_KEY);
    // Dispara se ainda não enviou nesta hora e estiver nos primeiros 5 minutos
    if (lastHourly !== currentHour && currentTime.getMinutes() <= 5) {
      localStorage.setItem(LAST_HOURLY_NOTIF_KEY, currentHour);
      const formattedTime = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const trendText = tideState.trend === 'ENCHENDO' ? '📈 Enchendo' : tideState.trend === 'VAZANDO' ? '📉 Vazando' : '⏸️ Estofo';

      sendBrowserNotification(
        `⚓ Status da Maré - ${formattedTime} (${port.name})`,
        {
          body: `Altura Atual: ${tideState.currentHeight.toFixed(2)}m • ${trendText}\nPróximo Preamar: ${tideState.nextHighEvent.timeStr} (${tideState.nextHighEvent.height.toFixed(2)}m)`,
          tag: `hourly-status-${currentHour}`,
        },
        prefs.sound
      );
    }
  }

  // 2. Next High Tide (Preamar) Notifications
  const nextHigh = tideState.nextHighEvent;
  if (nextHigh) {
    const timeUntilHighMs = nextHigh.timestamp - nowMs;
    const minutesUntilHigh = Math.round(timeUntilHighMs / (60 * 1000));
    const eventId = `${port.id}-${nextHigh.timestamp}`;

    // A. Pre-alert: 30 minutos antes do Preamar
    if (prefs.highTidePreAlert && minutesUntilHigh >= 25 && minutesUntilHigh <= 35) {
      const preAlertKey = `pre_${eventId}`;
      const lastPre = localStorage.getItem(LAST_HIGH_TIDE_NOTIF_KEY);
      if (lastPre !== preAlertKey) {
        localStorage.setItem(LAST_HIGH_TIDE_NOTIF_KEY, preAlertKey);
        sendBrowserNotification(
          `🌊 Preamar em ~30 min (${port.name})`,
          {
            body: `Pico às ${nextHigh.timeStr} com altura prevista de ${nextHigh.height.toFixed(2)}m (${tideState.coefficientType}).\nJanela ideal de manobra se aproximando.`,
            tag: `preamar-alert-${eventId}`,
          },
          prefs.sound
        );
      }
    }

    // B. On Peak: 0 a 5 minutos do Preamar
    if (prefs.highTideOnPeak && minutesUntilHigh >= -2 && minutesUntilHigh <= 4) {
      const peakAlertKey = `peak_${eventId}`;
      const lastPeak = localStorage.getItem(LAST_HIGH_TIDE_NOTIF_KEY);
      if (lastPeak !== peakAlertKey) {
        localStorage.setItem(LAST_HIGH_TIDE_NOTIF_KEY, peakAlertKey);
        sendBrowserNotification(
          `🌊 Preamar Atingido (${port.name})`,
          {
            body: `Maré alta máxima às ${nextHigh.timeStr}: ${nextHigh.height.toFixed(2)} metros (${tideState.coefficientType}).`,
            tag: `preamar-peak-${eventId}`,
          },
          prefs.sound
        );
      }
    }
  }
}
