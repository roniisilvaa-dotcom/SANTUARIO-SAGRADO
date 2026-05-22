import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Heart, 
  BookOpen, 
  Wind, 
  Flame, 
  PenTool, 
  History, 
  User, 
  Compass, 
  Check, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Volume2, 
  VolumeX, 
  Trash2,
  Calendar,
  AlertCircle,
  Plus,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Star,
  Maximize2,
  Minimize2,
  Layers,
  MapPin,
  Clock,
  Shield,
  HelpCircle,
  Lock,
  Compass as CompassIcon,
  ChevronDown,
  Monitor
} from "lucide-react";
import { ExperienceData, JournalEntry, UserProfile, EmotionOption, PrayerRequest } from "./types";
import AmbientSoundPlayer from "./components/AmbientSoundPlayer";
import { SUPPORTED_EMOTIONS } from "./components/SoulCheckIn";
import {
  isRealFirebase,
  registerAuthStateListener,
  loginWithGoogle,
  loginWithEmailSimulated,
  logoutPilgrim,
  updatePilgrimProfile,
  getDiaryEntries,
  addDiaryEntry,
  deleteDiaryEntry,
  getCommunalPrayers,
  addCommunalPrayer,
  clickPrayerAmen,
} from "./lib/firebase";

const mountainSunset = "/src/assets/images/santuario_mountain_sunset_1779406835686.png";
const forestRiver = "/src/assets/images/santuario_forest_river_1779406851043.png";

