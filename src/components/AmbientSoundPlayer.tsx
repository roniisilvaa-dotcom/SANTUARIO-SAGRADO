import { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2, Sparkles, Wind, CloudRain, Sun, Trees, Compass } from "lucide-react";

interface AmbientSoundPlayerProps {
  currentAmbient: string; // "rain" | "desert" | "mountain" | "garden" | "dawn"
  autoPlayTrigger?: boolean;
}

export default function AmbientSoundPlayer({ currentAmbient, autoPlayTrigger = false }: AmbientSoundPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [activeVisualizer, setActiveVisualizer] = useState<number[]>([15, 10, 20, 15, 25, 10, 15, 12, 18, 14]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const droneOscsRef = useRef<OscillatorNode[]>([]);
  const visualizerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop sound function
  const stopAllSounds = () => {
    try {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      droneOscsRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      droneOscsRef.current = [];
      setIsPlaying(false);
      
      if (visualizerIntervalRef.current) {
        clearInterval(visualizerIntervalRef.current);
        visualizerIntervalRef.current = null;
      }
      // Set visualizer bars to resting state
      setActiveVisualizer([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    } catch (err) {
      console.error("Error stopping sound synthesis:", err);
    }
  };

  // Sound generator
  const startSynthesis = () => {
    stopAllSounds();

    try {
      // 1. Initialize or resume context
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // 2. Main Volume Gain Node
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume, ctx.currentTime);
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;

      // 3. Noise Buffer (useful for Rain/Wind)
      const bufferSize = 2 * ctx.sampleRate; // 2 seconds
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        channelData[i] = Math.random() * 2 - 1; // white noise
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Filter Node to shape the noise
      const filter = ctx.createBiquadFilter();
      filterNodeRef.current = filter;

      if (currentAmbient === "rain") {
        // Chuva - Soft clicking water noise
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);
        
        // Connect noise to filter, and to main gain
        noiseSource.connect(filter);
        
        const rainGain = ctx.createGain();
        rainGain.gain.setValueAtTime(0.45, ctx.currentTime);
        filter.connect(rainGain);
        rainGain.connect(mainGain);

        // Add slow water-like droplet synth (gentle high resonators)
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          
          osc.type = "sine";
          // High pitched droplets
          osc.frequency.setValueAtTime(1200 + i * 400, ctx.currentTime);
          oscGain.gain.setValueAtTime(0, ctx.currentTime);
          
          osc.connect(oscGain);
          oscGain.connect(mainGain);
          osc.start();
          droneOscsRef.current.push(osc);

          // Periodically schedule droplet blips
          const triggerDroplet = () => {
            if (!isPlaying && !audioCtxRef.current) return;
            const now = ctx.currentTime;
            oscGain.gain.cancelScheduledValues(now);
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(0.04, now + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
            
            // Randomly modulate pitch slightly for natural feel
            osc.frequency.setValueAtTime(1000 + Math.random() * 1400, now);
            
            // Re-schedule
            setTimeout(triggerDroplet, 600 + Math.random() * 1800);
          };
          setTimeout(triggerDroplet, 200 + i * 500);
        }

      } else if (currentAmbient === "desert") {
        // Deserto - Warm sweeping wind
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        filter.Q.setValueAtTime(3.0, ctx.currentTime);
        
        noiseSource.connect(filter);
        
        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.7, ctx.currentTime);
        filter.connect(windGain);
        windGain.connect(mainGain);

        // LFO to modulate filter frequency (creates sweeping wind gust)
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // very slow 12-second sweeps
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(180, ctx.currentTime); // sweeps from 120Hz to 480Hz
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        lfoRef.current = lfo;

      } else if (currentAmbient === "mountain") {
        // Montanha - Alpine quiet wind + sacred choir-like sub hum
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(250, ctx.currentTime);
        
        noiseSource.connect(filter);
        filter.connect(mainGain);

        // Sacred choir hum drone (Deep frequency fifths)
        const freqs = [73.42, 110.0, 146.83, 220.0]; // D2, A2, D3, A3
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          // Low volumes to create therapeutic hum
          const val = idx === 0 ? 0.15 : 0.08;
          oscGain.gain.setValueAtTime(val, ctx.currentTime);
          
          // Subtle detune to avoid phase locks and create organic motion
          osc.detune.setValueAtTime((Math.random() - 0.5) * 12, ctx.currentTime);
          
          osc.connect(oscGain);
          oscGain.connect(mainGain);
          osc.start();
          droneOscsRef.current.push(osc);
        });

      } else if (currentAmbient === "garden") {
        // Jardim - Flowing stream (noise filter) + soft birds chirping resonances
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.Q.setValueAtTime(2.0, ctx.currentTime);
        
        noiseSource.connect(filter);
        
        const streamGain = ctx.createGain();
        streamGain.gain.setValueAtTime(0.3, ctx.currentTime);
        filter.connect(streamGain);
        streamGain.connect(mainGain);

        // Nature melody (pentatonic bells triggering very softly)
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C major pentatonic
        
        const playBell = () => {
          if (!isPlaying && !audioCtxRef.current) return;
          const tone = scale[Math.floor(Math.random() * scale.length)];
          
          const bell = ctx.createOscillator();
          const bellGain = ctx.createGain();
          
          bell.type = "sine";
          bell.frequency.setValueAtTime(tone, ctx.currentTime);
          bellGain.gain.setValueAtTime(0, ctx.currentTime);
          
          bell.connect(bellGain);
          bellGain.connect(mainGain);
          
          const now = ctx.currentTime;
          bellGain.gain.setValueAtTime(0, now);
          bellGain.gain.linearRampToValueAtTime(0.015, now + 0.2);
          bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
          
          bell.start(now);
          bell.stop(now + 4);
          
          setTimeout(playBell, 3000 + Math.random() * 5000);
        };
        setTimeout(playBell, 1000);

      } else if (currentAmbient === "dawn") {
        // Madrugada - Beautiful sacred celestial organ/pad drone
        // F# Major beautiful harmony (F#2, C#3, F#3, A#3, C#4)
        const freqs = [92.50, 138.59, 185.00, 233.08, 277.18];
        
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.07, ctx.currentTime);
          
          // Apply slight automated vibrato/chorus
          osc.detune.setValueAtTime((Math.random() - 0.5) * 15, ctx.currentTime);
          
          // LFO to slowly swell the volume of each node differently to sound alive
          const lfoOsc = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfoOsc.type = "sine";
          lfoOsc.frequency.setValueAtTime(0.05 + idx * 0.02, ctx.currentTime);
          lfoGain.gain.setValueAtTime(0.03, ctx.currentTime);
          
          lfoOsc.connect(lfoGain);
          lfoGain.connect(oscGain.gain);
          lfoOsc.start();
          
          osc.connect(oscGain);
          oscGain.connect(mainGain);
          osc.start();
          
          droneOscsRef.current.push(osc);
          droneOscsRef.current.push(lfoOsc); // save lfo to stop correctly
        });
      }

      // Start the actual noise loop
      noiseSource.start();
      noiseSourceRef.current = noiseSource;
      setIsPlaying(true);

      // Start beautiful audio visualizer simulations
      visualizerIntervalRef.current = setInterval(() => {
        setActiveVisualizer((prev) =>
          prev.map(() => Math.floor(Math.random() * 18) + 6)
        );
      }, 150);

    } catch (err) {
      console.error("Failed to synthesise beautiful ambient loop:", err);
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAllSounds();
    } else {
      startSynthesis();
    }
  };

  // Adjust volume
  useEffect(() => {
    if (mainGainRef.current && audioCtxRef.current) {
      mainGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Clean up on unmount or on currentAmbient change
  useEffect(() => {
    if (isPlaying) {
      // re-start with new ambient definition
      startSynthesis();
    }
    return () => {
      stopAllSounds();
    };
  }, [currentAmbient]);

  // Auto-play adaptation
  useEffect(() => {
    if (autoPlayTrigger && !isPlaying) {
      // Trigger synthesis upon dynamic flow if appropriate
      setTimeout(() => {
        startSynthesis();
      }, 500);
    }
  }, [autoPlayTrigger]);

  const getAmbientIcon = () => {
    switch (currentAmbient) {
      case "rain": return <CloudRain className="w-5 h-5 text-blue-400" id="icon-rain-ambient" />;
      case "desert": return <Wind className="w-5 h-5 text-amber-500" id="icon-desert-ambient" />;
      case "mountain": return <Compass className="w-5 h-5 text-emerald-400" id="icon-mountain-ambient" />;
      case "garden": return <Trees className="w-5 h-5 text-emerald-300" id="icon-garden-ambient" />;
      case "dawn": return <Sun className="w-5 h-5 text-yellow-200" id="icon-dawn-ambient" />;
      default: return <Sparkles className="w-5 h-5 text-gold-400" id="icon-default-ambient" />;
    }
  };

  const getAmbientLabel = () => {
    switch (currentAmbient) {
      case "rain": return "Chuva Suave";
      case "desert": return "Silêncio do Deserto";
      case "mountain": return "Vento da Montanha";
      case "garden": return "Jardim Oração";
      case "dawn": return "Madrugada Sagrada";
      default: return "Ambiente";
    }
  };

  return (
    <div className="bg-mystic-900/90 border border-gold-500/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl" id="ambient-player-panel">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl bg-mystic-800 border ${isPlaying ? 'border-gold-500/40 text-gold-400' : 'border-mystic-700 text-mystic-300'} transition-all`} id="ambient-icon-badge">
          {getAmbientIcon()}
        </div>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gold-500 font-medium">Frequência de Fundo</span>
          <h4 className="text-sm font-semibold text-gold-100 font-serif leading-tight">{getAmbientLabel()}</h4>
          <p className="text-xs text-mystic-300 font-sans mt-0.5">{isPlaying ? "Gerador Contemplativo Ativo" : "Silêncio Completo"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
        {/* Dynamic Visualizer Simulation */}
        <div className="flex items-end gap-1 px-3 h-8 bg-black/25 rounded-md border border-mystic-800/50" id="audio-visualizer-bars">
          {activeVisualizer.map((height, i) => (
            <div
              key={i}
              className={`w-1 rounded-t bg-gold-500/40 ${isPlaying ? 'bg-gold-500' : 'bg-mystic-700'} viz-bar`}
              style={{ height: `${height * 3}px` }}
            />
          ))}
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2" id="volume-slider-group">
          <Volume2 className="w-4 h-4 text-mystic-300" id="volume-icon" />
          <input
            id="volume-slider-input"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-gold-500 bg-mystic-800 hover:accent-gold-400"
          />
        </div>

        {/* Audio control button */}
        <button
          id="btn-toggle-sound"
          onClick={handleTogglePlay}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-medium tracking-wider uppercase transition-all duration-300 ${
            isPlaying
              ? "bg-mystic-800 border border-gold-500/30 text-gold-400 hover:bg-mystic-700"
              : "bg-gold-500 hover:bg-gold-400 text-mystic-950 font-semibold"
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Silenciar</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Gerar Dom</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
