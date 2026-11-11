import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Radio,
  Mic,
  Users,
  Volume2,
  Loader2,
  Headphones,
  Wifi,
  WifiOff,
  UserCheck,
  Shield,
  HelpCircle,
  Activity,
  Sparkles,
  Signal,
  CheckCircle2,
  Trash2,
  LogOut,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getOrCreateSessionId,
  getSessionOperator,
  setSessionOperator,
  clearSessionOperator,
  playChime,
  broadcastLiveVoice,
  purgeAllStoredAudios,
  OnlineOperator,
  ChannelActivityLog,
} from '../services/livePttService';

export const OperationalRadioPage: React.FC = () => {
  // Sessão do Operador (apenas sessionStorage - desloga automaticamente ao fechar o site)
  const [sessionUser, setSessionUserState] = useState(() => getSessionOperator());

  // Campos do formulário de identificação/cadastro quando entra no módulo
  const [inputName, setInputName] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modo de Escuta (Mudo / Ativa)
  const [isListeningMode, setIsListeningMode] = useState<boolean>(() => {
    return sessionStorage.getItem('maritime_ptt_escuta') !== 'false';
  });

  // Operadores Online
  const [onlineOperators, setOnlineOperators] = useState<OnlineOperator[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // PTT Estado de Transmissão
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmittingSeconds, setTransmittingSeconds] = useState<number>(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Log efêmero de eventos do canal (apenas texto de status, SEM áudios salvos)
  const [recentEvents, setRecentEvents] = useState<ChannelActivityLog[]>(() => [
    {
      id: 'init-1',
      text: 'Canal de voz via Internet conectado. Escuta direta ativada para operadores com o site aberto.',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    },
  ]);

  // Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pttTimerRef = useRef<any>(null);
  const sessionId = getOrCreateSessionId();

  // 1. Limpeza inicial de áudios antigos armazenados (Garantir que nenhum áudio fique salvo)
  useEffect(() => {
    purgeAllStoredAudios().catch(() => {});
  }, []);

  // 2. Heartbeat de Presença do Operador no Firestore (somente quando logado na sessão)
  useEffect(() => {
    if (!sessionUser.isLoggedIn) return;

    const operatorRef = doc(db, 'maritime_operators', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(
          operatorRef,
          {
            id: sessionId,
            name: sessionUser.name,
            role: sessionUser.role,
            isListening: isListeningMode,
            isTalking: isTransmitting,
            channel: 'canal-operacional',
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
    const heartbeat = setInterval(updatePresence, 10000);

    // Ao fechar a aba/janela do site, desloga e apaga a presença no banco imediatamente
    const handleUnload = () => {
      deleteDoc(operatorRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(operatorRef).catch(() => {});
    };
  }, [sessionId, sessionUser, isListeningMode, isTransmitting]);

  // 3. Monitor de Operadores Online
  useEffect(() => {
    const colRef = collection(db, 'maritime_operators');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const now = Date.now();
        const list: OnlineOperator[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const lastSeen = typeof data.lastSeen === 'number' ? data.lastSeen : now;
          if (now - lastSeen < 32000) {
            list.push({
              id: d.id,
              name: data.name || 'Operador',
              role: data.role || 'Operador Marítimo',
              channel: data.channel || 'canal-operacional',
              isListening: data.isListening !== false,
              isTalking: Boolean(data.isTalking),
              lastSeen,
            });
          }
        });
        setOnlineOperators(list);
      },
      () => {
        setIsConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Ação de Cadastrar / Identificar Usuário no Módulo (Sessão temporária)
  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setLoginError('Por favor, informe seu nome para entrar na frequência.');
      return;
    }
    const defaultRole = 'Usuário Online';
    setSessionOperator(trimmed, defaultRole);
    setSessionUserState({ name: trimmed, role: defaultRole, isLoggedIn: true });
    setLoginError(null);
    playChime('start');
  };

  // Ação de Desconectar / Deslogar
  const handleLogout = () => {
    clearSessionOperator();
    setSessionUserState({ name: '', role: 'Usuário Online', isLoggedIn: false });
    const operatorRef = doc(db, 'maritime_operators', sessionId);
    deleteDoc(operatorRef).catch(() => {});
  };

  // Iniciar PTT
  const startPTT = async () => {
    if (isTransmitting || isProcessingAudio || !sessionUser.isLoggedIn) return;
    setMicError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Acesso ao microfone não suportado pelo navegador.');
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

        if (audioBlob.size > 500) {
          await sendLiveBroadcast(audioBlob, transmittingSeconds || 2);
        } else {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start(100);
      setIsTransmitting(true);
      setTransmittingSeconds(0);
      playChime('start');

      pttTimerRef.current = setInterval(() => {
        setTransmittingSeconds((prev) => {
          if (prev >= 29) {
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
        'Permissão de microfone bloqueada pelo navegador. Conceda permissão no ícone de cadeado do navegador para falar no PTT.'
      );
    }
  };

  // Parar PTT e disparar som para quem estiver com o site aberto
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

  // Transmitir áudio ao vivo (sem salvar)
  const sendLiveBroadcast = async (blob: Blob, durationSec: number) => {
    setIsProcessingAudio(true);
    try {
      await broadcastLiveVoice(blob, {
        senderName: sessionUser.name,
        senderRole: sessionUser.role,
        channel: 'canal-operacional',
        durationSec,
        sessionId,
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setRecentEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          text: `Você transmitiu voz ao vivo (${durationSec}s) para todos online`,
          time: timeStr,
          type: 'voice',
        },
        ...prev.slice(0, 15),
      ]);
    } catch (err) {
      console.error('PTT voice dispatch error:', err);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Transmissão de Teste (Bipe sonoro para testar comunicação no canal)
  const sendSimulatedTestTransmission = async () => {
    setIsProcessingAudio(true);
    try {
      playChime('start');
      const sampleRate = 8000;
      const duration = 2.0;
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
        const freq = t < 0.4 ? 700 : t < 1.0 ? 1000 : 850;
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.25;
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      await sendLiveBroadcast(blob, 2);
    } catch {
      setIsProcessingAudio(false);
    }
  };

  const handleToggleEscuta = () => {
    const nextVal = !isListeningMode;
    setIsListeningMode(nextVal);
    sessionStorage.setItem('maritime_ptt_escuta', String(nextVal));
  };

  const currentSpeaker = onlineOperators.find((op) => op.isTalking && op.id !== sessionId);

  // SE O USUÁRIO NÃO ESTIVER IDENTIFICADO NA SESSÃO: Exibe tela de identificação / cadastro temporário
  if (!sessionUser.isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-8 px-3">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center mx-auto mb-3 text-cyan-400 shadow-lg shadow-cyan-950/50">
              <Radio className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Identificação do Usuário
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Informe seu nome para acessar o canal de voz via internet.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 mt-3">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sessão temporária: ao fechar o site, você é deslogado automaticamente.</span>
            </div>
          </div>

          <form onSubmit={handleRegisterUser} className="space-y-5">
            {/* Campo Nome */}
            <div>
              <label className="block text-xs uppercase font-bold text-slate-300 mb-1.5">
                Nome do Usuário:
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Digite seu nome (ex.: Carlos, Silva, Roberto...)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              />
              {loginError && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            {/* Botão Entrar */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-950/80 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Entrar no Rádio PTT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner: Informações da Comunicação PTT em Tempo Real */}
      <div className="bg-slate-900/95 rounded-xl sm:rounded-2xl border border-slate-800 p-3.5 sm:p-5 shadow-xl text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center shrink-0 text-cyan-400 shadow-md">
            <Radio className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Canal Push-to-Talk (PTT)
              </h2>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" /> TRANSMISSÃO DIRETA VIA INTERNET
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Ao apertar o PTT, a voz é transmitida ao vivo para todos que estiverem com o site aberto.
            </p>
          </div>
        </div>

        {/* Listening Mode Toggle (Escuta Ativa) */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleToggleEscuta}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition shadow-lg ${
              isListeningMode
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-950/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Quando ativada, a voz de qualquer outro operador tocando toca automaticamente"
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

      {/* Main Grid: Left Controls (PTT Push Button) + Right Operational Presence & Frequency Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Central PTT Push Button (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl text-slate-100 flex flex-col items-center text-center">
            {/* Operator Identifier Header (Perfil Identificado + Botão Sair) */}
            <div className="w-full pb-3 border-b border-slate-800 flex items-center justify-between text-xs mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-white truncate text-xs">{sessionUser.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    Conectado ao vivo
                  </span>
                </div>
              </div>

              {/* Botão Sair / Desconectar da Sessão */}
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700/60 text-[11px] font-semibold flex items-center gap-1 transition"
                title="Sair e deslogar desta sessão"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </div>

            {/* Live Incoming Voice Alert (When someone is speaking right now) */}
            {currentSpeaker && (
              <div className="w-full mb-4 p-3 bg-cyan-950/90 border border-cyan-400 rounded-xl text-cyan-200 animate-pulse flex items-center justify-between gap-2 shadow-lg shadow-cyan-950/60">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-cyan-300 animate-bounce" />
                  <div className="text-left">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                      TRANSMITINDO AO VIVO AGORA
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

            {/* Central Big PTT Button (Pressione e Segure para Falar) */}
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
                title="Pressione e segure para falar (solte para transmitir ao vivo para quem estiver no site)"
              >
                <div
                  className={`absolute inset-0 rounded-full border-2 ${
                    isTransmitting ? 'border-rose-300 animate-ping' : 'border-cyan-300/30'
                  }`}
                />

                <Mic className={`w-12 h-12 mb-1 ${isTransmitting ? 'text-white' : 'text-cyan-100'}`} />

                <span className="text-sm sm:text-base font-black tracking-wider uppercase">
                  {isTransmitting ? 'FALANDO...' : 'FALAR (PTT)'}
                </span>

                <span className="text-[10px] font-mono opacity-80 mt-0.5">
                  {isTransmitting ? `00:${transmittingSeconds < 10 ? `0${transmittingSeconds}` : transmittingSeconds}s` : 'Segure para Falar'}
                </span>
              </button>

              <span className="text-[11px] text-slate-400 mt-3 font-medium">
                {isTransmitting ? (
                  <span className="text-rose-400 font-bold">Solte para transmitir ao vivo para quem estiver no site</span>
                ) : (
                  <span>Segure o botão para falar ou solte para transmitir</span>
                )}
              </span>

              {isProcessingAudio && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-cyan-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitindo áudio em tempo real...</span>
                </div>
              )}
            </div>

            {/* Test Simulation Button */}
            <div className="w-full pt-3 border-t border-slate-800 mt-2">
              <button
                onClick={sendSimulatedTestTransmission}
                disabled={isProcessingAudio || isTransmitting}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition"
                title="Gera um bipe operacional de teste e transmite para todos que estiverem com o site aberto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Testar Transmissão no Canal (Bipe de Teste)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Operadores Online e Monitor da Frequência em Tempo Real (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Operadores Conectados no Canal */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Operadores com o Site Aberto ({onlineOperators.length})
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Conectados ao Vivo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
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
                          MUDO
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

          {/* Monitor da Frequência em Tempo Real (SEM GRAVAÇÃO DE ÁUDIO) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Status da Frequência ao Vivo
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Sessão Temporária (Auto-Logout ao fechar)
                </span>
              </div>
            </div>

            {/* Frequency State Indicator */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    currentSpeaker || isTransmitting
                      ? 'bg-rose-500 animate-ping shadow-[0_0_12px_#f43f5e]'
                      : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isTransmitting
                      ? 'Você está transmitindo áudio ao vivo'
                      : currentSpeaker
                      ? `Transmissão em andamento: ${currentSpeaker.name}`
                      : 'Frequência Livre — Pronta para Transmissão'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {isListeningMode
                      ? 'Escuta direta habilitada. O som toca imediatamente quando alguém aperta o PTT.'
                      : 'Escuta em modo mudo.'}
                  </span>
                </div>
              </div>

              <Signal className={`w-5 h-5 shrink-0 ${isTransmitting || currentSpeaker ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
            </div>

            {/* Atividade Recente do Canal (Apenas texto informativo efêmero) */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1">
                <span>Eventos do Canal</span>
                <button
                  onClick={() => setRecentEvents([])}
                  className="hover:text-slate-200 text-[10px] flex items-center gap-1"
                  title="Limpar registro de eventos"
                >
                  <Trash2 className="w-3 h-3" /> Limpar
                </button>
              </div>

              {recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-200 truncate">{ev.text}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{ev.time}</span>
                </div>
              ))}

              {recentEvents.length === 0 && (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Nenhum evento registrado recentemente.
                </div>
              )}
            </div>

            {/* Explicação de funcionamento em conformidade com o pedido do usuário */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Segurança da Sessão:</strong> Seu usuário está conectado apenas nesta sessão. Ao fechar a aba ou o navegador, sua identificação e presença são deslogadas automaticamente.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
