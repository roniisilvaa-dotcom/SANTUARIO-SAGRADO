import { useState, useEffect } from "react";
import { Sparkles, Heart, RefreshCw, Feather, BookOpen, Wind, Copy, Check, Volume2, ArrowLeft } from "lucide-react";
import AmbientSoundPlayer from "./AmbientSoundPlayer";
import { ExperienceData } from "../types";
import { SUPPORTED_EMOTIONS } from "./SoulCheckIn";

interface SantuarioHomeProps {
  experience: ExperienceData;
  selectedEmotion: string;
  onReset: () => void;
  onCompleteSession: () => void;
}

export default function SantuarioHome({ experience, selectedEmotion, onReset, onCompleteSession }: SantuarioHomeProps) {
  const [activeTab, setActiveTab] = useState<"prayer" | "devotional" | "breath">("prayer");
  const [copied, setCopied] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  // Breath helper state
  const [breathPhase, setBreathPhase] = useState<"inspire" | "segure" | "expire">("inspire");
  const [breathCounter, setBreathCounter] = useState(4);

  // Filter emotion metadata for ambient sound recommendation
  const emotionObj = SUPPORTED_EMOTIONS.find(emp => emp.id === selectedEmotion);
  const recommendedAmbient = emotionObj ? emotionObj.ambientSound : "dawn";

  // Cycle breathing exercise phases
  useEffect(() => {
    if (activeTab !== "breath") return;

    const interval = setInterval(() => {
      setBreathCounter((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathPhase((currentPhase) => {
            if (currentPhase === "inspire") {
              setBreathCounter(4);
              return "segure";
            } else if (currentPhase === "segure") {
              setBreathCounter(4);
              return "expire";
            } else {
              setBreathCounter(4);
              return "inspire";
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab, breathPhase]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markSessionComplete = () => {
    if (!sessionCompleted) {
      setSessionCompleted(true);
      onCompleteSession(); // Award a daily check-In streak index!
    }
  };

  const getBreathInstructions = () => {
    switch (breathPhase) {
      case "inspire":
        return {
          title: "Inspire Profundamente",
          desc: "Sinta o sopro de Deus preenchendo seus pulmões com paz.",
          colorClass: "text-amber-400 border-amber-500/20 shadow-amber-500/10",
          ringClass: "scale-110 bg-amber-500/10 border-amber-500/30"
        };
      case "segure":
        return {
          title: "Descanse na Presença",
          desc: "Segure o ar e ofereça este momento silencioso de reverência.",
          colorClass: "text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
          ringClass: "scale-115 bg-emerald-500/15 border-emerald-500/40"
        };
      case "expire":
        return {
          title: "Solte sem Ansiedade",
          desc: "Expulse todas as aflições, pesos e temores entregando-os ao Pai.",
          colorClass: "text-blue-400 border-blue-500/20 shadow-blue-500/10",
          ringClass: "scale-95 bg-blue-500/10 border-blue-500/20"
        };
    }
  };

  const breathData = getBreathInstructions();

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6" id="santuario-experience-frame">
      {/* Header back bar & metadata */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-mystic-800/60 pb-5" id="santuario-header-bar">
        <button
          id="btn-back-to-checkin"
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-mystic-300 hover:text-gold-400 transition-colors self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Fazer Outro Check-In</span>
        </button>

        <div className="text-right sm:text-right hidden sm:block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gold-500 block">Atmosfera Atual</span>
          <span className="font-serif italic text-gold-200 mt-1 block">
            Exame de Alma — {emotionObj ? emotionObj.label : "Contemplativo"}
          </span>
        </div>
      </div>

      {/* Programmatic Music & Sound module */}
      <AmbientSoundPlayer currentAmbient={recommendedAmbient} autoPlayTrigger={true} />

      {/* Content tabs and split panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="santuario-body-grid">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-3 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none" id="santuario-nav-aside">
          <button
            id="tab-btn-prayer"
            onClick={() => setActiveTab("prayer")}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "prayer"
                ? "bg-gold-500 text-mystic-950 font-semibold shadow-md shadow-gold-500/10"
                : "bg-mystic-900 border border-mystic-800 text-mystic-300 hover:text-gold-300 hover:border-mystic-700/80"
            }`}
          >
            <Feather className="w-4 h-4" />
            <span className="font-serif">Oração Guiada</span>
          </button>

          <button
            id="tab-btn-devotional"
            onClick={() => setActiveTab("devotional")}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "devotional"
                ? "bg-gold-500 text-mystic-950 font-semibold shadow-md shadow-gold-500/10"
                : "bg-mystic-900 border border-mystic-800 text-mystic-300 hover:text-gold-300 hover:border-mystic-700/80"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-serif">Devocional Contemplativo</span>
          </button>

          <button
            id="tab-btn-breath"
            onClick={() => setActiveTab("breath")}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "breath"
                ? "bg-gold-500 text-mystic-950 font-semibold shadow-md shadow-gold-500/10"
                : "bg-mystic-900 border border-mystic-800 text-mystic-300 hover:text-gold-300 hover:border-mystic-700/80"
            }`}
          >
            <Wind className="w-4 h-4" />
            <span className="font-serif">Respirar & Silenciar</span>
          </button>
        </div>

        {/* Content viewer */}
        <div className="md:col-span-9 bg-mystic-900/40 border border-mystic-800/70 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[460px]" id="santuario-display-view">
          
          {/* Active Tab: Prayer */}
          {activeTab === "prayer" && (
            <div className="space-y-6 flex-1 flex flex-col justify-between" id="view-prayer-panel">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-mystic-800 pb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gold-500 font-semibold">Espiritualidade Cristã</span>
                    <h3 className="text-xl font-serif text-gold-100 font-medium">Sua Oração de Cura</h3>
                  </div>
                  <button
                    id="btn-copy-prayer"
                    onClick={() => handleCopyText(experience.prayer)}
                    className="p-2 border border-mystic-700 bg-mystic-850 hover:bg-mystic-800 rounded-lg text-mystic-300 hover:text-gold-400 transition-colors"
                    title="Copiar Oração"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Liturgical prayer printing */}
                <p className="text-lg md:text-xl font-serif text-cream-100/90 leading-relaxed font-light italic text-[#fcf9f2]/95 py-2 whitespace-pre-wrap">
                  "{experience.prayer}"
                </p>
              </div>

              <div className="bg-mystic-950/60 p-4 border border-mystic-800/80 rounded-xl mt-6 italic flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-gold-500/10 border border-gold-500/20 text-gold-400 font-mono text-xs mt-0.5">✝</div>
                <div>
                  <span className="font-sans text-[11px] not-italic uppercase tracking-wider text-gold-500 font-semibold block mb-0.5">Promessas de Deus</span>
                  <p className="font-serif text-sm text-gold-100/90 leading-relaxed">
                    "{experience.verse.text}" <span className="font-sans text-xs not-italic text-mystic-300 block mt-1">— {experience.verse.reference}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Devotional */}
          {activeTab === "devotional" && (
            <div className="space-y-6 flex-1 flex flex-col justify-between" id="view-devotional-panel">
              <div className="space-y-5">
                <div className="border-b border-mystic-800 pb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gold-500 font-semibold">Exegese Contemplativa</span>
                  <h3 className="text-xl font-serif text-gold-100 font-medium">{experience.verse.reference}</h3>
                </div>

                {/* Devotional message */}
                <div className="prose prose-invert max-w-none text-mystic-150 leading-relaxed font-sans text-sm md:text-base space-y-4 text-mystic-100/90">
                  {experience.devotional.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <div className="bg-mystic-800/30 p-5 border border-gold-500/10 rounded-xl space-y-2">
                  <span className="font-serif text-xs font-semibold text-gold-400 block tracking-widest uppercase">Palavra de Discernimento</span>
                  <p className="text-xs text-mystic-250 leading-relaxed italic text-mystic-300">
                    {experience.verse.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Breath */}
          {activeTab === "breath" && (
            <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center py-6" id="view-breath-panel">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gold-500 font-semibold mb-2">Desaceleração Cardíaca & Presença</span>
              
              {/* Dynamic Breathing Bubble Ring */}
              <div className="relative w-44 h-44 flex items-center justify-center my-6" id="breathing-stage flex">
                <div className="absolute inset-0 rounded-full border border-gold-500/10 breathing-circle-glow pointer-events-none" />
                <div className={`absolute inset-4 rounded-full border border-mystic-700 transition-all duration-[3500s] duration-[1000ms] ${breathData.ringClass}`} />
                
                {/* Center Core Display */}
                <div className="z-10 bg-mystic-950/90 w-32 h-32 rounded-full border border-mystic-800 flex flex-col items-center justify-center shadow-2xl">
                  <span className="font-serif italic text-lg capitalize font-medium text-cream-100 block">{breathPhase}</span>
                  <span className="font-mono text-3xl font-bold font-light text-gold-400 mt-1">{breathCounter}s</span>
                </div>
              </div>

              {/* Guidance labels */}
              <div className="max-w-md space-y-2 px-4">
                <h4 className={`text-lg font-serif font-medium transition-colors ${breathData.colorClass}`}>{breathData.title}</h4>
                <p className="text-sm text-mystic-350 leading-relaxed text-mystic-300">{breathData.desc}</p>
              </div>

              {/* Instructions summary */}
              <div className="w-full max-w-md bg-mystic-950/60 p-4 border border-mystic-800/80 rounded-xl text-left text-xs text-mystic-300 leading-relaxed mt-6 space-y-1">
                <span className="font-serif text-gold-400 font-semibold block mb-1">Guia Contemplativo Bíblico:</span>
                <p>"{experience.breathExercise}"</p>
              </div>
            </div>
          )}

          {/* Complete Checklist footer element */}
          <div className="border-t border-mystic-800/80 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4" id="santuario-footer-checklist">
            <div>
              <p className="text-xs text-mystic-300 font-sans">
                {sessionCompleted 
                  ? "Sua alma foi ouvida e abençoada hoje." 
                  : "Conclua a oração e o silêncio para consagrar este momento espiritual."
                }
              </p>
            </div>
            
            <button
              id="btn-complete-devotional"
              onClick={markSessionComplete}
              className={`px-5 py-2.5 rounded-xl text-xs font-serif font-medium tracking-wide flex items-center gap-2 transition-all duration-300 ${
                sessionCompleted
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 cursor-default"
                  : "bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-mystic-950 cursor-pointer"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{sessionCompleted ? "Consagrado à Deus" : "Consagrar Devocional"}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
