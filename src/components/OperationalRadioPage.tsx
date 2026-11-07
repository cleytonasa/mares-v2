import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Radio,
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Users,
  Anchor,
  RadioTower,
  Ship,
  Compass,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  Headphones,
  Wifi,
  WifiOff,
  UserCheck,
  Shield,
  HelpCircle,
  Activity,
  Sparkles,
} from 'lucide-react';
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OnlineOperator {
  id: string;
  name: string;
  role: string;
  isListening: boolean;
  isTalking: boolean;
  lastSeen: number;
}

interface AudioTransmission {
  id: string;
  senderName: string;
  senderRole: string;
  audioBase64: string;
  durationSec: number;
  timestamp: string;
  createdAtNum: number;
}

const CHANNELS = [
  { id: 'canal-operacional', name: 'Canal Operações TSI (Geral)', color: 'text-cyan-400' },
  { id: 'canal-praticagem', name: 'Canal Praticagem & Manobras', color: 'text-amber-400' },
  { id: 'canal-rebocadores', name: 'Canal Rebocadores & Barcaças', color: 'text-emerald-400' },
];

const ROLES = [
  { id: 'Praticagem Areia Branca', label: 'Praticagem Areia Branca', icon: Anchor, color: 'text-amber-400' },
  { id: 'Comando TSI Intersal', label: 'Comando TSI - INTERSAL', icon: RadioTower, color: 'text-cyan-400' },
  { id: 'Rebocador Salineiro', label: 'Rebocador Salineiro', icon: Ship, color: 'text-emerald-400' },
  { id: 'Operação TPI Salineiro', label: 'Operação TPI Salineiro', icon: Compass, color: 'text-sky-400' },
  { id: 'Operador Marítimo', label: 'Operador Marítimo / Central', icon: Radio, color: 'text-indigo-400' },
];

