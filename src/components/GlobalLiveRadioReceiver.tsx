import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Radio, Headphones, AlertCircle, X } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getOrCreateSessionId,
  playChime,
  purgeAllStoredAudios,
  getSessionOperator,
  LiveVoiceTransmission,
} from '../services/livePttService';

interface GlobalLiveRadioReceiverProps {
  activeTab: string;
  onNavigateToRadio?: () => void;
}

export const GlobalLiveRadioReceiver: React.FC<GlobalLiveRadioReceiverProps> = ({
  activeTab,
  onNavigateToRadio,
}) => {
  const [activeTransmission, setActiveTransmission] = useState<LiveVoiceTransmission | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [isEscutaEnabled, setIsEscutaEnabled] = useState<boolean>(() => {
    return localStorage.getItem('maritime_ptt_escuta') !== 'false';
  });

  const lastProcessedTimeRef = useRef<number>(Date.now());
  const initialLoadRef = useRef<boolean>(true);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionId = getOrCreateSessionId();

  // 1. Limpa áudios antigos armazenados no Firestore na inicialização (Não salvar áudios)
  useEffect(() => {
    purgeAllStoredAudios().catch(() => {});
  }, []);

  // 2. Presença Global do Operador na Frequência (Mantém quem está com o site aberto online)
  useEffect(() => {
    const op = getSessionOperator();
    const operatorName = op.isLoggedIn ? op.name : 'Ouvinte Online';
    const operatorRole = op.isLoggedIn ? op.role : 'Sala de Controle';
    const operatorRef = doc(db, 'maritime_operators', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(
          operatorRef,
          {
            id: sessionId,
            name: operatorName,
            role: operatorRole,
            isListening: isEscutaEnabled,
            isTalking: false,
            channel: 'canal-operacional',
            lastSeen: Date.now(),
          },
          { merge: true }
        );
      } catch {
        // Ignora erros transitórios
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 12000);

    const cleanup = () => {
      deleteDoc(operatorRef).catch(() => {});
    };
    window.addEventListener('beforeunload', cleanup);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [sessionId, isEscutaEnabled]);

  // 3. Listener em tempo real para transmitir imediatamente para quem estiver com o site aberto
  useEffect(() => {
    const q = query(
      collection(db, 'maritime_radio_dispatches'),
      orderBy('createdAtNum', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const newestDoc = snapshot.docs[0];
      const data = newestDoc.data();
      const transmission: LiveVoiceTransmission = {
        id: newestDoc.id,
        senderName: data.senderName || 'Operador',
        senderRole: data.senderRole || 'Operador',
        channel: data.channel || 'Canal TSI',
        audioBase64: data.audioBase64,
        durationSec: data.durationSec || 2,
        timestamp: data.timestamp || 'Agora',
        createdAtNum: data.createdAtNum || 0,
        senderSessionId: data.senderSessionId || '',
      };

      // Na primeira carga, não toca áudios anteriores
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        lastProcessedTimeRef.current = transmission.createdAtNum || Date.now();
        return;
      }

      // Se for uma transmissão recente (últimos 15s) e não for própria
      const isNew = transmission.createdAtNum > lastProcessedTimeRef.current;
      const isNotMe = transmission.senderSessionId !== sessionId;

      if (isNew && isNotMe && transmission.audioBase64) {
        lastProcessedTimeRef.current = transmission.createdAtNum;

        if (isEscutaEnabled) {
          playLiveBroadcast(transmission);
        }

        // Agenda remoção do documento no Firestore em 10s para não salvar áudios
        setTimeout(() => {
          deleteDoc(doc(db, 'maritime_radio_dispatches', transmission.id)).catch(() => {});
        }, 10000);
      }
    });

    return () => unsubscribe();
  }, [sessionId, isEscutaEnabled]);

  const playLiveBroadcast = (trans: LiveVoiceTransmission) => {
    try {
      playChime('incoming');
      setActiveTransmission(trans);
      setIsPlaying(true);
      setAutoplayBlocked(false);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(trans.audioBase64);
      audioPlayerRef.current = audio;
      pendingAudioRef.current = audio;

      audio.onended = () => {
        playChime('end');
        setIsPlaying(false);
        setTimeout(() => {
          setActiveTransmission((curr) => (curr?.id === trans.id ? null : curr));
        }, 1500);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setActiveTransmission(null);
      };

      audio.play().catch((err) => {
        console.warn('Browser blocked autoplay:', err);
        // Autoplay policy bloqueou reprodução sem interação prévia
        setAutoplayBlocked(true);
      });
    } catch (err) {
      console.warn('Playback error:', err);
      setIsPlaying(false);
    }
  };

  const handleUserUnlockAudio = () => {
    if (pendingAudioRef.current) {
      pendingAudioRef.current
        .play()
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch(() => {});
    } else {
      setAutoplayBlocked(false);
    }
  };

  return (
    <>
      {/* Banner Flutuante de Voz ao Vivo (Visível em qualquer aba quando alguém aperta o PTT e fala) */}
      {activeTransmission && (
        <div
          className={`fixed top-14 sm:top-16 right-3 sm:right-6 z-50 max-w-sm w-full bg-slate-900/95 border-2 border-cyan-400 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-4 duration-300 text-white ${
            isPlaying ? 'ring-4 ring-cyan-500/40 shadow-cyan-900/70' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center shrink-0 text-cyan-400">
                <Volume2 className="w-5 h-5 animate-bounce" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-600/70 px-1.5 py-0.5 rounded">
                    VOZ AO VIVO VIA PTT
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activeTransmission.durationSec}s
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {activeTransmission.senderName}
                </h4>
                <p className="text-[11px] text-slate-300 font-mono">
                  {activeTransmission.senderRole}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (audioPlayerRef.current) audioPlayerRef.current.pause();
                setActiveTransmission(null);
                setIsPlaying(false);
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Equalizer animation */}
          {isPlaying && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Transmitindo som ao vivo no site...
              </span>
              <div className="flex items-center gap-1 pr-1">
                <span className="w-1 h-3 bg-cyan-400 animate-bounce rounded-full" />
                <span className="w-1 h-5 bg-cyan-300 animate-bounce delay-75 rounded-full" />
                <span className="w-1 h-2 bg-cyan-400 animate-bounce delay-150 rounded-full" />
                <span className="w-1 h-4 bg-cyan-200 animate-bounce delay-100 rounded-full" />
              </div>
            </div>
          )}

          {/* Prompt se o navegador exigir clique para liberar som */}
          {autoplayBlocked && (
            <div className="mt-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={handleUserUnlockAudio}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <AlertCircle className="w-4 h-4" />
                Clique aqui para ouvir áudio ao vivo
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
