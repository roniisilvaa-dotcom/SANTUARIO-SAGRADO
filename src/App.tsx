import React, { useState, useEffect } from "react";
import {
  Sparkles, Heart, BookOpen, Wind, Flame, PenTool, User, Compass,
  Loader2, ChevronRight, ChevronLeft, Volume2, Plus, Play, Pause,
  RotateCcw, RotateCw, Star, MapPin, Shield, Lock,
  Compass as CompassIcon, Menu, Bell, Home, Users, Search
} from "lucide-react";
import { ExperienceData, JournalEntry, UserProfile, EmotionOption, PrayerRequest } from "./types";
import { SUPPORTED_EMOTIONS } from "./components/SoulCheckIn";
import {
  isRealFirebase, registerAuthStateListener, loginWithGoogle,
  loginWithEmailSimulated, logoutPilgrim, updatePilgrimProfile,
  getDiaryEntries, addDiaryEntry, deleteDiaryEntry,
  getCommunalPrayers, addCommunalPrayer, clickPrayerAmen,
} from "./lib/firebase";

const mountainSunset = "/src/assets/images/santuario_mountain_sunset_1779406835686.png";
const forestRiver = "/src/assets/images/santuario_forest_river_1779406851043.png";

export default function App() {
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("santuario_username") || "João");
  const [activeWebTab, setActiveWebTab] = useState<number>(0);
  const [selectedEmotionId, setSelectedEmotionId] = useState<string>("ansiedade");
  const [likedVerse, setLikedVerse] = useState<boolean>(false);
  const [todayRating, setTodayRating] = useState<number>(5);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioProgressSeconds, setAudioProgressSeconds] = useState<number>(0);
  const [hasCompletedCheckIn, setHasCompletedCheckIn] = useState<boolean>(false);
  const [pilgrimUser, setPilgrimUser] = useState<any | null>(null);
  const [pilgrimProfile, setPilgrimProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [activeDiarySubTab, setActiveDiarySubTab] = useState<"memorial" | "mural" | "pastor">("memorial");
  const [authEmailInput, setAuthEmailInput] = useState<string>("");
  const [authNameInput, setAuthNameInput] = useState<string>("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"mensal" | "anual">("anual");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao">("pix");
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState<boolean>(false);
  const [isCheckoutFinished, setIsCheckoutFinished] = useState<boolean>(false);
  const [simulatedPixCopied, setSimulatedPixCopied] = useState<boolean>(false);
  const [ccNumber, setCcNumber] = useState<string>("");
  const [ccName, setCcName] = useState<string>("");
  const [ccExp, setCcExp] = useState<string>("");
  const [ccCvv, setCcCvv] = useState<string>("");
  const [communalPrayersList, setCommunalPrayersList] = useState<PrayerRequest[]>([]);
  const [newPrayerText, setNewPrayerText] = useState<string>("");
  const [isPublishingPrayer, setIsPublishingPrayer] = useState<boolean>(false);
  const [pastorChatText, setPastorChatText] = useState<string>("");
  const [pastorChatDialog, setPastorChatDialog] = useState<{ role: "pilgrim" | "pastor"; text: string }[]>([
    { role: "pastor", text: "Graça e paz. Que bom termos este momento. Como posso clamar a Deus junto com você hoje?" }
  ]);
  const [isPastorAnswering, setIsPastorAnswering] = useState<boolean>(false);
  const [voiceRate, setVoiceRate] = useState<number>(0.75);
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<"female" | "male">("male");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customPrayerNote, setCustomPrayerNote] = useState<string>("");
  const [diaryEntries, setDiaryEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem("santuario_diary_gold");
    if (saved) return JSON.parse(saved);
    return [{
      id: "1",
      date: "21 Mai, 23:31",
      text: "É impressionante como Deus sempre fala comigo exatamente no momento em que eu mais preciso.",
      emotion: "ansiedade",
      reflection: "Deus cuida de você de maneira inteiramente pessoal.",
      prayerFocus: "Descanse na promessa de Filipenses 4:7"
    }];
  });
  const [newJournalText, setNewJournalText] = useState<string>("");
  const [isGeneratingExperience, setIsGeneratingExperience] = useState<boolean>(false);
  const [experienceData, setExperienceData] = useState<ExperienceData>({
    prayer: "Pai, entrego a Ti todas as minhas preocupações. Tu conheces meu coração e sabes o que preciso. Acalma minha alma e me faz confiar mais em Ti. Em nome de Jesus, Amém.",
    verse: {
      reference: "1 Pedro 5:7",
      text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.",
      explanation: "Entregar nossos fardos a Deus é um ato de fé que liberta a alma."
    },
    devotional: "Muitas vezes corremos com nossos próprios pés tentando resolver o que só Deus pode. Hoje, Jesus lhe chama para uma pausa restauradora.",
    breathExercise: "Inspire o sopro de vida por 4 segundos... segure em reverência... solte entregando as preocupações."
  });
  const [streakCount, setStreakCount] = useState<number>(12);

  const isPremiumActive = () => pilgrimProfile?.subscriptionStatus === "premium";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getGreetingEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return "☀️";
    if (h < 18) return "🌤️";
    return "🌙";
  };

  useEffect(() => {
    const unsubscribe = registerAuthStateListener((user, profile) => {
      setPilgrimUser(user);
      setPilgrimProfile(profile);
      if (profile) {
        setUserName(profile.name);
        setStreakCount(profile.streak || 1);
        getDiaryEntries(user.uid || "mock_user_uid").then((entries) => {
          if (entries && entries.length > 0) setDiaryEntries(entries);
        });
      } else {
        setUserName("João");
      }
    });
    getCommunalPrayers().then((prPrayers) => setCommunalPrayersList(prPrayers));
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis)
        setAvailableVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${experienceData.prayer}. ${experienceData.devotional}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "pt-BR";
      utterance.rate = voiceRate;
      utterance.pitch = selectedVoiceGender === "male" ? 0.85 : 1.1;
      const ptVoices = availableVoices.filter(v => v.lang.includes("pt"));
      if (ptVoices.length > 0) utterance.voice = ptVoices[0];
      utterance.onend = () => { setIsAudioPlaying(false); setAudioProgressSeconds(720); };
      utterance.onerror = () => {};
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
    return () => { window.speechSynthesis.cancel(); };
  }, [isAudioPlaying, experienceData, voiceRate, selectedVoiceGender, availableVoices]);

  useEffect(() => {
    localStorage.setItem("santuario_diary_gold", JSON.stringify(diaryEntries));
  }, [diaryEntries]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAudioPlaying) {
      interval = setInterval(() => {
        setAudioProgressSeconds((prev) => (prev >= 720 ? 0 : prev + 1));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isAudioPlaying]);

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const generateContemplativePath = async (emotionId: string) => {
    setIsGeneratingExperience(true);
    const emotionObj = SUPPORTED_EMOTIONS.find(e => e.id === emotionId) || SUPPORTED_EMOTIONS[0];
    try {
      const response = await fetch("/api/experience/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion: emotionObj.label, notes: customPrayerNote || "Fé e silêncio diante d'O Senhor." })
      });
      const data = await response.json();
      if (response.ok && data.prayer) {
        setExperienceData(data);
        setHasCompletedCheckIn(true);
        setActiveWebTab(2);
      } else throw new Error("Fallback");
    } catch {
      setExperienceData({
        prayer: `Pai, entrego a Ti a ${emotionObj.label} de ${userName}. Renova meu fôlego, preenche de paz este coração e concede discernimento espiritual. Amém.`,
        verse: {
          reference: emotionId === "ansiedade" ? "Filipenses 4:6-7" : "Isaías 40:31",
          text: emotionId === "ansiedade"
            ? "Não andeis ansiosos de coisa alguma; em tudo sejam conhecidas as vossas petições diante de Deus."
            : "Os que esperam no Senhor renovam as suas forças, sobem com asas como águias.",
          explanation: "Este versículo nos convida a transferir o peso das nossas mãos humanas para o Senhor compassivo."
        },
        devotional: `Quando confessamos viver sob ${emotionObj.label}, declaramos nossa necessidade do Criador. Descanse hoje em Sua presença soberana.`,
        breathExercise: "Sente-se... inspire sentindo o amor redentor... expire rejeitando todas as tensões... Ele está aqui."
      });
      setHasCompletedCheckIn(true);
      setActiveWebTab(2);
    } finally {
      setIsGeneratingExperience(false);
      setCustomPrayerNote("");
    }
  };

  const handleAddNewDiaryText = async () => {
    if (!newJournalText.trim()) return;
    const date = new Date();
    const formattedDate = `${date.getDate()} ${date.toLocaleString("pt-BR", { month: "short" })}, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    const option = SUPPORTED_EMOTIONS.find(e => e.id === selectedEmotionId) || SUPPORTED_EMOTIONS[0];
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: formattedDate,
      text: newJournalText,
      emotion: selectedEmotionId,
      reflection: `Que benção poder te ouvir, ${userName}. Ao registrar que se sente sob ${option.label}, saiba que o Senhor intercede por você.`,
      prayerFocus: "Aquiete-se e saiba que Ele é Deus. (Salmo 46:10)"
    };
    const updated = [newEntry, ...diaryEntries];
    setDiaryEntries(updated);
    setNewJournalText("");
    const nextStreak = streakCount + 1;
    setStreakCount(nextStreak);
    if (pilgrimUser) {
      try {
        await addDiaryEntry(pilgrimUser.uid || "mock_user_uid", newEntry);
        await updatePilgrimProfile(pilgrimUser.uid || "mock_user_uid", { streak: nextStreak, lastCheckIn: new Date().toISOString() });
      } catch {}
    }
  };

  const handleSendPastorMessage = () => {
    if (!pastorChatText.trim()) return;
    if (!isPremiumActive()) { setShowSubscriptionModal(true); return; }
    const pilgrimMessage = { role: "pilgrim" as const, text: pastorChatText };
    setPastorChatDialog(prev => [...prev, pilgrimMessage]);
    setPastorChatText("");
    setIsPastorAnswering(true);
    setTimeout(() => {
      const responses = [
        "Glorificado seja Deus de toda consolação. Lembre-se: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.' (Salmo 119:105)",
        "Que o Senhor te guie com águas tranquilas. A paciência na provação gera esperança que não frustra. (Romanos 5:3-5)",
        "Meu irmão, 'Aquietai-vos e sabei que eu sou Deus.' (Salmo 46:10) Permita-se descansar em Sua soberania."
      ];
      setPastorChatDialog(prev => [...prev, { role: "pastor" as const, text: responses[Math.floor(Math.random() * responses.length)] }]);
      setIsPastorAnswering(false);
    }, 1800);
  };

  const handlePublishCommunalPrayer = async () => {
    if (!newPrayerText.trim()) return;
    setIsPublishingPrayer(true);
    try {
      const added = await addCommunalPrayer(newPrayerText, pilgrimUser?.uid || "mock_user_uid", pilgrimProfile?.name || userName || "Anônimo");
      setCommunalPrayersList(prev => [added, ...prev]);
      setNewPrayerText("");
    } catch {} finally { setIsPublishingPrayer(false); }
  };

  const handleAmenClick = async (prayerId: string) => {
    const uid = pilgrimUser?.uid || "mock_user_uid";
    try {
      await clickPrayerAmen(prayerId, uid);
      setCommunalPrayersList(prev => prev.map(p => {
        if (p.id === prayerId && !p.amens?.includes(uid))
          return { ...p, amenCount: p.amenCount + 1, amens: [...(p.amens || []), uid] };
        return p;
      }));
    } catch {}
  };

  const handleUpgradeToPremium = async () => {
    const uid = pilgrimUser?.uid || "mock_user_uid";
    const updatedProfile: UserProfile = {
      ...(pilgrimProfile || { name: userName, email: "usuario@santuario.app", joinedDate: new Date().toISOString(), streak: streakCount }),
      subscriptionStatus: "premium" as "premium" | "free"
    };
    setIsCheckoutProcessing(true);
    setTimeout(async () => {
      try {
        await updatePilgrimProfile(uid, updatedProfile);
        setPilgrimProfile(updatedProfile);
        setIsCheckoutProcessing(false);
        setIsCheckoutFinished(true);
      } catch { setIsCheckoutProcessing(false); }
    }, 2200);
  };

  const getActiveEmotionObject = () => SUPPORTED_EMOTIONS.find(e => e.id === selectedEmotionId) || SUPPORTED_EMOTIONS[0];

  const emotionEmojis: Record<string, string> = {
    ansiedade: "😟", cansaço: "😴", solidão: "🖤", culpa: "😔",
    medo: "😰", direção: "🧭", gratidão: "🙏", confusão: "🌪️"
  };

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0f0c08] text-[#f5f0e8] font-sans overflow-x-hidden">
      <div className="max-w-[440px] mx-auto relative min-h-screen flex flex-col">

        {/* ══ SCROLLABLE CONTENT ══ */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* ══════════════ TAB 0 — INÍCIO ══════════════ */}
          {activeWebTab === 0 && (
            <div>

              {/* HERO */}
              <div className="relative h-80">
                <img src={mountainSunset} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0f0c08]/20 to-[#0f0c08]" />

                {/* Header bar */}
                <div className="relative z-10 flex items-center justify-between px-5 pt-14">
                  <button onClick={() => setShowAuthModal(true)}>
                    <Menu className="w-6 h-6 text-white/90" />
                  </button>
                  <button className="w-9 h-9 rounded-full border-2 border-[#d4a540]/60 flex items-center justify-center text-[#d4a540]">
                    <Plus className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <button className="relative">
                      <Bell className="w-5 h-5 text-white/90" />
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0f0c08]" />
                    </button>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-9 h-9 rounded-full bg-amber-900/40 border-2 border-amber-400/20 flex items-center justify-center overflow-hidden"
                    >
                      {pilgrimUser?.photoURL
                        ? <img src={pilgrimUser.photoURL} alt={userName} className="w-full h-full object-cover" />
                        : <User className="w-4 h-4 text-amber-300" />
                      }
                    </button>
                  </div>
                </div>

                {/* Greeting */}
                <div className="relative z-10 px-5 mt-5">
                  <h1 className="text-[32px] font-serif text-white font-semibold leading-tight">
                    {getGreeting()}, {userName} {getGreetingEmoji()}
                  </h1>
                  <p className="text-[15px] text-white/70 mt-1.5 leading-relaxed">
                    Que hoje você experimente<br />a presença de Deus de uma forma real.
                  </p>
                </div>

                {/* CTA pill */}
                <div className="relative z-10 px-5 mt-5">
                  <button
                    onClick={() => setActiveWebTab(1)}
                    className="flex items-center gap-2.5 bg-[#d4a540] text-[#1a0e00] font-bold px-5 py-3 rounded-full text-[14px] shadow-xl active:scale-95 transition-all"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Como está sua alma hoje?</span>
                  </button>
                </div>
              </div>

              {/* ─── CARDS BELOW HERO ─── */}
              <div className="px-4 -mt-2 space-y-5">

                {/* DEVOTIONAL CARD */}
                <div className="relative rounded-2xl overflow-hidden bg-[#1c1409] min-h-[210px]">
                  <div className="absolute inset-0">
                    <img src={forestRiver} alt="" className="absolute right-0 top-0 h-full w-1/2 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1c1409] via-[#1c1409]/92 to-[#1c1409]/55" />
                  </div>
                  <div className="relative z-10 p-5">
                    <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest font-bold">
                      Devocional do Dia
                    </span>
                    <h2 className="text-[20px] font-serif text-white font-semibold mt-2 leading-snug max-w-[58%]">
                      Deus cuida de você em cada detalhe
                    </h2>
                    <p className="text-[13px] text-white/60 mt-3 italic leading-relaxed max-w-[63%]">
                      "{experienceData.verse.text.length > 85
                        ? experienceData.verse.text.slice(0, 85) + "…"
                        : experienceData.verse.text}"
                    </p>
                    <p className="text-[#c9983e] text-[13px] font-semibold mt-1">{experienceData.verse.reference}</p>
                    <div className="h-px bg-white/10 my-4" />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveWebTab(2)}
                        className="flex items-center gap-1 text-[13px] text-white/75 hover:text-white transition-colors"
                      >
                        Ler devocional <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                        className="w-11 h-11 rounded-full bg-[#d4a540] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      >
                        {isAudioPlaying
                          ? <Pause className="w-5 h-5 text-[#1a0e00] fill-current" />
                          : <Play className="w-5 h-5 text-[#1a0e00] fill-current ml-0.5" />
                        }
                      </button>
                    </div>
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-3.5">
                    Comece seu momento com Deus
                  </h3>
                  <div className="grid grid-cols-5 gap-2.5">
                    {[
                      { icon: Sparkles, label: "Oração\nguiada", action: () => setActiveWebTab(1) },
                      { icon: BookOpen, label: "Ler\na Bíblia", action: () => setActiveWebTab(2) },
                      { icon: Wind, label: "Meditar", action: () => setActiveWebTab(2) },
                      { icon: Volume2, label: "Músicas", action: () => { setIsAudioPlaying(true); setActiveWebTab(2); } },
                      { icon: PenTool, label: "Diário\nespiritual", action: () => setActiveWebTab(4) }
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={item.action}
                          className="flex flex-col items-center gap-2 py-3.5 px-1.5 bg-[#1c1409] rounded-2xl border border-white/5 hover:border-[#d4a540]/20 active:scale-95 transition-all"
                        >
                          <Icon className="w-5 h-5 text-[#d4a540]" />
                          <span className="text-[10px] text-white/50 text-center leading-tight whitespace-pre-line">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AGORA PARA VOCÊ */}
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={mountainSunset} alt="" className="w-full h-48 object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a0d00]/98 via-[#1a0d00]/65 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest font-bold">Agora para você</span>
                      <span className="text-[#c9983e] text-xs">✦</span>
                    </div>
                    <h3 className="text-[20px] font-serif text-white font-semibold">Respire. Deus está aqui.</h3>
                    <p className="text-[13px] text-white/50 mt-0.5">3 min de silêncio e presença</p>
                    <button
                      onClick={() => { setActiveWebTab(2); setIsAudioPlaying(true); }}
                      className="mt-3.5 flex items-center gap-2.5 bg-[#d4a540] text-[#1a0e00] font-bold px-5 py-2.5 rounded-full text-[14px] shadow-lg active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar momento</span>
                    </button>
                  </div>
                </div>

                {/* Streak badge */}
                <div className="flex items-center gap-3 bg-[#1c1409] rounded-2xl border border-white/5 px-4 py-3">
                  <Flame className="w-5 h-5 text-amber-400 fill-current shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">{streakCount} dias de fé consecutivos</p>
                    <p className="text-[11px] text-white/40">Continue sua jornada diária</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════ TAB 1 — EXPLORAR (CHECK-IN) ══════════════ */}
          {activeWebTab === 1 && (
            <div className="px-4 pt-14 pb-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setActiveWebTab(0)}
                  className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-[20px] font-serif text-white font-semibold">Como está sua alma?</h2>
                  <p className="text-[12px] text-white/40 mt-0.5">Selecione o que mais pesa hoje</p>
                </div>
              </div>

              {/* Emotion grid */}
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_EMOTIONS.map((emp) => {
                  const isSelected = selectedEmotionId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmotionId(emp.id)}
                      className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? "bg-[#2a1c08] border-[#d4a540] shadow-lg shadow-amber-900/20"
                          : "bg-[#1c1409] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{emotionEmojis[emp.id] || "🙏"}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#d4a540]" />}
                      </div>
                      <p className="font-serif text-[14px] text-white font-semibold">{emp.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-4">
                <textarea
                  value={customPrayerNote}
                  onChange={(e) => setCustomPrayerNote(e.target.value)}
                  placeholder="Compartilhe mais sobre o que está sentindo... (opcional)"
                  className="w-full bg-[#1c1409] border border-white/5 rounded-2xl p-4 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 resize-none h-24 placeholder:text-white/20"
                />
              </div>

              {/* CTA */}
              <button
                onClick={() => generateContemplativePath(selectedEmotionId)}
                disabled={isGeneratingExperience}
                className="w-full mt-4 py-4 bg-[#d4a540] text-[#1a0e00] font-serif font-bold text-[15px] rounded-2xl flex items-center justify-center gap-2.5 shadow-xl active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {isGeneratingExperience ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Gerando sua oração personalizada…</span></>
                ) : (
                  <><span>Receber minha experiência espiritual</span><ChevronRight className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-center text-[11px] text-white/20 mt-4 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Seus dados são privados e nunca saem deste app
              </p>
            </div>
          )}

          {/* ══════════════ TAB 2 — JORNADAS (EXPERIÊNCIA) ══════════════ */}
          {activeWebTab === 2 && (
            <div className="relative min-h-screen">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img src={forestRiver} alt="" className="w-full h-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f0c08]/85 to-[#0f0c08]" />
              </div>

              <div className="relative z-10 px-4 pt-14 pb-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setActiveWebTab(0)} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-[17px] font-serif text-white font-semibold">Sua Jornada</h2>
                  <div className="w-9" />
                </div>

                {!hasCompletedCheckIn && (
                  <div className="bg-[#1c1409] rounded-2xl border border-white/5 p-5 text-center">
                    <Wind className="w-8 h-8 text-[#c9983e] mx-auto mb-3 animate-pulse" />
                    <p className="font-serif text-white/70 text-[14px]">Faça seu check-in espiritual primeiro</p>
                    <button
                      onClick={() => setActiveWebTab(1)}
                      className="mt-3 inline-flex items-center gap-2 text-[#d4a540] text-[13px] font-semibold"
                    >
                      Como está sua alma? <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Prayer */}
                <div className="bg-[#1c1409]/90 backdrop-blur rounded-3xl border border-white/5 p-5">
                  <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest block mb-3">Oração Personalizada</span>
                  <p className="font-serif text-white/90 leading-relaxed italic text-[14px]">
                    "{experienceData.prayer}"
                  </p>
                </div>

                {/* Verse */}
                <div className="bg-[#1c1409]/90 backdrop-blur rounded-3xl border border-white/5 p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest">Versículo</span>
                    <button onClick={() => setLikedVerse(!likedVerse)}>
                      <Heart className={`w-4 h-4 transition-colors ${likedVerse ? "fill-current text-rose-400" : "text-white/20"}`} />
                    </button>
                  </div>
                  <p className="font-serif text-white italic text-[14px] leading-relaxed">
                    "{experienceData.verse.text}"
                  </p>
                  <p className="text-[#c9983e] text-[13px] font-semibold mt-2">{experienceData.verse.reference}</p>
                  <p className="text-white/40 text-[12px] mt-2 leading-relaxed">{experienceData.verse.explanation}</p>
                </div>

                {/* Devotional */}
                <div className="bg-[#1c1409]/90 backdrop-blur rounded-3xl border border-white/5 p-5">
                  <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest block mb-3">Devocional</span>
                  <p className="text-white/75 text-[14px] leading-relaxed">{experienceData.devotional}</p>
                </div>

                {/* Breath exercise */}
                <div className="bg-[#1c1409]/90 backdrop-blur rounded-3xl border border-[#c9983e]/15 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wind className="w-4 h-4 text-[#c9983e] animate-pulse" />
                    <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest">Respiração & Silêncio</span>
                  </div>
                  <p className="text-white/75 text-[14px] leading-relaxed font-serif italic">{experienceData.breathExercise}</p>
                </div>

                {/* Audio player */}
                <div className="bg-[#1c1409]/90 backdrop-blur rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest block">Oração em Áudio</span>
                      <span className="text-[12px] text-white/40 font-mono mt-0.5 block">{formatAudioTime(audioProgressSeconds)} / 12:00</span>
                    </div>
                    <div className="text-[#d4a540] text-3xl font-serif opacity-60">✝</div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer mb-5"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setAudioProgressSeconds(Math.floor(((e.clientX - rect.left) / rect.width) * 720));
                    }}
                  >
                    <div className="h-full bg-gradient-to-r from-[#d4a540] to-[#f0c060] rounded-full transition-all" style={{ width: `${(audioProgressSeconds / 720) * 100}%` }} />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-8">
                    <button onClick={() => setAudioProgressSeconds(p => Math.max(0, p - 15))} className="text-white/40 hover:text-white/70 transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                      className="w-16 h-16 rounded-full bg-[#d4a540] flex items-center justify-center shadow-2xl shadow-amber-900/40 active:scale-95 transition-transform"
                    >
                      {isAudioPlaying
                        ? <Pause className="w-7 h-7 text-[#1a0e00] fill-current" />
                        : <Play className="w-7 h-7 text-[#1a0e00] fill-current ml-0.5" />
                      }
                    </button>
                    <button onClick={() => setAudioProgressSeconds(p => Math.min(720, p + 15))} className="text-white/40 hover:text-white/70 transition-colors">
                      <RotateCcw className="w-5 h-5 scale-x-[-1]" />
                    </button>
                  </div>

                  {/* Voice selector */}
                  <div className="flex gap-2 mt-4">
                    {(["male", "female"] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedVoiceGender(g)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors ${
                          selectedVoiceGender === g ? "bg-[#d4a540] text-[#1a0e00]" : "bg-white/5 text-white/40"
                        }`}
                      >
                        {g === "male" ? "Pastor Daniel" : "Pastora Luciana"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveWebTab(1)}
                  className="w-full py-3.5 bg-white/5 border border-white/5 rounded-2xl text-[13px] text-white/40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#c9983e]" />
                  Refazer meu check-in espiritual
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3 — COMUNIDADE ══════════════ */}
          {activeWebTab === 3 && (
            <div className="px-4 pt-14 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[20px] font-serif text-white font-semibold">Comunidade</h2>
                  <p className="text-[12px] text-white/40 mt-0.5">Mural de pedidos de oração</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">{communalPrayersList.length} clamores</span>
                </div>
              </div>

              {/* Sub tabs */}
              <div className="flex gap-1 bg-[#1c1409] rounded-2xl p-1 mb-5">
                {(["memorial", "mural", "pastor"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveDiarySubTab(tab)}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                      activeDiarySubTab === tab ? "bg-[#d4a540] text-[#1a0e00]" : "text-white/40"
                    }`}
                  >
                    {tab === "memorial" ? "Meu Diário" : tab === "mural" ? "Mural" : `Pastoral ${isPremiumActive() ? "⭐" : "🔒"}`}
                  </button>
                ))}
              </div>

              {/* MURAL */}
              {activeDiarySubTab === "mural" && (
                <div className="space-y-4">
                  <div className="bg-[#1c1409] rounded-2xl border border-white/5 p-4">
                    <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest block mb-3">Compartilhar pedido</span>
                    <div className="flex gap-2">
                      <input
                        value={newPrayerText}
                        onChange={(e) => setNewPrayerText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePublishCommunalPrayer()}
                        placeholder="Pedir oração por…"
                        className="flex-1 bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20"
                      />
                      <button
                        onClick={handlePublishCommunalPrayer}
                        disabled={!newPrayerText.trim() || isPublishingPrayer}
                        className="px-4 py-2.5 bg-[#d4a540] text-[#1a0e00] font-bold rounded-xl text-[13px] disabled:opacity-40 active:scale-95"
                      >
                        {isPublishingPrayer ? "…" : "Clamar"}
                      </button>
                    </div>
                  </div>

                  {communalPrayersList.length === 0 ? (
                    <p className="text-center py-12 text-white/20 font-serif italic text-[14px]">Seja o primeiro a clamar em oração…</p>
                  ) : communalPrayersList.map((prayer) => {
                    const alreadyAmen = prayer.amens?.includes(pilgrimUser?.uid || "mock_user_uid");
                    return (
                      <div key={prayer.id} className="bg-[#1c1409] rounded-2xl border border-white/5 p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[14px] font-serif font-semibold text-[#c9983e]">✝ {prayer.authorName}</span>
                          <span className="text-[11px] text-white/25 font-mono">
                            {new Date(prayer.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/75 leading-relaxed">{prayer.text}</p>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => handleAmenClick(prayer.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95 ${
                              alreadyAmen
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                : "bg-white/5 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${alreadyAmen ? "fill-current" : ""}`} />
                            Amém ({prayer.amenCount})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MEMORIAL */}
              {activeDiarySubTab === "memorial" && (
                <div className="space-y-3">
                  {diaryEntries.length === 0 ? (
                    <p className="text-center py-12 text-white/20 font-serif italic text-[14px]">Seus registros espirituais aparecerão aqui…</p>
                  ) : diaryEntries.map((entry) => (
                    <div key={entry.id} className="bg-[#1c1409] rounded-2xl border border-white/5 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#c9983e]/10 text-[#c9983e] border border-[#c9983e]/15">
                          {entry.emotion}
                        </span>
                        <span className="text-[11px] text-white/25 font-mono">{entry.date}</span>
                      </div>
                      <p className="text-[13px] text-white/70 italic leading-relaxed">"{entry.text}"</p>
                      {entry.reflection && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-[11px] text-[#c9983e] font-mono uppercase mb-1.5 font-bold">Reflexão</p>
                          <p className="text-[12px] text-white/45 leading-relaxed">{entry.reflection}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* PASTOR */}
              {activeDiarySubTab === "pastor" && (
                <div>
                  {!isPremiumActive() ? (
                    <div className="bg-gradient-to-b from-[#2a1b05]/60 to-[#1c1409] rounded-2xl border border-amber-500/15 p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-[#c9983e]" />
                      </div>
                      <h4 className="text-[16px] font-serif text-white font-semibold">Aconselhamento Pastoral Premium</h4>
                      <p className="text-[12px] text-white/40 mt-2 leading-relaxed max-w-xs mx-auto">
                        Tire dúvidas sobre as escrituras, deite suas preocupações com respostas teológicas profundas.
                      </p>
                      <button
                        onClick={() => setShowSubscriptionModal(true)}
                        className="mt-4 py-2.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 text-[#1a0e00] rounded-xl text-[13px] font-bold"
                      >
                        Apoiar a Missão ⭐
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col bg-[#1c1409] border border-amber-500/10 rounded-2xl overflow-hidden h-[400px]">
                      <div className="bg-[#1a150c]/80 border-b border-amber-500/10 px-4 py-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[13px] font-serif font-semibold text-[#c9983e]">Conselheiro Pastoral</span>
                        <span className="ml-auto text-[10px] bg-amber-500/15 text-amber-300 font-mono px-2 py-0.5 rounded-full font-bold">Premium</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {pastorChatDialog.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === "pilgrim" ? "justify-end" : "justify-start"}`}>
                            <div className={`p-3 max-w-[85%] rounded-2xl text-[12px] leading-relaxed ${
                              msg.role === "pilgrim"
                                ? "bg-[#d4a540] text-[#1a0e00] rounded-br-none font-semibold"
                                : "bg-black/30 text-white/80 border border-white/5 rounded-bl-none"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isPastorAnswering && (
                          <div className="flex justify-start">
                            <div className="p-3 bg-black/20 rounded-2xl rounded-bl-none border border-white/5 flex items-center gap-2 text-[11px] text-white/40">
                              <Loader2 className="w-3 h-3 animate-spin text-[#c9983e]" />
                              Refletindo nas escrituras…
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-white/5 p-2 flex gap-2">
                        <input
                          value={pastorChatText}
                          onChange={(e) => setPastorChatText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendPastorMessage()}
                          placeholder="Escreva uma pergunta de fé…"
                          className="flex-1 bg-black/30 border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20"
                        />
                        <button
                          onClick={handleSendPastorMessage}
                          disabled={!pastorChatText.trim()}
                          className="px-3 py-2 bg-[#d4a540] text-[#1a0e00] font-bold rounded-xl text-[12px] disabled:opacity-40"
                        >
                          Clamar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ TAB 4 — PERFIL ══════════════ */}
          {activeWebTab === 4 && (
            <div className="px-4 pt-14 pb-6">
              {/* Profile header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-900/30 border-2 border-[#c9983e]/25 flex items-center justify-center overflow-hidden shrink-0">
                  {pilgrimUser?.photoURL
                    ? <img src={pilgrimUser.photoURL} alt={userName} className="w-full h-full object-cover" />
                    : <User className="w-8 h-8 text-[#c9983e]" />
                  }
                </div>
                <div className="flex-1">
                  <h2 className="text-[20px] font-serif text-white font-semibold">{userName}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Flame className="w-4 h-4 text-amber-400 fill-current" />
                    <span className="text-[13px] text-amber-400 font-semibold">{streakCount} dias de fé</span>
                  </div>
                </div>
                {!pilgrimUser && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-[12px] text-[#d4a540] border border-[#d4a540]/30 px-3 py-1.5 rounded-full font-semibold"
                  >
                    Entrar
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Orações", value: diaryEntries.length + 12, emoji: "🙏" },
                  { label: "Dias seguidos", value: streakCount, emoji: "🔥" },
                  { label: "Versículos", value: 24, emoji: "📖" }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#1c1409] rounded-2xl border border-white/5 py-4 px-3 text-center">
                    <span className="text-2xl block mb-1">{stat.emoji}</span>
                    <span className="text-[18px] font-serif text-white font-bold block">{stat.value}</span>
                    <span className="text-[11px] text-white/35">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Premium banner */}
              {!isPremiumActive() ? (
                <div className="bg-gradient-to-br from-[#2a1b05] to-[#1c1409] rounded-2xl border border-amber-500/20 p-5 mb-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[11px] text-amber-400 font-mono uppercase tracking-widest font-bold">Premium</span>
                      <h3 className="text-[16px] font-serif text-white font-semibold mt-0.5">Libere o Santuário completo</h3>
                      <p className="text-[12px] text-white/35 mt-0.5">Vozes, jornadas e aconselhamento pastoral IA</p>
                    </div>
                    <span className="text-2xl">⭐</span>
                  </div>
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="w-full py-3 bg-[#d4a540] text-[#1a0e00] font-bold rounded-xl text-[14px] active:scale-[0.98] transition-transform"
                  >
                    Apoiar a Missão ✦
                  </button>
                </div>
              ) : (
                <div className="bg-[#1c1409] rounded-2xl border border-amber-500/20 p-4 mb-5 text-center">
                  <p className="text-[#d4a540] font-serif font-semibold">⭐ Aliança Premium Ativa</p>
                  <p className="text-[12px] text-white/35 mt-1">Obrigado por apoiar a missão</p>
                </div>
              )}

              {/* Diary section */}
              <h3 className="text-[16px] font-serif text-white font-semibold mb-3">Diário de Fé</h3>

              {/* New entry form */}
              <div className="bg-[#1c1409] rounded-2xl border border-white/5 p-4 mb-4">
                <span className="text-[11px] text-[#c9983e] font-mono uppercase tracking-widest block mb-3">Nova entrada</span>
                <textarea
                  value={newJournalText}
                  onChange={(e) => setNewJournalText(e.target.value)}
                  placeholder="Como foi seu dia com Deus? Escreva aqui…"
                  className="w-full bg-black/20 border border-white/5 rounded-xl p-3.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 resize-none h-20 placeholder:text-white/20"
                />
                <div className="flex items-center gap-1 mt-2.5 mb-3.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setTodayRating(s)}>
                      <Star className={`w-5 h-5 fill-current transition-colors ${s <= todayRating ? "text-[#d4a540]" : "text-white/10"}`} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddNewDiaryText}
                  disabled={!newJournalText.trim()}
                  className="w-full py-3 bg-[#d4a540] text-[#1a0e00] font-bold rounded-xl text-[14px] disabled:opacity-30 active:scale-[0.98] transition-transform"
                >
                  Guardar no Diário
                </button>
              </div>

              {/* Past entries */}
              <div className="space-y-3">
                {diaryEntries.map((entry) => (
                  <div key={entry.id} className="bg-[#1c1409] rounded-2xl border border-white/5 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#c9983e]/10 text-[#c9983e] border border-[#c9983e]/15">
                        {entry.emotion}
                      </span>
                      <span className="text-[11px] text-white/25 font-mono">{entry.date}</span>
                    </div>
                    <p className="text-[13px] text-white/65 italic leading-relaxed">"{entry.text}"</p>
                    {entry.reflection && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[11px] text-[#c9983e] font-mono uppercase mb-1 font-bold">Reflexão Pastoral</p>
                        <p className="text-[12px] text-white/40 leading-relaxed">{entry.reflection}</p>
                        {entry.prayerFocus && (
                          <p className="text-[11px] text-indigo-300/70 font-mono italic mt-1.5">{entry.prayerFocus}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Auth actions */}
              {pilgrimUser ? (
                <button
                  onClick={logoutPilgrim}
                  className="w-full mt-5 py-3 bg-white/5 border border-white/5 rounded-xl text-[13px] text-white/30"
                >
                  Sair da conta
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full mt-5 py-3 bg-white/5 border border-white/5 rounded-xl text-[13px] text-white/50"
                >
                  Entrar para sincronizar dados
                </button>
              )}
            </div>
          )}

        </div>

        {/* ══ FIXED BOTTOM NAVIGATION ══ */}
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0d0a06]/95 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-[440px] mx-auto flex items-center justify-around px-2 pt-2 pb-4">
            {[
              { label: "Início", icon: Home, idx: 0 },
              { label: "Explorar", icon: Search, idx: 1 },
              { label: "Jornadas", icon: Wind, idx: 2 },
              { label: "Comunidade", icon: Users, idx: 3 },
              { label: "Perfil", icon: User, idx: 4 }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeWebTab === tab.idx;
              return (
                <button
                  key={tab.idx}
                  onClick={() => setActiveWebTab(tab.idx)}
                  className="flex flex-col items-center gap-1 py-1 px-4 transition-all active:scale-90"
                >
                  <Icon className={`w-[22px] h-[22px] transition-colors ${active ? "text-[#d4a540]" : "text-white/25"}`} />
                  <span className={`text-[10px] font-medium transition-colors ${active ? "text-[#d4a540]" : "text-white/25"}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

      </div>

      {/* ══ AUTH MODAL ══ */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}>
          <div className="bg-[#1c1409] border border-white/10 rounded-3xl p-6 w-full max-w-[440px] space-y-5 mb-2">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-[#2a1b05] rounded-2xl flex items-center justify-center text-[#d4a540] font-serif text-2xl mx-auto shadow-lg">
                ✝
              </div>
              <h3 className="text-[18px] font-serif font-semibold text-white mt-2">Bem-vindo ao Santuário</h3>
              <p className="text-[12px] text-white/40 max-w-xs mx-auto leading-relaxed">
                Entre para salvar suas orações, sincronizar seu diário e clamar com outros fiéis.
              </p>
            </div>

            <button
              onClick={async () => {
                setIsAuthSubmitting(true);
                try { await loginWithGoogle(); setShowAuthModal(false); } catch {} finally { setIsAuthSubmitting(false); }
              }}
              disabled={isAuthSubmitting}
              className="w-full py-3 bg-white border border-white/20 rounded-xl font-bold text-[13px] text-slate-800 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            >
              {isAuthSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <span className="text-[#db4437] font-black">G</span>}
              <span>Continuar com Google</span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-white/20">
              <div className="flex-1 h-px bg-white/10" />
              <span>ou entre com e-mail</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={authNameInput}
                onChange={(e) => setAuthNameInput(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20"
              />
              <input
                type="email"
                value={authEmailInput}
                onChange={(e) => setAuthEmailInput(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20"
              />
              <button
                onClick={async () => {
                  if (!authEmailInput || !authNameInput) return;
                  setIsAuthSubmitting(true);
                  try { await loginWithEmailSimulated(authEmailInput, authNameInput); setShowAuthModal(false); } catch {} finally { setIsAuthSubmitting(false); }
                }}
                disabled={isAuthSubmitting || !authEmailInput.trim() || !authNameInput.trim()}
                className="w-full py-3 bg-[#d4a540] hover:bg-[#c99830] text-[#1a0e00] transition-all disabled:opacity-40 rounded-xl font-bold text-[14px] active:scale-[0.98]"
              >
                Entrar no Santuário
              </button>
            </div>

            <p className="text-[10px] text-center text-white/15 font-mono">
              Conexão segura e privada
            </p>
          </div>
        </div>
      )}

      {/* ══ SUBSCRIPTION MODAL ══ */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-end justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowSubscriptionModal(false)}>
          <div className="bg-[#1c1409] border border-amber-500/15 rounded-3xl p-6 w-full max-w-[440px] space-y-5 mb-2">

            {!isCheckoutFinished ? (
              <>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-widest">
                    ⭐ Aliança Premium
                  </span>
                  <h3 className="text-[20px] font-serif font-bold text-white tracking-tight mt-2">Apoie a Missão</h3>
                  <p className="text-[12px] text-white/40 max-w-sm mx-auto leading-relaxed mt-1">
                    Vozes contemplativas, jornadas profundas, aconselhamento pastoral e o Santuário completo.
                  </p>
                </div>

                {/* Plans */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "mensal" as const, label: "Semeador", price: "R$ 14,90", period: "/mês", badge: "" },
                    { id: "anual" as const, label: "Aliança", price: "R$ 99,00", period: "/ano", badge: "45% off" }
                  ].map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                        selectedPlanId === plan.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute top-0 right-0 bg-amber-500 text-[#1a0e00] text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                          {plan.badge}
                        </span>
                      )}
                      <p className="font-serif font-semibold text-[14px] text-white">{plan.label}</p>
                      <div className="mt-3">
                        <span className="text-[18px] font-bold font-serif text-white">{plan.price}</span>
                        <span className="text-[11px] text-white/35 font-mono">{plan.period}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment */}
                <div className="bg-black/20 rounded-2xl p-4 space-y-3">
                  <div className="flex gap-3 border-b border-white/5 pb-3">
                    {(["pix", "cartao"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`text-[12px] font-mono font-bold uppercase pb-1 border-b-2 transition-all ${
                          paymentMethod === m ? "border-amber-400 text-amber-400" : "border-transparent text-white/30"
                        }`}
                      >
                        {m === "pix" ? "PIX" : "Cartão"}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="space-y-3">
                      <p className="text-[11px] text-white/30 font-mono break-all bg-black/30 p-3 rounded-xl">
                        00020126360014br.gov.bcb.pix0114santuario5583728192019aliamcapremium
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { navigator.clipboard.writeText("00020126360014br.gov.bcb.pix0114santuario5583728192019aliamcapremium"); setSimulatedPixCopied(true); setTimeout(() => setSimulatedPixCopied(false), 2000); }}
                          className="flex-1 py-2.5 border border-white/10 rounded-xl text-[12px] text-white/50 font-mono font-bold"
                        >
                          {simulatedPixCopied ? "Copiado ✓" : "Copiar PIX"}
                        </button>
                        <button
                          onClick={handleUpgradeToPremium}
                          disabled={isCheckoutProcessing}
                          className="flex-1 py-2.5 bg-[#d4a540] text-[#1a0e00] rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
                        >
                          {isCheckoutProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input type="text" value={ccNumber} onChange={(e) => setCcNumber(e.target.value)} placeholder="Número do cartão" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={ccExp} onChange={(e) => setCcExp(e.target.value)} placeholder="MM/AA" className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20" />
                        <input type="text" value={ccCvv} onChange={(e) => setCcCvv(e.target.value)} placeholder="CVV" className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20" />
                      </div>
                      <input type="text" value={ccName} onChange={(e) => setCcName(e.target.value)} placeholder="Nome no cartão" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#d4a540]/40 placeholder:text-white/20" />
                      <button
                        onClick={handleUpgradeToPremium}
                        disabled={isCheckoutProcessing || !ccNumber || !ccName}
                        className="w-full py-3 bg-[#d4a540] text-[#1a0e00] font-bold rounded-xl text-[14px] disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {isCheckoutProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processando…</span></> : "Confirmar Pagamento"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 text-2xl mx-auto">✓</div>
                <div>
                  <h3 className="text-[20px] font-serif font-bold text-white">Aliança Consagrada!</h3>
                  <p className="text-[12px] text-white/40 max-w-xs mx-auto leading-relaxed mt-1">
                    Bem-vindo ao Santuário Premium, {userName}! Todas as funcionalidades estão liberadas para você.
                  </p>
                </div>
                <button
                  onClick={() => { setShowSubscriptionModal(false); setIsCheckoutFinished(false); }}
                  className="py-3 px-8 bg-[#d4a540] text-[#1a0e00] rounded-2xl text-[14px] font-bold"
                >
                  Entrar no Santuário
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