export default function App() {
  // Navigation states
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("santuario_username") || "João";
  });
  const [activeScreenIndex, setActiveScreenIndex] = useState<number>(0); // active screen index inside visual simulator
  const [viewMode, setViewMode] = useState<"grid" | "immersive" | "web">("web"); // grid = 5 phones; immersive = single device; web = raw full screen pages!
  const [activeWebTab, setActiveWebTab] = useState<number>(0); // 0 to 4 corresponding to full-size pages

  // Unified persistent states shared across all layouts
  const [selectedEmotionId, setSelectedEmotionId] = useState<string>("ansiedade");
  const [likedVerse, setLikedVerse] = useState<boolean>(false);
  const [todayRating, setTodayRating] = useState<number>(5);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioProgressSeconds, setAudioProgressSeconds] = useState<number>(157); // 02:37 simulation
  const [hasCompletedCheckIn, setHasCompletedCheckIn] = useState<boolean>(false);

  // New Authentic users & signatures state managers
  const [pilgrimUser, setPilgrimUser] = useState<any | null>(null);
  const [pilgrimProfile, setPilgrimProfile] = useState<UserProfile | null>(null);
  
  // Custom dialog togglers
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [activeDiarySubTab, setActiveDiarySubTab] = useState<"memorial" | "mural" | "pastor">("memorial");

  // Sign-in controls
  const [authEmailInput, setAuthEmailInput] = useState<string>("");
  const [authNameInput, setAuthNameInput] = useState<string>("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  // Subscription gateways parameters
  const [selectedPlanId, setSelectedPlanId] = useState<"mensal" | "anual">("anual");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao">("pix");
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState<boolean>(false);
  const [isCheckoutFinished, setIsCheckoutFinished] = useState<boolean>(false);
  const [simulatedPixCopied, setSimulatedPixCopied] = useState<boolean>(false);

  // Simulated credit card params
  const [ccNumber, setCcNumber] = useState<string>("");
  const [ccName, setCcName] = useState<string>("");
  const [ccExp, setCcExp] = useState<string>("");
  const [ccCvv, setCcCvv] = useState<string>("");

  // Communal live prayer feed items
  const [communalPrayersList, setCommunalPrayersList] = useState<PrayerRequest[]>([]);
  const [newPrayerText, setNewPrayerText] = useState<string>("");
  const [isPublishingPrayer, setIsPublishingPrayer] = useState<boolean>(false);

  // Chat/Pastoral Counseling interactive states (Premium item)
  const [pastorChatText, setPastorChatText] = useState<string>("");
  const [pastorChatDialog, setPastorChatDialog] = useState<{ role: "pilgrim" | "pastor"; text: string }[]>([
    { role: "pastor", text: "Graça e paz, meu irmão. Que bom termos este momento. Como posso clamar a Deus junto com você hoje ou esclarecer alguma passagem das escrituras?" }
  ]);
  const [isPastorAnswering, setIsPastorAnswering] = useState<boolean>(false);

  // Spoken prayer vocal speech synthesis system
  const [voiceRate, setVoiceRate] = useState<number>(0.75); // extra serene, very calm and passive slow speed
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<"female" | "male">("male");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  // Custom prayer notes
  const [customPrayerNote, setCustomPrayerNote] = useState<string>("");

  // Custom diary entries list
  const [diaryEntries, setDiaryEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem("santuario_diary_gold");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "1",
        date: "21 Mai, 23:31",
        text: "É impressionante como Deus sempre fala comigo exatamente no momento em que eu mais preciso. Hoje aprendi a descansar mais em Suas promessas e a acalmar os ruídos da minha alma.",
        emotion: "ansiedade",
        reflection: "Deus cuida de você de maneira inteiramente pessoal. No silêncio, a voz de Dele se torna mais nítida.",
        prayerFocus: "Descanse na promessa de Filipenses 4:7"
      }
    ];
  });
  const [newJournalText, setNewJournalText] = useState<string>("");
  const [isGeneratingExperience, setIsGeneratingExperience] = useState<boolean>(false);
  const [experienceData, setExperienceData] = useState<ExperienceData>({
    prayer: "Pai, Entrego a Ti todas as minhas preocupações e ansiedades. Tu conheces meu coração e sabes o que preciso. Acalma minha alma e me faz confiar mais in Ti. Em nome de Jesus, Amém.",
    verse: {
      reference: "Salmos 37:5",
      text: "Entrega o teu caminho ao Senhor; confia nele, e o mais Ele fará.",
      explanation: "Entregar o caminho significa descansar sabendo que os tempos e as estações estão sob a soberania amorosa do Pai."
    },
    devotional: "Muitas vezes corremos com nossos próprios pés tentando resolver mistérios divinos. Hoje, Jesus lhe chama para uma pausa restauradora. Deixe que a frequência do Seu Espírito acalme seus ombros.",
    breathExercise: "Inspire o sopro de vida por 4 segundos... segure em reverência... solte suavemente entregando as preocupações."
  });

  const [streakCount, setStreakCount] = useState<number>(12); // Simulated streak

  // Premium gate state resolver
  const isPremiumActive = () => {
    return pilgrimProfile?.subscriptionStatus === "premium";
  };

  // Synchronous authentications state registration
  useEffect(() => {
    const unsubscribe = registerAuthStateListener((user, profile) => {
      setPilgrimUser(user);
      setPilgrimProfile(profile);
      if (profile) {
        setUserName(profile.name);
        setStreakCount(profile.streak || 1);
        
        // Sync diary entries in real-time from Firestore!
        getDiaryEntries(user.uid || "mock_user_uid").then((entries) => {
          if (entries && entries.length > 0) {
            setDiaryEntries(entries);
          }
        });
      } else {
        setUserName("João");
        setDiaryEntries([
          {
            id: "1",
            date: "21 Mai, 23:31",
            text: "É impressionante como Deus sempre fala comigo exatamente no momento em que eu mais preciso. Hoje aprendi a descansar mais em Suas promessas e a acalmar os ruídos da minha alma.",
            emotion: "ansiedade",
            reflection: "Deus cuida de você de maneira inteiramente pessoal. No silêncio, a voz de Dele se torna mais nítida.",
            prayerFocus: "Descanse na promessa de Filipenses 4:7"
          }
        ]);
      }
    });

    // Load initial community prayers
    getCommunalPrayers().then((prPrayers) => {
      setCommunalPrayersList(prPrayers);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Subscribe plan action helper
  const handleUpgradeToPremium = async () => {
    const uid = pilgrimUser?.uid || "mock_user_uid";
    const updatedProfile: UserProfile = {
      ...(pilgrimProfile || { name: userName, email: "peregrino@santuario.app", joinedDate: new Date().toISOString(), streak: streakCount }),
      subscriptionStatus: "premium" as "premium" | "free"
    };

    setIsCheckoutProcessing(true);
    setTimeout(async () => {
      try {
        await updatePilgrimProfile(uid, updatedProfile);
        setPilgrimProfile(updatedProfile);
        setIsCheckoutProcessing(false);
        setIsCheckoutFinished(true);
      } catch (err) {
        console.error("Upgrade error:", err);
        setIsCheckoutProcessing(false);
      }
    }, 2200); // celestial simulated transaction time
  };

  // Custom AI pastoral advisory system
  const handleSendPastorMessage = () => {
    if (!pastorChatText.trim()) return;
    
    // Premium Wall: Pastoral feedback is locked for non-premium
    if (!isPremiumActive()) {
      setShowSubscriptionModal(true);
      return;
    }

    const pilgrimMessage = { role: "pilgrim" as "pilgrim" | "pastor", text: pastorChatText };
    setPastorChatDialog(prev => [...prev, pilgrimMessage]);
    setPastorChatText("");
    setIsPastorAnswering(true);

    setTimeout(() => {
      const responses = [
        "Glorificado seja o Deus de toda consolação. Compreendo a profundidade do seu coração. Lembre-se que no Salmo 119:105 está escrito: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho'. Continue buscando-O fielmente neste vale silencioso.",
        "Que o Senhor te guie com águas tranquilas e refrigere tua alma. O jejum da carne e o clamar sincero atraem as misericórdias do Altíssimo, que nunca está longe daqueles que têm o coração quebrantado.",
        "Meu amado peregrino, a paciência na provação gera a esperança que não frustra. Nas palavras do apóstolo Paulo no livro de Romanos 5:3-5, nos gloriamos nas próprias tribulações, sabendo que a tribulação produz perseverança, a perseverança produz experiência, e a experiência esperança."
      ];
      const randomResponse = { role: "pastor" as "pilgrim" | "pastor", text: responses[Math.floor(Math.random() * responses.length)] };
      setPastorChatDialog(prev => [...prev, randomResponse]);
      setIsPastorAnswering(false);
    }, 1800);
  };

  // Shared prayer request operations
  const handlePublishCommunalPrayer = async () => {
    if (!newPrayerText.trim()) return;
    setIsPublishingPrayer(true);
    try {
      const activeAuthorId = pilgrimUser?.uid || "mock_user_uid";
      const activeAuthorName = pilgrimProfile?.name || userName || "Anônimo";
      const added = await addCommunalPrayer(newPrayerText, activeAuthorId, activeAuthorName);
      setCommunalPrayersList(prev => [added, ...prev]);
      setNewPrayerText("");
    } catch (e) {
      console.error("Error creating prayer:", e);
    } finally {
      setIsPublishingPrayer(false);
    }
  };

  const handleAmenClick = async (prayerId: string) => {
    const activeUserId = pilgrimUser?.uid || "mock_user_uid";
    try {
      await clickPrayerAmen(prayerId, activeUserId);
      setCommunalPrayersList(prev => prev.map(p => {
        if (p.id === prayerId) {
          if (p.amens?.includes(activeUserId)) {
            return p;
          }
          return {
            ...p,
            amenCount: p.amenCount + 1,
            amens: [...(p.amens || []), activeUserId]
          };
        }
        return p;
      }));
    } catch (err) {
      console.error("Error amening prayer:", err);
    }
  };

  // Load available speech synthesis voices in browser
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Voice reader engine synced with isAudioPlaying status
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      
      const prayText = experienceData.prayer || "";
      const textToSpeak = `${prayText}. Que esta oração acalme seu coração. Considere também nosso devocional contemplativo de hoje: ${experienceData.devotional}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "pt-BR";
      utterance.rate = voiceRate;
      utterance.pitch = selectedVoiceGender === "male" ? 0.85 : 1.1;

      // Select Portuguese voice preferencing matches
      const ptVoices = availableVoices.filter(v => v.lang.includes("pt-BR") || v.lang.includes("pt_BR") || v.lang.includes("pt"));
      if (ptVoices.length > 0) {
        const genderVoice = ptVoices.find(v => {
          const name = v.name.toLowerCase();
          if (selectedVoiceGender === "male") {
            return name.includes("daniel") || name.includes("felipe") || name.includes("silva") || name.includes("google português") || name.includes("male") || name.includes("masculino");
          } else {
            return name.includes("luciana") || name.includes("marinha") || name.includes("maria") || name.includes("francisca") || name.includes("female") || name.includes("feminino");
          }
        });
        utterance.voice = genderVoice || ptVoices[0];
      }

      utterance.onboundary = (event) => {
        // approximate progress timeline slider
        const ratio = event.charIndex / textToSpeak.length;
        setAudioProgressSeconds(Math.floor(ratio * 720));
      };

      utterance.onend = () => {
        setIsAudioPlaying(false);
        setAudioProgressSeconds(720);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isAudioPlaying, experienceData, voiceRate, selectedVoiceGender, availableVoices]);

  // Saving state
  useEffect(() => {
    localStorage.setItem("santuario_diary_gold", JSON.stringify(diaryEntries));
  }, [diaryEntries]);

  // Sync index and tabs when active page matches
  const handlePageSelectWithSync = (idx: number) => {
    setActiveScreenIndex(idx);
    setActiveWebTab(idx);
  };

  // Audio timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAudioPlaying) {
      interval = setInterval(() => {
        setAudioProgressSeconds((prev) => {
          if (prev >= 720) return 0; // Reset at 12:00
          return prev + 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAudioPlaying]);

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Trigger real-time Gemini generation when feelings are confirmed
  const generateContemplativePath = async (emotionId: string) => {
    setIsGeneratingExperience(true);
    const emotionObj = SUPPORTED_EMOTIONS.find(emp => emp.id === emotionId) || SUPPORTED_EMOTIONS[0];
    
    try {
      const response = await fetch("/api/experience/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: emotionObj.label,
          notes: customPrayerNote || "Fé e silêncio diante d'O Senhor."
        })
      });
      const data = await response.json();
      if (response.ok && data.prayer) {
        setExperienceData(data);
        setHasCompletedCheckIn(true);
        // Automatically transition into Page 3 (Sua Experiência)
        setActiveScreenIndex(2);
        setActiveWebTab(2);
      } else {
        throw new Error("Fallback para oratória local...");
      }
    } catch (err) {
      console.log("Tratamento de fallback teológico...", err);
      // Construct a very sweet personalized fallback
      setExperienceData({
        prayer: `Pai benevolente, entrego a Ti toda a aridez e as aflições de ${userName}. Sinto de perto o fardo de '${emotionObj.label}', mas compreendo que debaixo de Tuas asas há abrigo definitivo. Renova meu fôlego, preenche de paz este coração meditativo e concede discernimento espiritual. Amém.`,
        verse: {
          reference: emotionId === "ansiedade" ? "Filipenses 4:6-7" : "Isaías 40:31",
          text: emotionId === "ansiedade" 
            ? "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças."
            : "Mas os que esperam no Senhor renovam as suas forças, sobem com asas como águias, correm e não se cansam, caminham e não se fatigam.",
          explanation: "Este versículo nos convida a transferir o peso do controle das nossas mãos humanas e limitadas para o Senhor compassivo."
        },
        devotional: `Quando confessamos viver sob a atmosfera de ${emotionObj.label}, estamos declarando nossa necessidade vital do Criador. Deixe as ondas do silêncio conduzirem hoje as batidas do seu peito e repouse em sua promessa santa.`,
        breathExercise: "Sente-se de maneira confortável... Sintonize o barulho das águas... Inspire sentindo o amor redentor... Expire rejeitando todas as tensões."
      });
      setHasCompletedCheckIn(true);
      setActiveScreenIndex(2); // Move to experience result
      setActiveWebTab(2);
    } finally {
      setIsGeneratingExperience(false);
      setCustomPrayerNote("");
    }
  };

  // Submit manual diary text
  const handleAddNewDiaryText = async () => {
    if (!newJournalText.trim()) return;
    const date = new Date();
    const formattedDate = `${date.getDate()} ${date.toLocaleString("pt-BR", { month: "short" })}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const newId = Date.now().toString();

    // Context analysis to simulate high fidelity pastoral advisor
    const option = SUPPORTED_EMOTIONS.find(emp => emp.id === selectedEmotionId) || SUPPORTED_EMOTIONS[0];
    const newEntry: JournalEntry = {
      id: newId,
      date: formattedDate,
      text: newJournalText,
      emotion: selectedEmotionId,
      reflection: `Que benção poder te ouvir, ${userName}. Ao registrar que se sente sob ${option.label}, saiba que o Senhor intercede com gemidos inexprimíveis. A sua oração sincera subiu como incenso agradável. Encontre fortaleza na leitura de Salmos hoje à noite.`,
      prayerFocus: `Aquiete-se e saiba que Ele é Deus. (Salmo 46:10)`
    };

    const updated = [newEntry, ...diaryEntries];
    setDiaryEntries(updated);
    setNewJournalText("");
    
    const nextStreak = streakCount + 1;
    setStreakCount(nextStreak); // Earn streak directly!

    // Sync to Firestore if signed in
    if (pilgrimUser) {
      const uid = pilgrimUser.uid || "mock_user_uid";
      try {
        await addDiaryEntry(uid, newEntry);
        await updatePilgrimProfile(uid, {
          streak: nextStreak,
          lastCheckIn: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error syncing diary reflection to Firestore:", err);
      }
    }
  };

  const getActiveEmotionObject = () => {
    return SUPPORTED_EMOTIONS.find(emp => emp.id === selectedEmotionId) || SUPPORTED_EMOTIONS[0];
  };

  return (
    <div className="min-h-screen bg-[#edeae4] text-[#0A0D14] flex flex-col items-center p-3 md:p-8 font-sans overflow-x-hidden selection:bg-[#d5b075]/30">
      
      {/* Visual Navigation Header */}
      <header className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#0A0D14]/15 pb-4 mb-6 z-10" id="main-global-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#121622] to-[#242b3d] flex items-center justify-center text-[#d5b075] shadow-md font-serif text-lg font-bold">
            ✝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-semibold tracking-tight text-[#121622]">Santuário Sagrado</h1>
              <span className="text-[9px] bg-[#d5b075]/20 text-[#a07a3c] border border-[#d5b075]/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Premium</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Plataforma Contemplativa de Comunhão Cristã</p>
          </div>
        </div>

        {/* Global Controls & Layout Switchers */}
        <div className="flex flex-wrap items-center gap-3" id="header-interactive-menu">
          
          {/* Quick User Identification field */}
          <div className="flex items-center gap-2 bg-white/80 border border-slate-300 py-1.5 px-3 rounded-xl text-xs shadow-sm" id="quick-user-box">
            <span className="font-mono text-[9px] text-[#0A0D14]/50 uppercase font-bold">Peregrino:</span>
            <input 
              id="global-input-username"
              type="text" 
              value={userName} 
              onChange={(e) => {
                setUserName(e.target.value);
                localStorage.setItem("santuario_username", e.target.value);
              }}
              className="font-bold bg-transparent border-none outline-none focus:ring-0 p-0 text-xs w-24 text-[#b89150] focus:border-b focus:border-[#d5b075]" 
              placeholder="Alterar nome"
            />
          </div>

          <div className="bg-[#121622]/5 p-0.5 rounded-2xl border border-slate-300 flex items-center shadow-inner">
            <button
              id="switch-view-web"
              onClick={() => setViewMode("web")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "web" 
                  ? "bg-[#121622] text-[#e0b468] shadow-md" 
                  : "text-slate-600 hover:text-[#121622]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Experiência Web Completa</span>
            </button>
            <button
              id="switch-view-grid"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "grid" 
                  ? "bg-[#121622] text-[#e0b468] shadow-md" 
                  : "text-slate-600 hover:text-[#121622]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sinfonia de Telas</span>
            </button>
            <button
              id="switch-view-immersive"
              onClick={() => setViewMode("immersive")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "immersive" 
                  ? "bg-[#121622] text-[#e0b468] shadow-md" 
                  : "text-slate-600 hover:text-[#121622]"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Simulador</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hidden audio element triggers the ambient synthesizer based on emotion */}
      <div className="w-full max-w-7xl mb-2 text-[#edeae4] overflow-hidden rounded-xl">
        <AmbientSoundPlayer currentAmbient={getActiveEmotionObject().ambientSound} autoPlayTrigger={isAudioPlaying} />
      </div>

      {/* PRIMARY CONTROLLER DECISION GRID */}
      <main className="w-full max-w-7xl flex flex-col items-center justify-center flex-1 my-2 z-10" id="main-screens-arena">
        
        {viewMode === "web" ? (
          /* ========================================================
             THE "EXPERIÊNCIA WEB COMPLETA": WIDESCREEN IMMERSIVE PAGES
             ======================================================== */
          <div className="w-full bg-[#121622] text-slate-100 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col lg:flex-row min-h-[640px]" id="web-applet-immersive">
            
            {/* Sidebar navigation corresponding to the 5 gorgeous pages */}
            <nav className="w-full lg:w-72 bg-slate-950/40 border-b lg:border-b-0 lg:border-r border-white/5 p-6 flex flex-col justify-between shrink-0" id="web-sidebar">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[9px] font-mono tracking-widest text-[#d5b075] uppercase font-bold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Templo de Presença</span>
                  </div>
                  <h3 className="text-lg font-serif font-semibold text-white mt-1">Olá, {userName}</h3>
                  <div className="flex items-center gap-1.5 mt-2 bg-white/5 py-1 px-3.5 rounded-full border border-white/10 text-xs w-fit">
                    <Flame className="w-4 h-4 text-orange-400 fill-current" />
                    <span className="font-bold text-[#fbcfe8] font-mono">{streakCount} Dias de Fé</span>
                  </div>
                </div>

                <div className="space-y-1" id="web-nav-links">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono pl-2 mb-2">Liturgia Diária</p>
                  
                  {[
                    { title: "Início / Portal", desc: "Acolhimento & Palavra diária", icon: CompassIcon, badgeBg: "bg-indigo-500/20 text-indigo-300" },
                    { title: "Exame da Alma", desc: "Check-in íntimo de aflições", icon: Sparkles, badgeBg: "bg-fuchsia-500/20 text-fuchsia-300" },
                    { title: "Respire Fundo", desc: "Tempo de silêncio santo", icon: Wind, badgeBg: "bg-teal-500/20 text-teal-300" },
                    { title: "Oração Guiada", desc: "Cura pastoral em áudio", icon: Play, badgeBg: "bg-amber-500/20 text-amber-300" },
                    { title: "Diário de Fé", desc: "Memorial de reflexões e dores", icon: PenTool, badgeBg: "bg-sky-500/20 text-sky-300" }
                  ].map((tab, idx) => {
                    const isActive = activeWebTab === idx;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={idx}
                        id={`web-nav-tab-${idx}`}
                        onClick={() => handlePageSelectWithSync(idx)}
                        className={`w-full text-left p-3 rounded-2xl flex items-start gap-3.5 transition-all outline-none ${
                          isActive 
                            ? "bg-white/10 text-white border-l-4 border-[#d5b075]" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className={`p-2 rounded-xl mt-0.5 ${isActive ? 'bg-[#d5b075]/20 text-[#d5b075]' : 'bg-slate-900 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className={`text-xs font-semibold leading-none ${isActive ? 'text-white' : 'text-slate-300'}`}>{tab.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1 truncate leading-none">{tab.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar bottom indicators */}
              <div className="mt-8 pt-4 border-t border-white/5 space-y-3" id="sidebar-footer-widget" style={{ fontSize: "10px", fontFamily: "monospace" }}>
                
                {/* Simulated / Real State Status */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold text-slate-500">
                    <span>Espaço de Fé</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-normal font-sans">
                    {pilgrimUser ? (
                      <div className="space-y-1">
                        <p className="font-serif text-[#d5b075] font-semibold">Peregrino: {pilgrimProfile?.name}</p>
                        <button
                          id="btn-logout"
                          onClick={() => {
                            logoutPilgrim();
                          }}
                          className="text-[9px] font-mono text-slate-400 hover:text-white underline uppercase tracking-wider"
                        >
                          Trocar de Altar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-slate-400">Inicie sua jornada integrada:</p>
                        <button
                          id="btn-login-sidebar"
                          onClick={() => setShowAuthModal(true)}
                          className="w-full py-1.5 px-3 bg-[#d5b075] hover:bg-[#cbad70] text-slate-950 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
                        >
                          Entrar / Registrar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Premium Gateway Trigger */}
                <div className="p-3 bg-gradient-to-r from-amber-500/10 to-red-500/5 rounded-xl border border-amber-500/15 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold text-amber-500">
                    <span>Missão Semeador</span>
                    <span>⭐</span>
                  </div>
                  <div className="text-[10px] font-sans leading-normal">
                    {isPremiumActive() ? (
                      <p className="text-emerald-400 font-serif italic text-center py-1">"Aliança Ativa. Que a graça transborde!"</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-slate-400 leading-relaxed mb-2">Libere vozes e aconselhamento especializado: </p>
                        <button
                          id="btn-upgrade-sidebar"
                          onClick={() => setShowSubscriptionModal(true)}
                          className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider hover:scale-102 transition-all block text-center"
                        >
                          Apoiar a Missão
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criptografia de Alma Ativa</span>
                </div>
                <div className="p-2 bg-slate-950/40 rounded-lg border border-white/5">
                  <p className="text-[8px] text-[#d5b075] font-mono uppercase font-bold leading-none">Ambiente Ativo:</p>
                  <p className="text-[10px] text-slate-300 font-serif font-semibold mt-1 italic leading-none">"{getActiveEmotionObject().label}"</p>
                </div>
              </div>

            </nav>

            {/* Core Immersive Content Area depending on dynamic tab selection */}
            <div className="flex-1 flex flex-col justify-between min-h-0 relative min-h-[580px]" id="web-page-theater">
              
              {activeWebTab === 0 && (
                /* ========================================================
                   PAGE 1 Full-screen widescreen: INÍCIO / BIENVENIDO
                   ======================================================== */
                <div className="flex-1 flex flex-col justify-between p-8 md:p-12 relative min-h-full" id="web-page-home">
                  
                  {/* Backdrop mountain background */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={mountainSunset} 
                      alt="Encontro Sagrado" 
                      className="w-full h-full object-cover opacity-35 filter brightness-75"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121622] via-[#121622]/40 to-[#121622]/85"></div>
                  </div>

                  <div className="relative z-10 space-y-8 max-w-2xl">
                    <div className="space-y-2">
                      <span className="px-3 py-1 bg-[#d5b075]/15 border border-[#d5b075]/35 text-[#d5b075] rounded-full text-[10px] font-mono uppercase font-bold tracking-widest inline-block">
                        Refúgio Contemplativo Cristão
                      </span>
                      <h2 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-white leading-tight">
                        Bom dia, {userName} 👋
                      </h2>
                      <p className="text-base text-slate-300 italic max-w-xl leading-relaxed">
                        Que a maravilhosa graça e a paz do Senhor Jesus estejam cobrindo seu coração nesta manhã. Faça uma pausa e reserve um instante santo de descanso.
                      </p>
                    </div>

                    {/* Versículo do dia widescreen layout */}
                    <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl" id="web-home-verse-banner">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#d5b075]" />
                          <span className="text-[10px] font-mono tracking-widest text-[#d5b075] uppercase font-bold">A Escrita Sagrada</span>
                        </div>
                        <button
                          id="btn-web-heart-toggle"
                          onClick={() => setLikedVerse(!likedVerse)}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-xs text-slate-300 transition-all border border-white/5"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedVerse ? 'fill-current text-rose-500' : 'text-slate-400'}`} />
                          <span>{likedVerse ? "Salvo no Memorial" : "Favoritar"}</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xl font-serif text-slate-100 leading-relaxed italic pr-4">
                          "{experienceData.verse.text}"
                        </p>
                        <p className="text-xs text-slate-400 font-mono tracking-wider font-semibold">
                          — {experienceData.verse.reference}
                        </p>
                        <p className="text-xs text-slate-300 pt-2 border-t border-white/5 leading-relaxed font-sans text-slate-400">
                          <strong>Exegese teológica:</strong> {experienceData.verse.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fast portal shortcut triggers */}
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 mt-8" id="web-home-shortcuts">
                    {[
                      { icon: Sparkles, color: "text-fuchsia-300 bg-fuchsia-400/10", label: "Realizar Check-In", action: () => handlePageSelectWithSync(1) },
                      { icon: Wind, color: "text-teal-300 bg-teal-400/10", label: "Respirar e Silenciar", action: () => handlePageSelectWithSync(2) },
                      { icon: Play, color: "text-amber-300 bg-amber-400/10", label: "Ouvir Oração Guiada", action: () => handlePageSelectWithSync(3) },
                      { icon: PenTool, color: "text-sky-305 text-sky-300 bg-sky-400/10", label: "Ver Meu Diário", action: () => handlePageSelectWithSync(4) }
                    ].map((shortcut, sIdx) => {
                      const Icon = shortcut.icon;
                      return (
                        <button
                          key={sIdx}
                          id={`btn-web-shortcut-${sIdx}`}
                          onClick={shortcut.action}
                          className="p-4 bg-slate-900/60 border border-white/5 hover:border-white/20 rounded-2xl flex items-center justify-between text-left group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${shortcut.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-serif font-bold text-slate-250 text-slate-200 group-hover:text-white">{shortcut.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white font-bold transition-transform group-hover:translate-x-1" />
                        </button>
                      );
                    })}
                  </div>

                </div>
              )}

              {activeWebTab === 1 && (
                /* ========================================================
                   PAGE 2 Full-screen: EXAME DA ALMA / EMOTIONS GRID
                   ======================================================== */
                <div className="flex-1 flex flex-col justify-between p-8 md:p-12 relative z-10 space-y-6" id="web-page-checkin">
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#d5b075] uppercase font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Diagnóstico Espiritual da Alma
                    </span>
                    <h2 className="text-3xl font-serif font-semibold text-white tracking-tight">
                      Como está o seu coração e a sua alma diante do Pai hoje?
                    </h2>
                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                      Selecione honestamente a aflição, cansaço ou sentimento que mais pesa sobre os seus ombros neste instante. Nossa IA Contemplativa trará uma oração devocional teológica sob medida.
                    </p>
                  </div>

                  {/* Large widescreen grid layout of emotions with hover animations */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="web-checkin-emotions-grid">
                    {SUPPORTED_EMOTIONS.map((emp) => {
                      const isSelected = selectedEmotionId === emp.id;
                      return (
                        <button
                          key={emp.id}
                          id={`web-feeling-card-${emp.id}`}
                          onClick={() => setSelectedEmotionId(emp.id)}
                          className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all relative overflow-hidden h-28 group ${
                            isSelected 
                              ? "bg-slate-900 border-[#d5b075] text-[#d5b075] shadow-lg" 
                              : "bg-slate-950/20 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-2xl">
                              {emp.id === "ansiedade" && "😟"}
                              {emp.id === "cansaço" && "😴"}
                              {emp.id === "solidão" && "🖤"}
                              {emp.id === "culpa" && "😔"}
                              {emp.id === "medo" && "😰"}
                              {emp.id === "direção" && "🧭"}
                              {emp.id === "gratidão" && "🙏"}
                              {emp.id === "confusão" && "🌪️"}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#d5b075]' : 'bg-slate-800'}`}></div>
                          </div>

                          <div className="mt-auto">
                            <span className="text-xs font-serif font-bold block text-white group-hover:text-[#d5b075] transition-colors">{emp.label}</span>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{emp.ambientSound}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rich additional note input area */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-3" id="web-checkin-notes-container">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                      Notas Opcionais (Seu clamor pessoal detalhado):
                    </label>
                    <textarea
                      id="web-input-prayer-note"
                      value={customPrayerNote}
                      onChange={(e) => setCustomPrayerNote(e.target.value)}
                      placeholder="Ex: Sinto-me sobrecarregado com os prazos de trabalho, sinto medo de não dar conta e fraqueza para orar hoje de manhã..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-[#d5b075] resize-none h-16 placeholder:text-slate-500"
                    />
                  </div>

                  {/* CTA confirmation option */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sua privacidade é santa. Seus dados nunca sairão deste navegador.</span>
                    </div>

                    <button
                      id="btn-web-submit-experience"
                      onClick={() => generateContemplativePath(selectedEmotionId)}
                      disabled={isGeneratingExperience}
                      className="py-3.5 px-8 bg-[#d5b075] hover:bg-[#cbad70] active:scale-[0.99] transition-all text-slate-950 font-serif font-bold text-sm rounded-xl flex items-center gap-2.5 shadow-xl cursor-pointer"
                    >
                      {isGeneratingExperience ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Invocando Sabedoria Teológica...</span>
                        </>
                      ) : (
                        <>
                          <span>Receber Minha Experiência Espiritual</span>
                          <ChevronRight className="w-4 h-4 text-slate-950 font-bold" />
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {activeWebTab === 2 && (
                /* ========================================================
                   PAGE 3 Full-screen: RESPIRE FUNDO / EXPERIÊNCIA ATIVA
                   ======================================================== */
                <div className="flex-1 flex flex-col justify-between p-8 md:p-12 relative min-h-full" id="web-page-experiencia">
                  
                  {/* Backdrop river scene */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={forestRiver} 
                      alt="Refúgio da Natureza" 
                      className="w-full h-full object-cover opacity-20 filter brightness-50"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121622] via-[#121622]/40 to-[#121622]/90"></div>
                  </div>

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center flex-1">
                    
                    {/* Left Column: Guidance, breathing simulator and Devocional */}
                    <div className="md:col-span-7 space-y-6">
                      <div className="space-y-2">
                        <span className="px-3 py-1 bg-teal-500/10 border border-teal-400/20 text-[#2dd4bf] rounded-full text-[10px] font-mono uppercase font-bold tracking-widest inline-block">
                          Tempo de Aquietar
                        </span>
                        <h3 className="text-3xl font-serif font-semibold text-white leading-tight">
                          Respire fundo, acalme seus ombros...
                        </h3>
                        <p className="text-xs text-slate-350 leading-relaxed max-w-md">
                          Jesus disse: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei" — Mateus 11:28
                        </p>
                      </div>

                      <div className="bg-slate-950/65 border border-teal-500/10 p-5 rounded-3xl space-y-3" id="web-home-respire-guided">
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-[#2dd4bf] animate-pulse" />
                          <span className="text-[10px] font-mono text-[#2dd4bf] tracking-widest uppercase font-bold">Ciclo Meditativo Alinhado</span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed font-serif italic">
                          "{experienceData.breathExercise}"
                        </p>
                      </div>

                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl" id="web-devocional-card">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Acolhimento Devocional</span>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans mt-1">
                          {experienceData.devotional}
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Beautiful immersive breathing bubble */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-3">
                      
                      <div className="w-52 h-52 rounded-full bg-teal-500/5 border-2 border-dashed border-teal-400/20 flex items-center justify-center p-4 relative animate-pulse" style={{ animationDuration: "4s" }}>
                        <div className="w-full h-full rounded-full bg-teal-500/10 border border-solid border-teal-400/30 flex flex-col items-center justify-center text-center p-4">
                          <Wind className="w-8 h-8 text-[#d5b075] animate-bounce" />
                          <span className="text-xs font-serif font-bold text-white mt-3">Sopro de Vida</span>
                          <span className="text-[9px] text-[#2dd4bf] font-mono tracking-widest uppercase mt-1">Refúgio Silencioso</span>
                        </div>
                      </div>

                      <button
                        id="btn-web-go-player-direct"
                        onClick={() => handlePageSelectWithSync(3)}
                        className="mt-6 py-2.5 px-6 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-300 flex items-center gap-2"
                      >
                        <span>IR PARA O PLAYER</span>
                        <ChevronRight className="w-4 h-4 text-[#d5b075]" />
                      </button>

                    </div>

                  </div>

                </div>
              )}

              {activeWebTab === 3 && (
                /* ========================================================
                   PAGE 4 Full-screen: ORAÇÃO GUIADA / CENOGRAPHIC PLAYER
                   ======================================================== */
                <div className="flex-1 flex flex-col justify-between p-8 md:p-12 relative z-10" id="web-page-player">
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center flex-1">
                    
                    {/* Left Column: Epic Waveform indicator with spinning elements */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 space-y-6">
                      
                      <div className="relative">
                        {/* Audio animated orbit rings based on play status */}
                        <div className={`w-56 h-56 rounded-full border-2 border-dashed border-[#d5b075]/30 flex items-center justify-center p-3 relative ${isAudioPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: "12s" }}>
                          
                          <div className={`w-full h-full rounded-full border border-double border-[#d5b075]/45 flex items-center justify-center relative p-2 ${isAudioPlaying ? 'animate-pulse' : ''}`}>
                            
                            <div className="w-full h-full rounded-full bg-slate-950/60 flex items-center justify-center">
                              {/* Centered large sacred cross icon */}
                              <div className="font-serif text-5xl font-light text-[#d5b075] drop-shadow-[0_0_15px_rgba(213,176,117,0.8)] animate-pulse">
                                ✝
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Interactive live audio bouncing waves simulator */}
                        {isAudioPlaying && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-45 pointer-events-none w-72 h-72">
                            <span className="w-1.5 bg-[#d5b075] rounded-full animate-bounce h-20" style={{ animationDelay: "0.1s" }} />
                            <span className="w-1.5 bg-[#d5b075] rounded-full animate-bounce h-28" style={{ animationDelay: "0.3s" }} />
                            <span className="w-1.5 bg-[#d5b075] rounded-full animate-bounce h-32" style={{ animationDelay: "0.5s" }} />
                            <span className="w-1.5 bg-[#d5b075] rounded-full animate-bounce h-24" style={{ animationDelay: "0.7s" }} />
                            <span className="w-1.5 bg-[#d5b075] rounded-full animate-bounce h-16" style={{ animationDelay: "0.2s" }} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#d5b075] tracking-widest font-bold uppercase block">Transmissão Ativa</span>
                        <h4 className="text-xl font-serif text-white font-bold leading-none">Oração de Conexão</h4>
                        <p className="text-xs text-slate-550 text-slate-400 font-mono italic mt-1 font-semibold">Foco: {getActiveEmotionObject().label} (12:00 m)</p>
                      </div>

                    </div>

                    {/* Right Column: Player Controls and live prayer script */}
                    <div className="md:col-span-7 space-y-6">
                      
                      <div className="p-6 bg-slate-950/60 border border-white/5 rounded-3xl space-y-4" id="web-audio-transcript-card">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[9px] font-mono text-indigo-300 font-bold uppercase tracking-wider">Acolhimento Pastoral IA</span>
                          <span className="text-[9px] bg-[#d5b075]/15 text-[#d5b075] font-mono px-2 py-0.5 rounded-md uppercase font-semibold">Teor Alinhado</span>
                        </div>

                        {/* Complete generated spiritual prayer scripted fully */}
                        <div className="max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                          <p className="text-base font-serif text-slate-200 leading-relaxed italic pr-4">
                            "{experienceData.prayer}"
                          </p>
                        </div>
                      </div>

                      {/* Interactive controllers and progress bar timeline */}
                      <div className="space-y-4 pt-2">
                        
                        {/* Timeline slider bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                            <span>{formatAudioTime(audioProgressSeconds)}</span>
                            <span>Tempo Total: 12:00</span>
                          </div>

                          <div 
                            id="web-progress-bar-container"
                            className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden relative shadow-inner"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const pct = x / rect.width;
                              setAudioProgressSeconds(Math.floor(pct * 720));
                            }}
                          >
                            <div 
                              className="h-full bg-gradient-to-r from-[#d5b075] to-[#fbcfe8] rounded-full absolute top-0 left-0"
                              style={{ width: `${(audioProgressSeconds / 720) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Player Core Buttons Row */}
                        <div className="flex items-center gap-6 justify-center">
                          <button
                            id="btn-web-rewind-15s"
                            onClick={() => setAudioProgressSeconds(prev => Math.max(0, prev - 15))}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-350 hover:text-white transition-colors"
                            title="Voltar 15s"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>

                          <button
                            id="btn-web-main-play-toggle"
                            onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                            className="w-16 h-16 bg-[#d5b075] hover:bg-[#cbad70] active:scale-95 transition-all text-slate-950 rounded-full flex items-center justify-center shadow-lg"
                          >
                            {isAudioPlaying ? (
                              <Pause className="w-6 h-6 fill-current" />
                            ) : (
                              <Play className="w-[30px] h-[30px] fill-current ml-1" />
                            )}
                          </button>

                          <button
                            id="btn-web-forward-15s"
                            onClick={() => setAudioProgressSeconds(prev => Math.min(720, prev + 15))}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-350 hover:text-white transition-colors"
                            title="Avançar 15s"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Custom configuration for voice text-to-speech */}
                        <div className="bg-slate-900/60 p-4 border border-[#d5b075]/10 rounded-2xl space-y-3 mt-4" id="vocal-reader-setup">
                          <p className="text-[10px] font-mono text-[#d5b075] uppercase tracking-widest font-bold">Configuração da Voz Contemplativa (Falada)</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Voice selector */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-450 text-slate-400 font-sans block">Condutor do Clamor</span>
                              <div className="flex bg-slate-950/60 border border-white/5 rounded-lg p-0.5" id="voice-gender-selector">
                                <button
                                  id="btn-voice-female"
                                  type="button"
                                  onClick={() => setSelectedVoiceGender("female")}
                                  className={`flex-1 py-1 rounded text-[10px] font-medium font-serif transition-colors ${
                                    selectedVoiceGender === "female" ? "bg-[#d5b075] text-slate-950" : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Pastora Luciana
                                </button>
                                <button
                                  id="btn-voice-male"
                                  type="button"
                                  onClick={() => setSelectedVoiceGender("male")}
                                  className={`flex-1 py-1 rounded text-[10px] font-medium font-serif transition-colors ${
                                    selectedVoiceGender === "male" ? "bg-[#d5b075] text-slate-950" : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Pastor Daniel
                                </button>
                              </div>
                            </div>

                            {/* Rate speed selector */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-455 text-slate-400 font-sans block">Cadência de Meditação</span>
                              <div className="flex bg-slate-950/60 border border-white/5 rounded-lg p-0.5" id="voice-rate-selector">
                                <button
                                  id="btn-rate-slow"
                                  type="button"
                                  onClick={() => setVoiceRate(0.75)}
                                  className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                                    voiceRate === 0.75 ? "bg-[#d5b075] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                                  }`}
                                  title="Ritmo contemplativo silencioso"
                                >
                                  0.75x
                                </button>
                                <button
                                  id="btn-rate-normal"
                                  type="button"
                                  onClick={() => setVoiceRate(0.85)}
                                  className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                                    voiceRate === 0.85 ? "bg-[#d5b075] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                                  }`}
                                  title="Recomendado"
                                >
                                  0.85x
                                </button>
                                <button
                                  id="btn-rate-faster"
                                  type="button"
                                  onClick={() => setVoiceRate(1.0)}
                                  className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                                    voiceRate === 1.0 ? "bg-[#d5b075] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  1.00x
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {activeWebTab === 4 && (
                /* ========================================================
                   PAGE 5 Full-screen: MEU DIÁRIO / REFLEXÕES & RECORD
                   ======================================================== */
                <div className="flex-1 flex flex-col justify-between p-8 md:p-12 relative z-10" id="web-page-diario">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 w-full">
                    
                    {/* Left side column: Diary Entry Form & Calendar */}
                    <div className="lg:col-span-6 space-y-6">
                      
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-[#d5b075] tracking-widest font-bold uppercase block">Memorial de Alma</span>
                        <h3 className="text-2xl font-serif text-white font-medium">Registrar Novo Encontro Espiritual</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                          Consagre seus sentimentos íntimos, dore e louve. O conselho pastoral teológico o amparará guiando-o de volta às escrituras originais.
                        </p>
                      </div>

                      {/* Calendar strip bar simulated widescreen */}
                      <div className="bg-slate-950/60 p-4 border border-white/5 rounded-2xl" id="web-calendar-strip">
                        <p className="text-[10px] font-mono text-[#d5b075] tracking-widest font-bold uppercase mb-3">Atividade em Maio 2026</p>
                        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                          {["DOM 18", "SEG 19", "TER 20", "QUA 21", "QUI 22", "SEX 23", "SÁB 24"].map((day, dIdx) => {
                            const isToday = dIdx === 3; // Quarta 21 corresponds to simulated today
                            return (
                              <div 
                                key={dIdx} 
                                className={`p-2 rounded-xl border ${
                                  isToday 
                                    ? 'bg-[#d5b075] text-slate-950 border-[#d5b075] font-bold' 
                                    : 'bg-black/40 text-slate-400 border-white/5'
                                }`}
                              >
                                <span className="block text-[8px] uppercase tracking-tighter leading-none opacity-80">{day.split(" ")[0]}</span>
                                <span className="text-[11px] font-bold mt-1 block leading-none">{day.split(" ")[1]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Text inputs and notes */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-405 text-slate-400 font-bold uppercase">Como foi o seu dia com Deus? Avalie o nível de paz:</label>
                          <div className="flex gap-1.5 py-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button 
                                key={s} 
                                id={`btn-web-diary-rating-${s}`}
                                onClick={() => setTodayRating(s)}
                                className="focus:outline-none"
                              >
                                <Star className={`w-5 h-5 fill-current transition-transform duration-100 hover:scale-110 active:scale-95 ${s <= todayRating ? 'text-[#d5b075]' : 'text-slate-700'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <textarea
                            id="web-diary-text-field"
                            value={newJournalText}
                            onChange={(e) => setNewJournalText(e.target.value)}
                            placeholder="Desabafar liberta a alma... Escreva com sinceridade tudo o que seu coração clama nesta data..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-sans text-white focus:outline-none focus:border-[#d5b075] resize-none h-32 placeholder:text-slate-500 leading-relaxed"
                          />
                        </div>

                        <button
                          id="btn-web-submit-journal-action"
                          onClick={handleAddNewDiaryText}
                          disabled={!newJournalText.trim()}
                          className={`w-full py-3.5 px-6 rounded-xl font-serif text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            newJournalText.trim() 
                              ? "bg-gradient-to-r from-[#d5b075] to-[#cbad70] text-slate-950 shadow-md font-semibold"
                              : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Guardar no Memorial e Receber Conselho</span>
                        </button>
                      </div>

                    </div>

                    {/* Right side column: Beautiful Memorial list / Communal Prayer Wall / AI Pastor Chat */}
                    <div className="lg:col-span-6 space-y-4" id="diary-right-column">
                      
                      <div className="flex border-b border-white/10 pb-2 justify-between items-center bg-slate-950/20 p-2 rounded-xl">
                        <div className="flex gap-4">
                          <button
                            id="tab-sub-memorial"
                            onClick={() => setActiveDiarySubTab("memorial")}
                            className={`pb-1 text-[11px] font-mono uppercase tracking-wider font-bold border-b-2 transition-all ${
                              activeDiarySubTab === "memorial" 
                                ? "border-[#d5b075] text-[#d5b075]" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Filhos da Fé ({diaryEntries.length})
                          </button>
                          <button
                            id="tab-sub-mural"
                            onClick={() => setActiveDiarySubTab("mural")}
                            className={`pb-1 text-[11px] font-mono uppercase tracking-wider font-bold border-b-2 transition-all ${
                              activeDiarySubTab === "mural" 
                                ? "border-[#d5b075] text-[#d5b075]" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Mural de Clamores ({communalPrayersList.length})
                          </button>
                          <button
                            id="tab-sub-pastor"
                            onClick={() => setActiveDiarySubTab("pastor")}
                            className={`pb-1 text-[11px] font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-1 ${
                              activeDiarySubTab === "pastor" 
                                ? "border-[#d5b075] text-[#d5b075]" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Aconselhamento IA {isPremiumActive() ? "⭐" : "🔒"}
                          </button>
                        </div>
                      </div>

                      {activeDiarySubTab === "memorial" && (
                        /* PERSONAL MEMORIAL FEED */
                        <div className="space-y-4">
                          <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Histórico Pessoal de Orações e Graças:</p>
                          <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2 scrollbar-thin">
                            {diaryEntries.length === 0 ? (
                              <div className="p-8 text-center bg-slate-950/30 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-xs text-slate-400 italic">"Escreva seu primeiro clamor ao lado para começar seu memorial celeste."</p>
                              </div>
                            ) : (
                              diaryEntries.map((entry) => (
                                <div 
                                  key={entry.id} 
                                  className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4 hover:border-white/10 transition-colors relative"
                                  id={`web-diary-entry-${entry.id}`}
                                >
                                  <span className="absolute top-4 right-5 text-[9px] font-mono text-slate-500 font-semibold">{entry.date}</span>

                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-mono uppercase bg-[#d5b075]/15 border border-[#d5b075]/25 text-[#d5b075] font-semibold">{entry.emotion}</span>
                                    <div className="flex gap-0.5 ml-1">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`w-2.5 h-2.5 fill-current ${s <= todayRating ? 'text-[#d5b075]' : 'text-slate-800'}`} />
                                      ))}
                                    </div>
                                  </div>

                                  <p className="text-xs text-[#f3f1eb] leading-relaxed font-sans italic">
                                    "{entry.text}"
                                  </p>

                                  {entry.reflection && (
                                    <div className="bg-[#1e1a12]/35 border border-[#d5b075]/15 p-3.5 rounded-xl space-y-2">
                                      <span className="text-[9px] font-mono text-[#d5b075] uppercase font-bold tracking-widest block">Conselhos Pastorais da Estrela</span>
                                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                        {entry.reflection}
                                      </p>
                                      <p className="text-[10px] text-indigo-200 font-mono italic leading-none pt-1 border-t border-white/5">
                                        <strong>Foco meditativo:</strong> {entry.prayerFocus}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {activeDiarySubTab === "mural" && (
                        /* COMMUNAL PRAYER FEED WALL */
                        <div className="space-y-4">
                          {/* Create/Publish Communal Prayer */}
                          <div className="p-4 bg-[#121622]/40 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-[10px] font-mono text-[#d5b075] tracking-widest font-bold uppercase block">Pedir Oração aos Irmãos</span>
                            <div className="flex gap-2">
                              <input 
                                id="communal-prayer-input"
                                type="text"
                                value={newPrayerText}
                                onChange={(e) => setNewPrayerText(e.target.value)}
                                placeholder="Clame por cura, família, libertação espiritual..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d5b075]"
                              />
                              <button
                                id="btn-publish-communal-prayer"
                                onClick={handlePublishCommunalPrayer}
                                disabled={isPublishingPrayer || !newPrayerText.trim()}
                                className="py-2 px-4 bg-gradient-to-r from-[#d5b075] to-[#cbad70] text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                              >
                                {isPublishingPrayer ? "..." : "Clamar"}
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Últimos Pedidos dos Peregrinos:</p>
                          
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                            {communalPrayersList.map((prayer) => {
                              const alreadyAmen = prayer.amens?.includes(pilgrimUser?.uid || "mock_user_uid");
                              return (
                                <div key={prayer.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-2 relative" id={`prayer-card-${prayer.id}`}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-serif font-semibold text-[#d5b075]">✝ {prayer.authorName}</span>
                                    <span className="text-[8px] font-mono text-slate-500">{new Date(prayer.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">"{prayer.text}"</p>
                                  
                                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <span className="text-[9px] font-mono text-slate-400 italic">Unidos nesta prece</span>
                                    <button
                                      id={`btn-prayer-amen-${prayer.id}`}
                                      onClick={() => handleAmenClick(prayer.id)}
                                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                                        alreadyAmen 
                                          ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" 
                                          : "bg-white/5 text-[#d5b075] hover:bg-white/10"
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${alreadyAmen ? "fill-current text-rose-400" : ""}`} />
                                      <span>AMÉM ({prayer.amenCount})</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeDiarySubTab === "pastor" && (
                        /* GATED AI PASTORAL COUNSELOR CHAT */
                        <div className="space-y-4">
                          {!isPremiumActive() ? (
                            /* Sub block for non-subscribers */
                            <div className="p-8 text-center bg-gradient-to-b from-[#1c140d]/40 to-slate-950 border border-amber-500/10 rounded-2xl space-y-4 my-2">
                              <span className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-[#d5b075] mx-auto">
                                <Lock className="w-6 h-6" />
                              </span>
                              <div className="space-y-1">
                                <h4 className="text-base font-serif text-white font-medium">Diálogo Pastoral Interativo Premium</h4>
                                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-sans">
                                  Tire dúvidas sobre passagens das escrituras originais, deite suas preocupações com respostas teológicas profundas e consoladoras feitas sob medida para você.
                                </p>
                              </div>
                              <button
                                id="btn-unlock-pastor-counseling"
                                onClick={() => setShowSubscriptionModal(true)}
                                className="py-2.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:scale-102 transition-all"
                              >
                                Fazer Aliança Premium ⭐
                              </button>
                            </div>
                          ) : (
                            /* Active Premium Chat dialogue with the AI Pastor Daniel */
                            <div className="flex flex-col bg-slate-950/40 border border-amber-500/10 rounded-2xl overflow-hidden h-[440px] relative">
                              <div className="bg-[#1a150c]/80 border-b border-amber-500/10 px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                  <span className="text-xs font-serif font-semibold text-[#d5b075]">Conselheiro Pastoral Daniel</span>
                                </div>
                                <span className="text-[8px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded-full font-bold">Premium</span>
                              </div>

                              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                                {pastorChatDialog.map((msg, mIdx) => (
                                  <div key={mIdx} className={`flex ${msg.role === "pilgrim" ? "justify-end" : "justify-start"}`}>
                                    <div className={`p-3 max-w-[85%] rounded-2xl text-xs leading-relaxed font-sans ${
                                      msg.role === "pilgrim"
                                        ? "bg-[#d5b075] text-slate-950 rounded-br-none font-semibold shadow-sm"
                                        : "bg-black/30 text-slate-200 border border-white/5 rounded-bl-none"
                                    }`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                ))}

                                {isPastorAnswering && (
                                  <div className="flex justify-start">
                                    <div className="p-3 bg-black/20 text-slate-400 rounded-2xl rounded-bl-none border border-white/5 flex items-center gap-2 text-[10px]">
                                      <Loader2 className="w-3 h-3 animate-spin text-[#d5b075]" />
                                      <span>Pastor Daniel está refletindo nas escrituras...</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="border-t border-white/5 p-2 bg-slate-950/40 flex gap-2">
                                <input
                                  id="pastor-chat-text-input"
                                  type="text"
                                  value={pastorChatText}
                                  onChange={(e) => setPastorChatText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSendPastorMessage();
                                  }}
                                  placeholder="Escreva uma pergunta ou anotação de fé..."
                                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#d5b075]"
                                />
                                <button
                                  id="btn-send-pastor-message"
                                  onClick={handleSendPastorMessage}
                                  disabled={!pastorChatText.trim()}
                                  className="p-2 bg-[#d5b075] text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#cbad70]"
                                >
                                  Clamar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )}

              {/* Dynamic glass Bottom status bar inside web app */}
              <div className="h-14 border-t border-white/5 px-8 flex items-center justify-between text-[10px] text-slate-500 font-mono z-10 shrink-0 bg-slate-950/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="uppercase">PORTAL SEGURO SANTUÁRIO ESTÁVEL</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="hover:text-white pointer-events-none uppercase">Presença Diária Ativa</span>
                  <span className="text-[#d5b075] uppercase font-bold">PRODUTO PREMIUM REVERENTE</span>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ========================================================
             THE "SINFONIA DE TELAS" / "SIMULADOR" VIEWPORTS MOCKUPS
             ======================================================== */
          viewMode === "immersive" ? (
            /* Immersive smartphone simulator */
            <div className="flex flex-col items-center gap-5 my-4 animate-fade-in" id="immersive-phone-viewport">
              <div className="flex items-center gap-3 bg-[#e8e4db] py-1.5 px-4 rounded-xl border border-black/10">
                <button 
                  id="btn-slide-prev"
                  onClick={() => handlePageSelectWithSync(Math.max(0, activeScreenIndex - 1))}
                  disabled={activeScreenIndex === 0}
                  className="p-1 rounded-md hover:bg-black/5 disabled:opacity-30 text-[#0A0D14]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-serif text-sm font-semibold tracking-wide text-center w-48">
                  TELA POLIDA {activeScreenIndex + 1} de 5: {
                    activeScreenIndex === 0 ? "Início / Home" :
                    activeScreenIndex === 1 ? "Check-In Emocional" :
                    activeScreenIndex === 2 ? "Filtro de Experiência" :
                    activeScreenIndex === 3 ? "Player de Oração" :
                    "Diário de Fé"
                  }
                </div>
                <button 
                  id="btn-slide-next"
                  onClick={() => handlePageSelectWithSync(Math.min(4, activeScreenIndex + 1))}
                  disabled={activeScreenIndex === 4}
                  className="p-1 rounded-md hover:bg-black/5 disabled:opacity-30 text-[#0A0D14]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Simulated Smartphone Container rendered individually */}
              <div className="p-1 bg-black border-[10px] border-[#0e121d] rounded-[48px] shadow-[0_30px_70px_rgba(0,0,0,0.4)]">
                {renderSimulatedPhone(activeScreenIndex)}
              </div>
            </div>
          ) : (
            /* High-Fidelity 5 screens side-by-side matching the image *exactly* */
            <div className="w-full space-y-6" id="multiscreen-grid-arena">
              <div className="text-center max-w-md mx-auto mb-4 p-1">
                <span className="font-serif text-xs italic text-[#d5b075] font-semibold">Telas Integradas no Aplicativo</span>
                <p className="text-sm text-slate-500 mt-1 font-sans leading-relaxed">
                  Interaja com cada uma das 5 telas sincronizadas em tempo real. Modifique sentimentos ou escreva diários para ver a atualização instantânea.
                </p>
              </div>

              {/* Flexbox container spacing the screens beautiful side-by-side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 justify-items-center items-start lg:-mx-4" id="phones-side-by-side-grid">
                {/* Screen 1 */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[275px]" id="group-phone-1">
                  <button onClick={() => { setViewMode("web"); setActiveWebTab(0); }} className="text-[10px] font-semibold tracking-widest text-[#0A0D14]/40 font-bold uppercase hover:text-[#d5b075] transition-colors flex items-center gap-1 cursor-pointer">
                    <span>1. Início</span>
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="w-full transform transition-all duration-300 hover:scale-[1.02]">
                    {renderSimulatedPhone(0)}
                  </div>
                </div>

                {/* Screen 2 */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[275px]" id="group-phone-2">
                  <button onClick={() => { setViewMode("web"); setActiveWebTab(1); }} className="text-[10px] font-semibold tracking-widest text-[#0A0D14]/40 font-bold uppercase hover:text-[#d5b075] transition-colors flex items-center gap-1 cursor-pointer">
                    <span>2. Check-In de Alma</span>
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="w-full transform transition-all duration-300 hover:scale-[1.02]">
                    {renderSimulatedPhone(1)}
                  </div>
                </div>

                {/* Screen 3 */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[275px]" id="group-phone-3">
                  <button onClick={() => { setViewMode("web"); setActiveWebTab(2); }} className="text-[10px] font-semibold tracking-widest text-[#0A0D14]/40 font-bold uppercase hover:text-[#d5b075] transition-colors flex items-center gap-1 cursor-pointer">
                    <span>3. Sua Experiência</span>
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="w-full transform transition-all duration-300 hover:scale-[1.02]">
                    {renderSimulatedPhone(2)}
                  </div>
                </div>

                {/* Screen 4 */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[275px]" id="group-phone-4">
                  <button onClick={() => { setViewMode("web"); setActiveWebTab(3); }} className="text-[10px] font-semibold tracking-widest text-[#0A0D14]/40 font-bold uppercase hover:text-[#d5b075] transition-colors flex items-center gap-1 cursor-pointer">
                    <span>4. Oração Guiada</span>
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="w-full transform transition-all duration-300 hover:scale-[1.02]">
                    {renderSimulatedPhone(3)}
                  </div>
                </div>

                {/* Screen 5 */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[275px]" id="group-phone-5">
                  <button onClick={() => { setViewMode("web"); setActiveWebTab(4); }} className="text-[10px] font-semibold tracking-widest text-[#0A0D14]/40 font-bold uppercase hover:text-[#d5b075] transition-colors flex items-center gap-1 cursor-pointer">
                    <span>5. Diário de Fé</span>
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="w-full transform transition-all duration-300 hover:scale-[1.02]">
                    {renderSimulatedPhone(4)}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

      </main>

      {/* BOTTOM PREMIUM MOCKUP SHOWCASE BANNER BAR - PERFECT COPY TO MATCH UPLOADED AT SECOND-HALF */}
      <footer className="w-full max-w-7xl mt-8 bg-[#121622] rounded-[32px] p-6 lg:p-8 text-white border border-white/5 shadow-2xl relative overflow-hidden" id="premium-showcase-bar">
        
        {/* Dynamic ambient lights inside footer */}
        <div className="absolute top-1/2 left-1/4 w-[30%] h-[120%] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-1/4 w-[30%] h-[120%] bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2"></div>
        
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6" id="banner-details">
          
          {/* Card Module 1 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-ambient">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
                <Wind className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-indigo-300 uppercase">Ambientes</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Ambientes sonoros e frequências teológicas puras que ajudam você a acalmar os sentidos e se conectar com Deus.
            </p>
          </div>

          {/* Card Module 2 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-ai">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/20 text-fuchsia-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-fuchsia-300 uppercase">IA Espiritual</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Inteligência Artificial que entende o estado emocional da sua alma e constrói orações e exegeses bíblicas personalizadas.
            </p>
          </div>

          {/* Card Module 3 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-journeys">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-400/20 text-yellow-300">
                <Compass className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-yellow-300 uppercase">Jornadas de Fé</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Caminhos litúrgicos e devocionais guiados para amparar cada fase da sua caminhada e vida espiritual.
            </p>
          </div>

          {/* Card Module 4 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-community">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/20 text-emerald-300">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-emerald-300 uppercase">Comunidade</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Compartilhe pedidos graves de clamor e oração, sendo edificado em um ambiente santo de amor, respeito e evangelho.
            </p>
          </div>

          {/* Card Module 5 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-challenges">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-400/20 text-orange-300">
                <Flame className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-orange-300 uppercase">Desafios</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Desafios e rituais bíblicos espirituais para solidificar hábitos diários de leitura de escrituras e orações contínuas.
            </p>
          </div>

          {/* Card Module 6 */}
          <div className="space-y-2 border-r border-white/5 pr-4 last:border-0" id="badge-info-premium">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/20 text-cyan-300">
                <BookOpen className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider font-mono text-cyan-300 uppercase">Conteúdo Premium</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Devocionais cinematográficos exclusivos, hinos restauradores, orações com vozes ultra-humanas inspiradoras.
            </p>
          </div>

        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-4">
          <span>PLATAFORMA CRISTÃ CONTEMPLATIVA DE NOVA GERAÇÃO — DESIGN FIDELITY v1.5-STABLE</span>
          <span>FEITO COM AMOR & REVERÊNCIA</span>
        </div>
      </footer>

      {/* ------------------- AUTHENTICATION DIALOG OVERLAY ------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" id="auth-modal-dialog">
          <div className="bg-[#edeae4] text-[#0A0D14] border border-[#0A0D14]/15 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative space-y-6">
            <button 
              id="btn-close-auth-modal"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-200/50 transition-all"
            >
              <RotateCcw className="w-4 h-4 rotate-45" /> {/* Close icon visual representation */}
            </button>

            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-[#121622] rounded-2xl flex items-center justify-center text-[#d5b075] font-serif text-xl font-bold mx-auto shadow-md">
                ✝
              </div>
              <h3 className="text-xl font-serif font-semibold tracking-tight mt-3 text-[#121622]">Portal do Peregrino</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Entre com sua conta para salvar seu altar pessoal, sincronizar orações diárias e clamar em união com outros fiéis.
              </p>
            </div>

            <div className="space-y-4">
              <button
                id="btn-google-sign-in-action"
                onClick={async () => {
                  setIsAuthSubmitting(true);
                  try {
                    await loginWithGoogle();
                    setShowAuthModal(false);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsAuthSubmitting(false);
                  }
                }}
                disabled={isAuthSubmitting}
                className="w-full py-3 px-4 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 font-bold text-xs tracking-wide text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-sm"
              >
                {isAuthSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <span className="text-[#db4437] font-bold">G</span>
                )}
                <span>Acessar com Conta Google</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 my-4">
                <div className="flex-1 h-px bg-slate-300"></div>
                <span>OU CONEXÃO RÁPIDA</span>
                <div className="flex-1 h-px bg-slate-300"></div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Seu Nome de Batismo</label>
                  <input
                    id="auth-input-name"
                    type="text"
                    value={authNameInput}
                    onChange={(e) => setAuthNameInput(e.target.value)}
                    placeholder="Ex: Gabriel Silva"
                    className="w-full bg-white border border-slate-300 font-sans text-xs text-[#0A0D14] rounded-xl px-4 py-2.5 outline-none focus:border-[#d5b075]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Endereço de E-mail</label>
                  <input
                    id="auth-input-email"
                    type="email"
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    placeholder="Ex: gabriel@fe.com"
                    className="w-full bg-white border border-slate-300 font-sans text-xs text-[#0A0D14] rounded-xl px-4 py-2.5 outline-none focus:border-[#d5b075]"
                  />
                </div>

                <button
                  id="btn-email-sign-in-action"
                  onClick={async () => {
                    if (!authEmailInput || !authNameInput) return;
                    setIsAuthSubmitting(true);
                    try {
                      await loginWithEmailSimulated(authEmailInput, authNameInput);
                      setShowAuthModal(false);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsAuthSubmitting(false);
                    }
                  }}
                  disabled={isAuthSubmitting || !authEmailInput.trim() || !authNameInput.trim()}
                  className="w-full py-3 bg-[#121622] hover:bg-[#1f2638] text-[#e0b468] transition-all disabled:opacity-40 rounded-xl font-bold font-mono text-xs uppercase tracking-wider"
                >
                  Entrar como Peregrino Conservador
                </button>
              </div>
            </div>

            <p className="text-[9px] text-center font-mono text-slate-500">
              Conexão 100% segura sob os preceitos do Santuário Sagrado.
            </p>
          </div>
        </div>
      )}

      {/* ------------------- SUBSCRIPTION PLAN GATE OVERLAY ------------------- */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" id="subscription-modal-dialog">
          <div className="bg-[#edeae4] text-[#0A0D14] border border-amber-500/20 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl relative space-y-6">
            <button 
              id="btn-close-sub-modal"
              onClick={() => {
                setShowSubscriptionModal(false);
                setIsCheckoutFinished(false);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-200/50 transition-all"
            >
              <RotateCcw className="w-4 h-4 rotate-45" /> {/* Close icon */}
            </button>

            {!isCheckoutFinished ? (
              /* ACTIVE BILLING GATEWAY FORM */
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-500 font-mono text-[9px] font-bold uppercase tracking-wider">
                    ⭐ Aliança de Co-Semeador Premium
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#121622] tracking-tight mt-2">Apadrinhe a Missão Santuário</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Sua assinatura remove travas das vozes pacíficas masculinas e femininas, libera reflexões personalizadas da Palavra e ajuda na propagação pacífica do evangelho no ambiente digital.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Plan 1 */}
                  <div 
                    onClick={() => setSelectedPlanId("mensal")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedPlanId === "mensal" 
                        ? "border-amber-500 bg-white shadow-md scale-102" 
                        : "border-slate-300/40 bg-white/50 hover:bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-serif font-semibold text-sm">Plano Semeador</span>
                      {selectedPlanId === "mensal" && <span className="text-amber-500 text-xs">●</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Reflexões Teológicas ilimitadas</p>
                    <div className="mt-4">
                      <span className="text-xl font-bold font-serif text-[#121622]">R$ 14,90</span>
                      <span className="text-xs text-slate-400 font-mono">/mês</span>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div 
                    onClick={() => setSelectedPlanId("anual")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      selectedPlanId === "anual" 
                        ? "border-amber-500 bg-[#fffbeb] shadow-md scale-102" 
                        : "border-slate-300/40 bg-white/50 hover:bg-white"
                    }`}
                  >
                    <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-bl-lg">
                      Economize 45%
                    </span>
                    <div className="flex justify-between items-start">
                      <span className="font-serif font-semibold text-sm">Fidelidade Aliança</span>
                      {selectedPlanId === "anual" && <span className="text-amber-500 text-xs">●</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Estudo anual ininterrupto</p>
                    <div className="mt-4">
                      <span className="text-xl font-bold font-serif text-[#121622]">R$ 99,00</span>
                      <span className="text-xs text-slate-400 font-mono">/ano</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 p-4 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex gap-4 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setPaymentMethod("pix")}
                      className={`text-xs font-mono font-bold uppercase pb-1 border-b-2 ${
                        paymentMethod === "pix" ? "border-amber-500 text-amber-500" : "border-transparent text-slate-400"
                      }`}
                    >
                      PIX de Pentecostes (Imediato)
                    </button>
                    <button
                      onClick={() => setPaymentMethod("cartao")}
                      className={`text-xs font-mono font-bold uppercase pb-1 border-b-2 ${
                        paymentMethod === "cartao" ? "border-amber-500 text-amber-500" : "border-transparent text-slate-400"
                      }`}
                    >
                      Cartão de Crédito
                    </button>
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="space-y-4 py-1">
                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center p-2 shrink-0 border border-[#d5b075]/20">
                          {/* Beautiful simulated PIX QR Code with glowing Cross symbol */}
                          <div className="text-center">
                            <span className="text-[#d5b075] text-[6px] font-mono leading-none font-bold uppercase block">PIX REGIONAL</span>
                            <span className="text-xl text-white block mt-0.5">✝</span>
                            <span className="text-slate-400 text-[5px] font-mono block leading-none">CÉU INTEGRADO</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-serif font-semibold">Chave de Doação Celestial Copie e Cole:</p>
                          <p className="text-[9px] text-[#2c303a] font-mono bg-[#121622]/5 p-2 border border-slate-300 rounded-lg break-all select-all leading-tight max-w-[280px]">
                            00020126360014br.gov.bcb.pix0114santuario5583728192019aliamcapremium
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          id="btn-copy-pix-key"
                          onClick={() => {
                            navigator.clipboard.writeText("00020126360014br.gov.bcb.pix0114santuario5583728192019aliamcapremium");
                            setSimulatedPixCopied(true);
                            setTimeout(() => setSimulatedPixCopied(false), 2000);
                          }}
                          className="flex-1 py-2 border border-slate-300 font-mono text-[10px] font-bold text-slate-705 text-slate-700 uppercase tracking-wider rounded-xl hover:bg-slate-50"
                        >
                          {simulatedPixCopied ? "Copiado com sucesso!" : "Copiar Código Pix"}
                        </button>
                        <button
                          id="btn-simulate-payment-pix"
                          onClick={handleUpgradeToPremium}
                          disabled={isCheckoutProcessing}
                          className="flex-1 py-2 bg-gradient-to-r from-amber-400 to-amber-500 font-serif text-[10px] font-bold text-slate-950 uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md"
                        >
                          {isCheckoutProcessing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sincronizando Altar...</span>
                            </>
                          ) : (
                            <span>Confirmar Pagamento</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Número do Cartão de dote</label>
                          <input
                            type="text"
                            placeholder="4442 1204 8839 1239"
                            value={ccNumber}
                            onChange={(e) => setCcNumber(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-sans outline-none focus:border-amber-250 focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Data Expiração</label>
                          <input
                            type="text"
                            placeholder="12/29"
                            value={ccExp}
                            onChange={(e) => setCcExp(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-sans outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block">CVV</label>
                          <input
                            type="text"
                            placeholder="770"
                            value={ccCvv}
                            onChange={(e) => setCcCvv(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-sans outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Nome do Titular da Fé</label>
                          <input
                            type="text"
                            placeholder="Maria de Lourdes"
                            value={ccName}
                            onChange={(e) => setCcName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-sans outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <button
                        id="btn-simulate-payment-cc"
                        onClick={handleUpgradeToPremium}
                        disabled={isCheckoutProcessing || !ccNumber || !ccName}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md"
                      >
                        {isCheckoutProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Processando Dote Premium...</span>
                          </>
                        ) : (
                          <span>Apoiar com Cartão de Crédito</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ALREADY COMPLETED BLESSING POPUP window */
              <div className="text-center py-6 space-y-5 animate-fade-in">
                <span className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-500 mx-auto text-2xl">
                  ✓
                </span>
                <div className="space-y-1">
                  <h3 className="text-xl font-serif font-bold text-slate-900">Aliança Consagrada!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
                    Deus abençoe poderosamente sua dedicação e contribuição amorosa, {userName}! Seu status Premium está ativo. Todas as vozes, frequências contemplativas e o conselho pastoral agora estão integralmente destravados para você.
                  </p>
                </div>

                <div className="bg-slate-900 border border-amber-500/25 p-3 rounded-xl flex items-center justify-between mx-auto max-w-sm">
                  <div className="text-left">
                    <span className="text-[7px] font-mono text-amber-400 uppercase block font-bold leading-none">Peregrino Celestial</span>
                    <span className="text-xs font-serif font-semibold text-white block mt-1">{userName}</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/20 text-[#d0a75c] px-2 py-0.5 rounded-full font-bold uppercase font-mono border border-amber-500/30">
                    ⭐ Premium Active
                  </span>
                </div>

                <button
                  id="btn-close-sub-success"
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setIsCheckoutFinished(false);
                  }}
                  className="py-2 px-6 bg-[#121622] text-[#e0b468] rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                >
                  Entrar no Santuário Destravado
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );

  // RENDERING FUNCTION OF PHONE SIMULATIONS FOR PIXEL PERSPECTIVE FIDELITY
  function renderSimulatedPhone(index: number) {
    
    // Custom phone wrapper layout parameters mimicking real hardware frame
    return (
      <div 
        id={`simulated-phone-${index}`}
        className="w-[265px] h-[520px] bg-[#0A0D14] text-[#E0E2E8] rounded-[36px] border-[5px] border-[#1C1F26] shadow-2xl relative overflow-hidden flex flex-col select-none"
      >
        
        {/* iOS TOP STATUS BAR CONTAINER */}
        <div className="h-6 w-full px-5 bg-black/45 flex items-center justify-between text-[8px] font-mono tracking-widest font-bold text-white z-40 relative">
          <div className="flex items-center gap-1">
            <span>9:41</span>
            <MapPin className="w-1.5 h-1.5 text-indigo-400 inline-block fill-current" />
          </div>
          {/* iOS iPhone Top Notch Element */}
          <div className="w-16 h-3.5 bg-black rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-zinc-800 rounded-full"></div>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-1.5 h-1.5" />
            <span className="text-[7px] text-emerald-400">● 5G</span>
          </div>
        </div>

        {/* PHONE MAIN SCREEN CONTENTS */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col" id={`phone-screen-scroller-${index}`}>
          
          {index === 0 && (
            /* ========================================================
               SCREEN 1: INÍCIO - Mountain Sunset dashboard
               ======================================================== */
            <div className="flex-1 flex flex-col justify-between py-4 relative min-h-full" id="phone-home-view">
              
              {/* Background mountain asset */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={mountainSunset} 
                  alt="Encontro Divino Pôr do Sol" 
                  className="w-full h-full object-cover opacity-60 filter brightness-90 saturate-[1.1]"
                  referrerPolicy="no-referrer"
                />
                {/* Beautiful dark vignetting gradient overlay overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-black/30 to-[#0A0D14]/80"></div>
              </div>

              {/* Top greeting element */}
              <div className="px-4 pt-2 z-10 space-y-1">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span className="text-[9px] uppercase tracking-widest text-[#d5b075] font-semibold font-mono">Santuário Diário</span>
                </div>
                <h2 className="text-xl font-serif font-medium text-white tracking-tight mt-0.5">
                  Bom dia, {userName} 👋
                </h2>
                <p className="text-[9px] text-slate-300/80 leading-relaxed font-sans">
                  Que bom ter você aqui. Vamos ter um momento com Deus?
                </p>
              </div>

              {/* Versículo do dia center-aligned visual element */}
              <div className="px-3.5 py-3 bg-[#111420]/80 border border-white/10 rounded-2xl mx-3.5 z-10 backdrop-blur-md space-y-2 mt-auto" id="verse-card-badge-layout">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] uppercase tracking-wider text-[#d5b075] font-mono font-bold">Versículo do Dia</span>
                  
                  {/* Clickable Heart Toggle representing loved verse */}
                  <button 
                    id="btn-love-verse-homescreen"
                    onClick={() => setLikedVerse(!likedVerse)}
                    className="p-1 rounded-full text-rose-400 hover:scale-110 active:scale-95 transition-all outline-none"
                  >
                    <Heart className={`w-3.5 h-3.5 ${likedVerse ? 'fill-current text-rose-500' : 'text-slate-400'}`} />
                  </button>
                </div>

                <p className="text-[10px] text-slate-100 font-serif leading-relaxed italic">
                  "{experienceData.verse.text}"
                </p>
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-0.5 border-t border-white/5">
                  <span>{experienceData.verse.reference}</span>
                  <span className="text-[7.5px] text-[#d5b075] uppercase flex items-center gap-1">✝ Promessas</span>
                </div>
              </div>

              {/* Comece Agora grid selection row */}
              <div className="px-3.5 pt-4 pb-2 z-10" id="quick-starters-section">
                <h3 className="text-[9px] uppercase font-bold tracking-widest text-slate-450 text-slate-400 mb-2 font-mono">Comece agora</h3>
                
                <div className="grid grid-cols-4 gap-1.5">
                  <button 
                    id="btn-goto-screen-2"
                    onClick={() => handlePageSelectWithSync(1)} 
                    className="flex flex-col items-center p-1.5 bg-[#171B26]/90 border border-white/5 rounded-xl text-center hover:bg-[#202534] transition-colors outline-none"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#d5b075]/20 flex items-center justify-center text-[#d5b075] mb-1">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <span className="text-[7.5px] font-medium tracking-tight whitespace-nowrap">Oração</span>
                  </button>

                  <button 
                    id="btn-goto-screen-3"
                    onClick={() => handlePageSelectWithSync(2)} 
                    className="flex flex-col items-center p-1.5 bg-[#171B26]/90 border border-white/5 rounded-xl text-center hover:bg-[#202534] transition-colors outline-none"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#d5b075]/20 flex items-center justify-center text-[#d5b075] mb-1">
                      <BookOpen className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <span className="text-[7.5px] font-medium tracking-tight">Devocional</span>
                  </button>

                  <button 
                    id="btn-goto-screen-4"
                    onClick={() => handlePageSelectWithSync(3)} 
                    className="flex flex-col items-center p-1.5 bg-[#171B26]/90 border border-white/5 rounded-xl text-center hover:bg-[#202534] transition-colors outline-none"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#d5b075]/20 flex items-center justify-center text-[#d5b075] mb-1">
                      <Wind className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[7.5px] font-medium tracking-tight">Meditação</span>
                  </button>

                  <button 
                    id="btn-toggle-homesound-fast"
                    onClick={() => setIsAudioPlaying(!isAudioPlaying)} 
                    className={`flex flex-col items-center p-1.5 border rounded-xl text-center transition-colors outline-none ${
                      isAudioPlaying 
                        ? 'bg-[#d5b075]/35 border-[#d5b075]' 
                        : 'bg-[#171B26]/90 border-white/5 text-slate-350 hover:bg-[#202534]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#d5b075]/25 flex items-center justify-center text-[#d5b075] mb-1">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[7.5px] font-medium tracking-tight">Música</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {index === 1 && (
            /* ========================================================
               SCREEN 2: COMO ESTÁ A SUA ALMA HOJE? (Check-In)
               ======================================================== */
            <div className="flex-1 flex flex-col justify-between p-3.5 relative min-h-full" id="phone-checkin-view">
              
              {/* Back Arrow Header */}
              <div className="flex items-center justify-between pb-1 z-10">
                <button 
                  id="btn-back-phone-1"
                  onClick={() => handlePageSelectWithSync(0)} 
                  className="p-1 rounded bg-[#1A1F2D] text-slate-300 hover:text-white outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {/* Stepper dots */}
                <div className="flex items-center gap-1">
                  <div className="w-4 h-1 rounded bg-[#d5b075]"></div>
                  <div className="w-4 h-1 rounded bg-slate-700"></div>
                  <div className="w-4 h-1 rounded bg-slate-700"></div>
                </div>
                <div className="w-4"></div>
              </div>

              {/* Title & Guidance */}
              <div className="text-center space-y-1 pt-1 z-10 px-1">
                <h3 className="text-base font-serif font-medium text-white leading-snug">
                  Como está a sua alma hoje?
                </h3>
                <p className="text-[9px] text-slate-400 font-sans leading-normal">
                  Sua resposta nos ajuda a criar uma oração personalizada para você.
                </p>
              </div>

              {/* Grid of Emotions styled *exactly* like Screen 2 mock */}
              <div className="grid grid-cols-2 gap-2 py-3 z-10" id="feelings-mobile-grid">
                {SUPPORTED_EMOTIONS.slice(0, 8).map((emp) => {
                  const isSelected = selectedEmotionId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      id={`phone-feeling-${emp.id}`}
                      onClick={() => setSelectedEmotionId(emp.id)}
                      className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border text-center transition-all duration-300 relative overflow-hidden outline-none ${
                        isSelected 
                          ? 'bg-[#181D2A] border-[#d5b075] text-[#d5b075] shadow-lg shadow-[#d5b075]/5' 
                          : 'bg-[#11141E] border-white/5 text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {/* Left tiny highlight element */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#d5b075]"></div>
                      )}

                      {/* Display beautiful mini icons based on emotion types */}
                      <span className="text-xs block mb-0.5">
                        {emp.id === "ansiedade" && "😟"}
                        {emp.id === "cansaço" && "😴"}
                        {emp.id === "solidão" && "🖤"}
                        {emp.id === "culpa" && "😔"}
                        {emp.id === "medo" && "😰"}
                        {emp.id === "direção" && "🧭"}
                        {emp.id === "gratidão" && "🙏"}
                        {emp.id === "confusão" && "🌪️"}
                      </span>

                      <span className="text-[9.5px] font-semibold font-sans block">{emp.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Continue trigger Button */}
              <div className="pt-1 pb-1 z-10" id="mobile-action-submit">
                <button
                  id="btn-phone-submit-experience"
                  onClick={() => generateContemplativePath(selectedEmotionId)}
                  disabled={isGeneratingExperience}
                  className="w-full py-2.5 bg-[#d5b075] text-[#0A0D14] hover:bg-[#cbad70] active:scale-[0.99] font-serif text-[10.5px] font-bold rounded-xl tracking-wide shadow-md flex items-center justify-center gap-1.5 transition-all outline-none"
                >
                  {isGeneratingExperience ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Invocando...</span>
                    </>
                  ) : (
                    <span>Continuar</span>
                  )}
                </button>
              </div>

            </div>
          )}

          {index === 2 && (
            /* ========================================================
               SCREEN 3: SUA EXPERIÊNCIA - Forest River & Breath
               ======================================================== */
            <div className="flex-1 flex flex-col justify-between py-3 relative min-h-full" id="phone-experiencia-view">
              
              {/* Background river asset */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={forestRiver} 
                  alt="Santuário Rio da Floresta" 
                  className="w-full h-full object-cover opacity-50 filter brightness-95"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-black/45 to-[#0A0D14]/75"></div>
              </div>

              {/* Header navigation bar inside screen */}
              <div className="flex items-center justify-between px-3.5 pb-1 z-10">
                <button 
                  id="btn-back-phone-2"
                  onClick={() => handlePageSelectWithSync(1)} 
                  className="p-1 rounded bg-black/40 text-slate-300 outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 font-semibold bg-black/50 py-0.5 px-2.5 rounded-full">Personalizado</span>
                <button 
                  id="btn-close-phone-home-fast"
                  onClick={() => {
                    setHasCompletedCheckIn(false);
                    handlePageSelectWithSync(0);
                  }} 
                  className="p-1 rounded bg-black/40 text-slate-400 hover:text-white outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Title text */}
              <div className="px-4 pt-1.5 z-10 space-y-0.5">
                <h3 className="text-base font-serif font-medium text-white leading-snug">
                  Sua experiência
                </h3>
                <p className="text-[8.5px] text-slate-300 font-sans tracking-wide">
                  Feita especialmente para você
                </p>
              </div>

              {/* Core card - "Respire fundo..." styled *exactly* like screen 3 */}
              <div className="px-3 py-3 bg-black/50 border border-white/5 rounded-2xl mx-3.5 z-10 backdrop-blur-md space-y-1.5 mt-auto animate-pulse" id="respire-fundo-banner">
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3 h-3 text-[#d5b075]" />
                  <span className="text-[8px] uppercase tracking-wider font-mono text-[#d5b075] font-bold">Respire fundo</span>
                </div>
                <p className="text-[9.5px] text-slate-200 leading-normal font-serif">
                  Deus está aqui. Você não precisa ter todas as respostas agora. Apenas silencie e sinta a Sua presença soberana.
                </p>
              </div>

              {/* Oração guiada media block card */}
              <div className="p-2.5 bg-[#111420]/95 border border-[#d5b075]/25 rounded-2xl mx-3.5 z-10 mt-2.5 flex items-center justify-between" id="audio-play-trigger-strip">
                <div className="flex items-center gap-2.5">
                  <button
                    id="btn-phone-quick-play-screen3"
                    onClick={() => {
                      setIsAudioPlaying(!isAudioPlaying);
                      handlePageSelectWithSync(3); // open full audio player Screen 4
                    }}
                    className="w-8.5 h-8.5 rounded-full bg-[#d5b075] hover:bg-[#cbad70] flex items-center justify-center text-slate-900 shadow-md transform active:scale-95 transition-all outline-none"
                  >
                    {isAudioPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="truncate max-w-[120px]">
                    <h4 className="text-[10px] font-serif font-bold text-white leading-tight">Oração guiada</h4>
                    <p className="text-[8px] text-[#d5b075] font-mono truncate leading-none mt-0.5">Encontre descanso</p>
                  </div>
                </div>
                <span className="text-[8px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">12 min</span>
              </div>

              {/* Bottom Quick Tabs bar strip */}
              <div className="grid grid-cols-4 gap-1 px-3.5 pt-3 pb-1 z-10 text-center" id="screen3-lower-tabs">
                <div className="p-1 border border-white/5 bg-black/40 rounded-xl text-[7px] text-slate-350">
                  <span className="block text-[#d5b075]">✝</span>
                  <span>Versículo</span>
                </div>
                <div className="p-1 border border-white/5 bg-black/40 rounded-xl text-[7px] text-slate-350">
                  <span className="block text-[#d5b075]">✏</span>
                  <span>Reflexão</span>
                </div>
                <div className="p-1 border border-white/5 bg-black/40 rounded-xl text-[7px] text-slate-350">
                  <span className="block text-[#d5b075]">🌬</span>
                  <span>Silêncio</span>
                </div>
                <div className="p-1 border border-white/5 bg-black/40 rounded-xl text-[7px] text-slate-350">
                  <span className="block text-[#d5b075]">📒</span>
                  <span>Jornal</span>
                </div>
              </div>

            </div>
          )}

          {index === 3 && (
            /* ========================================================
               SCREEN 4: ORAÇÃO GUIADA PLAYER
               ======================================================== */
            <div className="flex-1 flex flex-col justify-between p-3.5 relative min-h-full" id="phone-player-view">
              
              {/* Audio header */}
              <div className="flex items-center justify-between pb-1 z-10 border-b border-white/5">
                <button 
                  id="btn-back-phone-3"
                  onClick={() => handlePageSelectWithSync(2)} 
                  className="p-1 rounded bg-[#1A1F2D] text-slate-300 hover:text-white outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-serif font-semibold text-slate-300">Oração guiada</span>
                <div className="w-6"></div>
              </div>

              {/* Waveform Circular Center Indicator styled *exactly* like screen 4 */}
              <div className="flex flex-col items-center justify-center py-4 relative" id="audio-waveform-stage">
                
                {/* Visual beautiful rotating gradient wave line */}
                <div className={`w-32 h-32 rounded-full border border-dashed border-[#d5b075]/40 flex items-center justify-center p-2 transition-transform duration-[6s] linear ${
                  isAudioPlaying ? 'animate-spin' : ''
                }`}>
                  <div className="w-full h-full rounded-full border border-solid border-[#d5b075]/50 flex items-center justify-center relative">
                    <div className={`absolute inset-1 rounded-full bg-black/20 ${isAudioPlaying ? 'animate-pulse opacity-60' : ''}`}></div>
                    
                    {/* Centered Golden Christian Cross ✝ */}
                    <div className="z-10 font-serif text-2xl font-light text-[#d5b075] drop-shadow-[0_0_8px_rgba(213,176,117,0.7)]">
                      ✝
                    </div>
                  </div>
                </div>

              </div>

              {/* Prayer Scrollable transcript item view */}
              <div className="flex-1 overflow-y-auto max-h-[110px] px-2.5 py-1 bg-black/45 rounded-xl border border-white/5 text-center mt-1" id="mock-prayer-transcript">
                <p className="text-[9.5px] font-serif text-[#eae9e0] leading-relaxed italic">
                  "{experienceData.prayer}"
                </p>
              </div>

              {/* Progress Slider Bar */}
              <div className="px-1 pt-3 space-y-1 z-10" id="audio-slider-controls">
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-500 tracking-wider">
                  <span>{formatAudioTime(audioProgressSeconds)}</span>
                  <span>12:00</span>
                </div>
                
                {/* Realistic slider timeline track slider */}
                <div 
                  id="progress-track-bg"
                  className="w-full h-1 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = x / rect.width;
                    setAudioProgressSeconds(Math.floor(pct * 720));
                  }}
                >
                  <div 
                    className="h-full bg-[#d5b075] rounded-full absolute top-0 left-0"
                    style={{ width: `${(audioProgressSeconds / 720) * 100}%` }}
                  />
                </div>
              </div>

              {/* Buttons Control Row styled *exactly* like screen 4 controls */}
              <div className="flex items-center justify-center gap-5 pt-3 pb-1 z-10" id="player-active-controllers">
                <button
                  id="btn-phone-rewind"
                  onClick={() => setAudioProgressSeconds(prev => Math.max(0, prev - 15))}
                  className="p-1 rounded-full text-slate-400 hover:text-white outline-none"
                  title="Voltar 15s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  id="btn-phone-main-audio-toggle"
                  onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                  className="w-9 h-9 rounded-full bg-[#d5b075] hover:bg-[#cbad70] flex items-center justify-center text-slate-900 shadow-md transform active:scale-95 transition-all outline-none"
                >
                  {isAudioPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
                  )}
                </button>

                <button
                  id="btn-phone-forward"
                  onClick={() => setAudioProgressSeconds(prev => Math.min(720, prev + 15))}
                  className="p-1 rounded-full text-slate-400 hover:text-white outline-none"
                  title="Avançar 15s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {index === 4 && (
            /* ========================================================
               SCREEN 5: MEU DIÁRIO & FAITH RECORDS
               ======================================================== */
            <div className="flex-1 flex flex-col justify-between py-2.5 px-3.5 relative min-h-full" id="phone-diario-view">
              
              {/* Header navigation bar */}
              <div className="flex items-center justify-between pb-1.5 z-10 border-b border-white/5">
                <button 
                  id="btn-back-phone-4"
                  onClick={() => handlePageSelectWithSync(0)} 
                  className="p-1 rounded bg-[#1A1F2D] text-slate-450 hover:text-white outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-serif font-semibold text-slate-200">Meu diário</span>
                <div className="w-4"></div>
              </div>

              {/* Sub tabs selector */}
              <div className="grid grid-cols-2 gap-2 text-center pt-2 z-10" id="diary-mobil-subtabs">
                <div className="border-b-2 border-[#d5b075] pb-0.5 text-[8px] font-bold text-white tracking-wide cursor-pointer uppercase">
                  Reflexões
                </div>
                <div className="border-b border-white/5 pb-0.5 text-[8px] font-medium text-slate-400 tracking-wide hover:text-white transition-colors cursor-pointer uppercase">
                  Orações
                </div>
              </div>

              {/* calendar strip matching screen 5 */}
              <div className="py-2 px-1 bg-[#111420]/80 border border-white/5 rounded-xl mt-1.5 z-10 space-y-1" id="calendar-mobile">
                <div className="flex items-center justify-between text-[8px] font-semibold text-[#d5b075] px-1 font-mono">
                  <span>‹</span>
                  <span className="uppercase tracking-widest text-[7px] font-bold">Maio 2026</span>
                  <span>›</span>
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-5 gap-1 text-center" id="calendar-timeline">
                  <div className="p-0.5 rounded text-[7.5px]">
                    <span className="text-slate-400 block font-mono">18</span>
                    <span className="text-slate-500 font-bold font-mono">DOM</span>
                  </div>
                  <div className="p-0.5 rounded text-[7.5px]">
                    <span className="text-slate-400 block font-mono">19</span>
                    <span className="text-slate-500 font-bold font-mono">SEG</span>
                  </div>
                  <div className="p-0.5 rounded bg-[#d5b075] text-[#0A0D14] font-semibold">
                    <span className="block font-mono text-[8.5px] font-bold">20</span>
                    <span className="font-bold font-mono text-[6.5px]">TER</span>
                  </div>
                  <div className="p-0.5 rounded text-[7.5px]">
                    <span className="text-slate-400 block font-mono">21</span>
                    <span className="text-slate-500 font-bold font-mono">QUA</span>
                  </div>
                  <div className="p-0.5 rounded text-[7.5px]">
                    <span className="text-slate-400 block font-mono">22</span>
                    <span className="text-slate-500 font-bold font-mono">QUI</span>
                  </div>
                </div>
              </div>

              {/* Scroll list */}
              <div className="flex-1 overflow-y-auto py-2 space-y-1.5 max-h-[110px]" id="diary-feed-scroll">
                {diaryEntries.map((entry, idx) => (
                  <div key={entry.id} className="bg-[#111420]/95 border border-white/5 p-2 rounded-xl relative" id={`entry-badge-${idx}`}>
                    <span className="absolute top-1 right-2 text-[6.5px] text-slate-500 font-mono tracking-wider">{entry.date}</span>
                    <p className="text-[9px] text-slate-200 leading-normal italic pr-2">
                      "{entry.text}"
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-1 mt-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-2 h-2 fill-current ${s <= todayRating ? 'text-[#d5b075]' : 'text-slate-705'}`} />
                        ))}
                      </div>
                      <span className="text-[6.5px] text-slate-400 font-mono">#{idx+1}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline Writing block */}
              <div className="bg-black/55 p-1.5 rounded-xl border border-[#d5b075]/10 mt-auto space-y-1.5 z-10" id="write-block-drawer">
                <textarea 
                  id="mobile-input-journal-text"
                  value={newJournalText}
                  onChange={(e) => setNewJournalText(e.target.value)}
                  placeholder="Escreva pedindo forças para Deus..." 
                  className="w-full bg-black/45 border border-white/5 rounded-lg p-1.5 text-[8.5px] text-slate-200 focus:outline-none focus:border-[#d5b075] resize-none h-10 placeholder:text-slate-550 h-9"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[6.5px] text-slate-400 font-mono">Avalie o dia:</span>
                    <div className="flex gap-0.5" id="mobile-star-line">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button 
                          key={s} 
                          id={`btn-phone-starrating-${s}`}
                          type="button"
                          onClick={() => setTodayRating(s)}
                          className="focus:outline-none"
                        >
                          <Star className={`w-2.5 h-2.5 fill-current ${s <= todayRating ? 'text-[#d5b075]' : 'text-slate-650'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="btn-phone-submit-journal"
                    onClick={handleAddNewDiaryText}
                    className="bg-[#d5b075] hover:bg-[#cbad70] py-0.5 px-2 rounded-md text-slate-900 text-[7.5px] font-bold font-serif shadow outline-none"
                  >
                    Escrever
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM iOS HOME BAR NOTCH */}
        <div className="h-3 w-full bg-black/60 flex items-center justify-center z-40 shrink-0">
          <div className="w-20 h-0.5 bg-white/45 rounded-full"></div>
        </div>

      </div>
    );
  }
}