export const OperationalRadioPage: React.FC = () => {
  // Operator Identity
  const [operatorName, setOperatorName] = useState<string>(() => {
    return localStorage.getItem('maritime_ptt_name') || `Operador ${Math.floor(100 + Math.random() * 900)}`;
  });
  const [operatorRole, setOperatorRole] = useState<string>(() => {
    return localStorage.getItem('maritime_ptt_role') || 'Comando TSI Intersal';
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Active Channel & Escuta Mode (Zello-like Listening)
  const [activeChannel, setActiveChannel] = useState<string>('canal-operacional');
  const [isListeningMode, setIsListeningMode] = useState<boolean>(true); // Mode Escuta Ativa
  const [incomingVoiceActive, setIncomingVoiceActive] = useState<boolean>(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<{ name: string; role: string } | null>(null);

  // Real-time Presence
  const [onlineOperators, setOnlineOperators] = useState<OnlineOperator[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Audio Transmissions History
  const [transmissions, setTransmissions] = useState<AudioTransmission[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // PTT Voice Recording (Hold or Click to Speak)
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmittingSeconds, setTransmittingSeconds] = useState<number>(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pttTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedTimeRef = useRef<number>(Date.now());
  const initialLoadRef = useRef<boolean>(true);

  // Unique session ID for presence
  const [sessionId] = useState<string>(() => {
    let s = sessionStorage.getItem('maritime_ptt_session_id');
    if (!s) {
      s = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('maritime_ptt_session_id', s);
    }
    return s;
  });

  // Sound effects (Zello start / end chimes generated natively via Web Audio API)
  const playChime = useCallback((type: 'start' | 'end' | 'incoming') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'start') {
        // Dual beep (roger / start PTT)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'end') {
        // End chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(520, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'incoming') {
        // Subtle alert when someone starts speaking on the channel
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(1160, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.26);
      }
    } catch {
      // AudioContext blocked before first user gesture
    }
  }, []);

  // 1. PRESENCE HEARTBEAT (Online operators via Firestore)
  useEffect(() => {
    const operatorRef = doc(db, 'maritime_operators', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(
          operatorRef,
          {
            id: sessionId,
            name: operatorName,
            role: operatorRole,
            isListening: isListeningMode,
            isTalking: isTransmitting,
            channel: activeChannel,
            lastSeen: Date.now(),
          },
          { merge: true }
        );
        setIsConnected(true);
      } catch (err) {
        console.warn('Presence sync:', err);
        setIsConnected(false);
      }
    };

    updatePresence();
    const heartbeat = setInterval(updatePresence, 10000); // 10s heartbeat

    const handleUnload = () => {
      deleteDoc(operatorRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(operatorRef).catch(() => {});
    };
  }, [sessionId, operatorName, operatorRole, isListeningMode, isTransmitting, activeChannel]);

  // 2. LISTEN TO ONLINE OPERATORS
  useEffect(() => {
    const colRef = collection(db, 'maritime_operators');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const now = Date.now();
      const list: OnlineOperator[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const lastSeen = typeof data.lastSeen === 'number' ? data.lastSeen : now;
        // Consider online if seen within 30 seconds
        if (now - lastSeen < 32000) {
          list.push({
            id: d.id,
            name: data.name || 'Operador',
            role: data.role || 'Operador Marítimo',
            isListening: data.isListening !== false,
            isTalking: Boolean(data.isTalking),
            lastSeen,
          });
        }
      });
      setOnlineOperators(list);
    }, () => {
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. LISTEN TO REAL-TIME VOICE TRANSMISSIONS (ZELLO-STYLE ESCUTA AUTOMÁTICA)
  useEffect(() => {
    const q = query(
      collection(db, 'maritime_radio_dispatches'),
      orderBy('createdAtNum', 'desc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AudioTransmission[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          senderName: data.senderName || 'Operador',
          senderRole: data.senderRole || 'Operador',
          audioBase64: data.audioBase64,
          durationSec: data.durationSec || 2,
          timestamp: data.timestamp || 'Agora',
          createdAtNum: data.createdAtNum || 0,
        });
      });

      // Se for a primeira carga da página, apenas indexa o histórico
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        if (list.length > 0) {
          lastProcessedTimeRef.current = list[0].createdAtNum || Date.now();
        }
        setTransmissions(list);
        return;
      }

      // Se chegou uma nova transmissão
      if (list.length > 0) {
        const newest = list[0];
        const isNewTransmission = newest.createdAtNum > lastProcessedTimeRef.current;
        const isNotMine = newest.senderName !== operatorName;

        if (isNewTransmission) {
          lastProcessedTimeRef.current = newest.createdAtNum;

          // Se a ESCUTA ATIVA estiver ligada e não for áudio próprio, TOCA IMEDIATAMENTE!
          if (isListeningMode && isNotMine) {
            playIncomingLiveVoice(newest);
          }
        }
      }

      setTransmissions(list);
    });

    return () => unsubscribe();
  }, [isListeningMode, operatorName]);

  // Função para tocar voz ao vivo recebida de outro operador (Estilo Zello)
  const playIncomingLiveVoice = (trans: AudioTransmission) => {
    try {
      playChime('incoming');
      setIncomingVoiceActive(true);
      setCurrentSpeaker({ name: trans.senderName, role: trans.senderRole });

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(trans.audioBase64);
      audioPlayerRef.current = audio;
      setPlayingId(trans.id);

      audio.onended = () => {
        playChime('end');
        setIncomingVoiceActive(false);
        setCurrentSpeaker(null);
        setPlayingId(null);
      };

      audio.onerror = () => {
        setIncomingVoiceActive(false);
        setCurrentSpeaker(null);
        setPlayingId(null);
      };

      audio.play().catch(() => {
        setIncomingVoiceActive(false);
        setCurrentSpeaker(null);
        setPlayingId(null);
      });
    } catch (e) {
      console.warn('Playback error:', e);
      setIncomingVoiceActive(false);
      setCurrentSpeaker(null);
    }
  };

  // Tocador manual do histórico
  const togglePlayHistory = (item: AudioTransmission) => {
    if (playingId === item.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(item.audioBase64);
    audioPlayerRef.current = audio;
    setPlayingId(item.id);

    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
  };

  // 4. INICIAR TRANSMISSÃO PTT (Segurar ou Clicar para Falar)
  const startPTT = async () => {
    if (isTransmitting || isProcessingAudio) return;
    setMicError(null);

    // Stop any ongoing incoming playback to avoid audio feedback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingId(null);
      setIncomingVoiceActive(false);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Gravação de microfone não suportada pelo navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : undefined,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Se gravou mais de 0.5s, transmite imediatamente pelo canal da internet!
        if (audioBlob.size > 800) {
          await transmitVoiceOverInternet(audioBlob);
        } else {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start(150);
      setIsTransmitting(true);
      setTransmittingSeconds(0);
      playChime('start');

      pttTimerRef.current = setInterval(() => {
        setTransmittingSeconds((prev) => {
          if (prev >= 29) {
            // Limite de 30s por mensagem PTT
            stopPTT();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission check:', err);
      setIsTransmitting(false);
      setMicError(
        'Acesso ao microfone bloqueado no navegador. Clique no cadeado da barra de endereço para liberar o microfone ou use a "Transmissão Simulada de Teste" abaixo.'
      );
    }
  };

  // 5. SOLTAR BOTÃO / FINALIZAR TRANSMISSÃO
  const stopPTT = () => {
    if (!isTransmitting) return;

    if (pttTimerRef.current) {
      clearInterval(pttTimerRef.current);
      pttTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessingAudio(true);
      mediaRecorderRef.current.stop();
    }

    setIsTransmitting(false);
    playChime('end');
  };

  // 6. ENVIAR ÁUDIO EM TEMPO REAL VIA FIRESTORE (DISTRIBUIÇÃO INSTANTÂNEA)
  const transmitVoiceOverInternet = async (blob: Blob) => {
    setIsProcessingAudio(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        await addDoc(collection(db, 'maritime_radio_dispatches'), {
          senderName: operatorName,
          senderRole: operatorRole,
          channel: activeChannel,
          audioBase64: base64Audio,
          durationSec: transmittingSeconds || 2,
          timestamp: timeStr,
          createdAt: serverTimestamp(),
          createdAtNum: Date.now(),
        });

        setIsProcessingAudio(false);
      };
    } catch (err) {
      console.error('PTT voice dispatch error:', err);
      setIsProcessingAudio(false);
      alert('Erro ao enviar áudio pelo canal.');
    }
  };

  // Transmissão de Teste (Áudio Sintético caso o microfone esteja bloqueado pelo iframe)
  const sendSimulatedTestTransmission = async () => {
    setIsProcessingAudio(true);
    try {
      playChime('start');
      // Tone generator
      const sampleRate = 8000;
      const duration = 2.5;
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };

      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const freq = t < 0.3 ? 750 : t < 0.7 ? 1100 : t < 1.8 ? 950 : 600;
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.3;
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      await transmitVoiceOverInternet(blob);
    } catch {
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner: Status da Conexão PTT via Internet */}
      <div className="bg-slate-900/95 rounded-xl sm:rounded-2xl border border-slate-800 p-3.5 sm:p-5 shadow-xl text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center shrink-0 text-cyan-400 shadow-md">
            <Radio className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Canal de Voz Push-to-Talk (PTT)
              </h2>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" /> VIA INTERNET (ESTILO ZELLO)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Comunicação de voz em tempo real entre Praticagem, TSI Intersal, Rebocadores e Operações.
            </p>
          </div>
        </div>

        {/* Listening Mode Toggle (Escuta Ativa) */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setIsListeningMode(!isListeningMode)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition shadow-lg ${
              isListeningMode
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-950/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Quando ativada, a voz de qualquer outro operador online toca automaticamente"
          >
            <Headphones className={`w-4 h-4 ${isListeningMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isListeningMode ? 'Escuta Ativa: LIGADA' : 'Escuta: MUDO'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isListeningMode ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-500'
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
            {isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>
              <strong>{onlineOperators.length}</strong> online
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (PTT Push Button) + Right Presence & Transmissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Zello-like Central PTT Push Button (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl text-slate-100 flex flex-col items-center text-center">
            {/* Operator Identifier Header */}
            <div className="w-full pb-3 border-b border-slate-800 flex items-center justify-between text-xs mb-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-slate-400">Você:</span>
                {isEditingName ? (
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => {
                      setOperatorName(e.target.value);
                      localStorage.setItem('maritime_ptt_name', e.target.value);
                    }}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                    className="bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="font-bold text-white hover:text-cyan-300 underline underline-offset-2 truncate"
                    title="Clique para editar seu nome"
                  >
                    {operatorName}
                  </button>
                )}
              </div>

              <select
                value={operatorRole}
                onChange={(e) => {
                  setOperatorRole(e.target.value);
                  localStorage.setItem('maritime_ptt_role', e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 text-[11px] text-cyan-300 rounded px-2 py-1 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Incoming Voice Alert (When someone is speaking right now) */}
            {incomingVoiceActive && currentSpeaker && (
              <div className="w-full mb-4 p-3 bg-cyan-950/90 border border-cyan-400 rounded-xl text-cyan-200 animate-pulse flex items-center justify-between gap-2 shadow-lg shadow-cyan-950/60">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-cyan-300 animate-bounce" />
                  <div className="text-left">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                      NA ESCUTA AGORA (VOZ AO VIVO)
                    </span>
                    <span className="text-xs font-bold text-white">{currentSpeaker.name}</span>
                    <span className="text-[10px] text-slate-300 block font-mono">{currentSpeaker.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 pr-2">
                  <span className="w-1 h-4 bg-cyan-400 animate-bounce rounded-full" />
                  <span className="w-1 h-6 bg-cyan-300 animate-bounce delay-75 rounded-full" />
                  <span className="w-1 h-3 bg-cyan-400 animate-bounce delay-150 rounded-full" />
                </div>
              </div>
            )}

            {/* Channel Selector */}
            <div className="w-full mb-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block text-left mb-1">
                Canal Sintonizado:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between border ${
                      activeChannel === ch.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={ch.color}>{ch.name}</span>
                    {activeChannel === ch.id && (
                      <span className="text-[9.5px] font-mono text-cyan-300 bg-cyan-900/60 px-1.5 py-0.2 rounded">
                        CONECTADO
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Access Error Notice */}
            {micError && (
              <div className="w-full mb-4 p-3 bg-amber-950/70 border border-amber-500/60 rounded-xl text-amber-200 text-xs text-left">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-100">Permissão do Microfone</span>
                    <span className="text-[11px] leading-relaxed text-amber-200/90">{micError}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Central Big PTT Button (Estilo Zello: Segure ou Clique para Falar) */}
            <div className="my-3 flex flex-col items-center">
              <button
                onMouseDown={startPTT}
                onMouseUp={stopPTT}
                onTouchStart={startPTT}
                onTouchEnd={stopPTT}
                disabled={isProcessingAudio}
                className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all transform select-none shadow-2xl ${
                  isTransmitting
                    ? 'bg-gradient-to-b from-rose-600 to-red-700 text-white ring-8 ring-rose-500/50 scale-105 shadow-rose-900/60 animate-pulse'
                    : 'bg-gradient-to-b from-cyan-600 via-sky-600 to-slate-800 hover:from-cyan-500 hover:to-sky-500 text-white ring-4 ring-cyan-500/40 active:scale-95 shadow-cyan-950/80 cursor-pointer'
                }`}
                title="Pressione e segure para falar (ou toque para gravar)"
              >
                {/* Glow ring */}
                <div
                  className={`absolute inset-0 rounded-full border-2 ${
                    isTransmitting ? 'border-rose-300 animate-ping' : 'border-cyan-300/30'
                  }`}
                />

                <Mic className={`w-12 h-12 mb-1 ${isTransmitting ? 'text-white' : 'text-cyan-100'}`} />

                <span className="text-sm sm:text-base font-black tracking-wider uppercase">
                  {isTransmitting ? 'TRANSMITINDO' : 'FALAR (PTT)'}
                </span>

                <span className="text-[10px] font-mono opacity-80 mt-0.5">
                  {isTransmitting ? `00:${transmittingSeconds < 10 ? `0${transmittingSeconds}` : transmittingSeconds}s` : 'Segure para Falar'}
                </span>
              </button>

              <span className="text-[11px] text-slate-400 mt-3 font-medium">
                {isTransmitting ? (
                  <span className="text-rose-400 font-bold">Solte para enviar o áudio instantaneamente</span>
                ) : (
                  <span>Segure o botão ou clique para abrir o microfone</span>
                )}
              </span>

              {isProcessingAudio && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-cyan-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitindo áudio via internet...</span>
                </div>
              )}
            </div>

            {/* Test Simulation Button (Runs 100% fine even without mic permission) */}
            <div className="w-full pt-3 border-t border-slate-800 mt-2">
              <button
                onClick={sendSimulatedTestTransmission}
                disabled={isProcessingAudio || isTransmitting}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition"
                title="Gera um bipe operacional de teste e envia pelo canal para todos ouvirem"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Testar Transmissão no Canal (Bipe de Teste)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Online Operators (Escuta) & Live Audio Transmissions Log (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Online Operators on the Channel */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Operadores Conectados no Canal ({onlineOperators.length})
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Tempo Real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {onlineOperators.map((op) => {
                const isMe = op.id === sessionId;
                return (
                  <div
                    key={op.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                      isMe
                        ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-100'
                        : 'bg-slate-950/70 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 shadow-[0_0_6px_#34d399]" />
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {op.name} {isMe && <span className="text-cyan-400 text-[10px]">(Você)</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {op.role}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {op.isTalking ? (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                          FALANDO
                        </span>
                      ) : op.isListening ? (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                          ESCUTA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-slate-800 text-slate-400">
                          OCUPADO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {onlineOperators.length === 0 && (
                <div className="col-span-full py-4 text-center text-slate-500 text-xs">
                  Sintonizando canal via internet...
                </div>
              )}
            </div>
          </div>

          {/* Transmissions Audio Log (Histórico com Play e Download) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Histórico de Transmissões de Voz
              </h3>
              <span className="text-[10px] font-mono text-cyan-400/80">
                {isListeningMode ? 'Escuta Automática Ativa' : 'Toque manual'}
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {transmissions.map((t) => {
                const isPlaying = playingId === t.id;
                const isMine = t.senderName === operatorName;

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      isPlaying
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-950/60'
                        : isMine
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => togglePlayHistory(t)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition ${
                          isPlaying
                            ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-md'
                        }`}
                        title={isPlaying ? 'Pausar áudio' : 'Ouvir transmissão de voz'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">{t.senderName}</span>
                          {isMine && (
                            <span className="text-[9.5px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                              Você
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">({t.durationSec}s)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {t.senderRole} • {t.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPlaying && (
                        <div className="flex items-center gap-0.5 pr-1">
                          <span className="w-1 h-3 bg-cyan-400 animate-bounce rounded-full" />
                          <span className="w-1 h-4 bg-cyan-300 animate-bounce delay-75 rounded-full" />
                          <span className="w-1 h-2 bg-cyan-400 animate-bounce delay-150 rounded-full" />
                        </div>
                      )}

                      {t.audioBase64 && (
                        <a
                          href={t.audioBase64}
                          download={`voz_ptt_${t.id}.webm`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                          title="Baixar gravação"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {transmissions.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Radio className="w-7 h-7 mx-auto mb-1 text-slate-600 opacity-60" />
                  Nenhuma transmissão de voz no canal ainda.
                  <span className="block text-[11px] text-slate-600 mt-1">
                    Segure o botão FALAR (PTT) para abrir o canal e conversar!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
