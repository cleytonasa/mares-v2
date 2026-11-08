import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface OnlineOperator {
  id: string;
  name: string;
  role: string;
  channel: string;
  isListening: boolean;
  isTalking: boolean;
  lastSeen: number;
}

export interface LiveVoiceTransmission {
  id: string;
  senderName: string;
  senderRole: string;
  channel: string;
  audioBase64: string;
  durationSec: number;
  timestamp: string;
  createdAtNum: number;
  senderSessionId: string;
}

export interface ChannelActivityLog {
  id: string;
  text: string;
  time: string;
  type: 'voice' | 'join' | 'system';
}

// Session Id for this client tab
export function getOrCreateSessionId(): string {
  let s = sessionStorage.getItem('maritime_ptt_session_id');
  if (!s) {
    s = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('maritime_ptt_session_id', s);
  }
  return s;
}

// Session-based Operator Identity (automatically logged out when site is closed)
export function getSessionOperator(): { name: string; role: string; isLoggedIn: boolean } {
  const loggedIn = sessionStorage.getItem('maritime_session_logged_in') === 'true';
  const name = sessionStorage.getItem('maritime_session_operator_name') || '';
  const role = sessionStorage.getItem('maritime_session_operator_role') || 'Comando TSI Intersal';
  return { name, role, isLoggedIn: loggedIn && Boolean(name.trim()) };
}

export function setSessionOperator(name: string, role: string) {
  sessionStorage.setItem('maritime_session_logged_in', 'true');
  sessionStorage.setItem('maritime_session_operator_name', name.trim());
  sessionStorage.setItem('maritime_session_operator_role', role);
}

export function clearSessionOperator() {
  sessionStorage.removeItem('maritime_session_logged_in');
  sessionStorage.removeItem('maritime_session_operator_name');
  sessionStorage.removeItem('maritime_session_operator_role');
}

// Native Web Audio chime effects (Walkie-Talkie / Zello roger beep)
export function playChime(type: 'start' | 'end' | 'incoming') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'start') {
      // Dual beep (start speaking)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'end') {
      // Roger end chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(520, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'incoming') {
      // Alert when incoming transmission starts
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.setValueAtTime(1080, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.24);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked before first user gesture
  }
}

// Purge all legacy stored audios from Firestore so nothing is saved
export async function purgeAllStoredAudios(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'maritime_radio_dispatches'));
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref).catch(() => {}));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Purging old radio audios error:', err);
  }
}

// Broadcast live voice to all connected users, and automatically delete it afterwards
export async function broadcastLiveVoice(
  audioBlob: Blob,
  params: {
    senderName: string;
    senderRole: string;
    channel: string;
    durationSec: number;
    sessionId: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result as string;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const createdAtNum = Date.now();

        // Add ephemeral live dispatch
        const docRef = await addDoc(collection(db, 'maritime_radio_dispatches'), {
          senderName: params.senderName,
          senderRole: params.senderRole,
          channel: params.channel,
          audioBase64: base64Audio,
          durationSec: params.durationSec || 2,
          timestamp: timeStr,
          createdAt: serverTimestamp(),
          createdAtNum,
          senderSessionId: params.sessionId,
        });

        // Automatically delete the audio document after 12 seconds so nothing is permanently stored!
        setTimeout(() => {
          deleteDoc(docRef).catch(() => {});
        }, 12000);

        resolve();
      } catch (err) {
        console.error('Error broadcasting live voice:', err);
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
  });
}
