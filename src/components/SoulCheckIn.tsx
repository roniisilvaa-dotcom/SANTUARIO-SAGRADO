import React, { useState } from "react";
import { Sparkles, Heart, Moon, Sunset, Sunset as Sunrise, Compass, Loader2 } from "lucide-react";
import { EmotionOption } from "../types";

interface SoulCheckInProps {
  onExperienceGenerated: (data: any, selectedEmotion: string) => void;
}

export const SUPPORTED_EMOTIONS: EmotionOption[] = [
  {
    id: "ansiedade",
    label: "Ansiedade",
    description: "Coração acelerado, mente inquieta ou preocupação excessiva.",
    color: "from-blue-600 to-indigo-800",
    badgeBg: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    ambientSound: "rain",
  },
  {
    id: "solidão",
    label: "Solidão",
    description: "Sentimento de desamparo, isolamento ou desconexão dos outros.",
    color: "from-sky-700 to-slate-900",
    badgeBg: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    ambientSound: "desert",
  },
  {
    id: "culpa",
    label: "Culpa & Remorso",
    description: "Sentimento de peso espiritual por erros cometidos no passado.",
    color: "from-purple-800 to-slate-950",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    ambientSound: "dawn",
  },
  {
    id: "cansaço",
    label: "Cansaço Espiritual",
    description: "Aridez espiritual, falta de energia para orar ou buscar devocionais.",
    color: "from-amber-800 to-amber-950",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    ambientSound: "mountain",
  },
  {
    id: "medo",
    label: "Medo & Insegurança",
    description: "Temores diante das incertezas da vida ou decisões críticas futuras.",
    color: "from-rose-800 to-rose-950",
    badgeBg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    ambientSound: "desert",
  },
  {
    id: "direção",
    label: "Falta de Direção",
    description: "Necessidade de sabedoria e discernimento para caminhos a tomar.",
    color: "from-emerald-800 to-cyan-950",
    badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    ambientSound: "mountain",
  },
  {
    id: "gratidão",
    label: "Gratidão & Paz",
    description: "Coração transbordando de reverência e desejo de adorar a Deus.",
    color: "from-yellow-700 to-amber-800",
    badgeBg: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    ambientSound: "garden",
  },
  {
    id: "confusão",
    label: "Confusão Emocional",
    description: "Múltiplos sentimentos misturados, ruído e falta de clareza.",
    color: "from-violet-800 to-zinc-900",
    badgeBg: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    ambientSound: "dawn",
  }
];

export default function SoulCheckIn({ onExperienceGenerated }: SoulCheckInProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [extraNotes, setExtraNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleStartExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmotion) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const selected = SUPPORTED_EMOTIONS.find(emp => emp.id === selectedEmotion);
      const res = await fetch("/api/experience/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: selected ? selected.label : selectedEmotion,
          notes: extraNotes,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro ao gerar sua oratória guiada.");
      }

      onExperienceGenerated(data, selectedEmotion);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Não foi possível conectar ao servidor divino do Santuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4" id="soul-check-in-container">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="font-mono text-xs text-gold-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
          <Heart className="w-3.5 h-3.5 fill-current" /> Autoexame Contemplativo
        </span>
        <h1 className="text-4xl md:text-5xl font-serif text-gold-100 mt-3 font-medium tracking-tight">
          Como está sua alma hoje?
        </h1>
        <p className="text-base text-mystic-300 font-sans mt-3">
          A verdadeira conexão começa com a honestidade diante do Pai. Desacelere, respire fundo e selecione a atmosfera emocional que melhor descreve seu coração neste instante.
        </p>
      </div>

      <form onSubmit={handleStartExperience} className="space-y-8" id="soul-check-in-form">
        {/* Sentiment grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="emotion-grid">
          {SUPPORTED_EMOTIONS.map((emp) => {
            const isSelected = selectedEmotion === emp.id;
            return (
              <button
                key={emp.id}
                id={`btn-emotion-${emp.id}`}
                type="button"
                onClick={() => setSelectedEmotion(emp.id)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  isSelected
                    ? "bg-mystic-800 border-gold-500 shadow-xl shadow-gold-500/5 translate-y-[-2px]"
                    : "bg-mystic-900 border-mystic-800/80 hover:border-mystic-700/80"
                }`}
              >
                {/* Accent decoration inside the selected card */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gold-500/10 rounded-bl-3xl flex items-center justify-center border-l border-b border-gold-500/20">
                    <Sparkles className="w-3 h-3 text-gold-400" />
                  </div>
                )}
                
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase font-medium border ${emp.badgeBg} mb-3`}>
                  {emp.label}
                </span>
                
                <p className="text-xs text-mystic-300 line-clamp-3 group-hover:text-mystic-200 transition-colors leading-relaxed">
                  {emp.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Text Area for detailed expressions */}
        <div className="bg-mystic-900/40 border border-mystic-800 rounded-2xl p-6 space-y-4" id="extra-notes-box">
          <label htmlFor="extra-notes-input" className="block">
            <span className="text-sm font-serif font-medium text-gold-200">Abra seu coração (Opcional)</span>
            <span className="block text-xs text-mystic-300 mt-1 font-sans">
              Escreva quaisquer detalhes adicionais, preocupações específicas, orações que gostaria de incluir ou motivos de ansiedade. Nossa Inteligência Espiritual moldará a oração de forma totalmente íntima.
            </span>
          </label>
          <textarea
            id="extra-notes-input"
            rows={4}
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            disabled={loading}
            placeholder="Ex: Estou preocupado com a saúde do meu pai... Sinto que estou muito focado no trabalho e distante dos caminhos do Evangelho ultimamente."
            className="w-full bg-mystic-950 border border-mystic-800 rounded-xl p-4 text-sm text-gold-100 placeholder:text-mystic-300/40 focus:outline-none focus:border-gold-500/40 focus:ring-1 focus:ring-gold-500/30 transition-all font-sans"
          />
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl leading-relaxed font-sans" id="checkin-error-banner">
            <span className="font-semibold block font-serif text-rose-200 mb-0.5">Aviso do Santuário</span>
            {errorMsg}
          </div>
        )}

        {/* Trigger Button */}
        <div className="flex items-center justify-center pt-2" id="action-trigger-area">
          <button
            id="btn-generate-experience"
            type="submit"
            disabled={!selectedEmotion || loading}
            className={`w-full max-w-sm py-4 px-8 rounded-2xl font-serif text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-300 ${
              selectedEmotion && !loading
                ? "bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 text-mystic-950 hover:opacity-95 font-semibold hover:scale-[1.01] shadow-lg shadow-gold-500/10"
                : "bg-mystic-800 text-mystic-300 cursor-not-allowed border border-mystic-700/50"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" id="loading-spinner-checkin" />
                <span className="font-sans text-sm tracking-wide">Silenciando a alma e guiando a oração...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5 fill-current" />
                <span>Entrar no Santuário Contemplativo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
