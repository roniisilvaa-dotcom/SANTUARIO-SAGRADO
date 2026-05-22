import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Check if Gemini API is configured
app.get("/api/config-status", (req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Post endpoint to generate a personalized spiritual experience based on feelings
app.post("/api/experience/generate", async (req, res) => {
  try {
    const { emotion, notes } = req.body;
    
    if (!emotion) {
      return res.status(400).json({ error: "Emotion is required" });
    }

    const ai = getGeminiClient();
    
    const prompt = `Você é um compassivo conselheiro espiritual cristão, pastor teologicamente ortodoxo e guia contemplativo. 
O usuário está fazendo um 'Soul Check-In' (Exame de Alma). Ele selecionou o estado emocional: "${emotion}".
Informações adicionais do usuário sobre o que está sentindo ou pensando: "${notes || 'Nenhuma nota adicional fornecida'}".

Com base nisso, gere uma experiência contemplativa cristã personalizada e profunda. Não use respostas rasas. Evite jargões acelerados ou barulhentos. Use tom acolhedor, calmo, poético e contemplativo (estilo Apple Wellness, Hallow e Calm).

Gere um JSON estruturado contendo:
1. Uma oração profunda, personalizada e guiada ("prayer") que o silencia e o conecta com Deus.
2. Um versículo bíblico altamente relevante ("verse") contendo a referência clássica em português, o texto completo do versículo e uma breve reflexão de sua aplicação espiritual profunda para este sentimento.
3. Um devocional curto ("devotional") de 2 a 3 parágrafos focando em comunhão, paz e na presença de Deus.
4. Um exercício de silêncio e respiração focado na presença ("breathExercise") para guiar o usuário a relaxar em reverência.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prayer: {
              type: Type.STRING,
              description: "Oração guiada, compassiva e profunda adaptada para o momento emocional do usuário."
            },
            verse: {
              type: Type.OBJECT,
              properties: {
                reference: { type: Type.STRING, description: "A citação do versículo (Ex: Filipenses 4:6-7)." },
                text: { type: Type.STRING, description: "O texto integral do versículo em português." },
                explanation: { type: Type.STRING, description: "Breve explicação sobre as promessas de Deus e seu significado para a emoção descrita." }
              },
              required: ["reference", "text", "explanation"]
            },
            devotional: {
              type: Type.STRING,
              description: "Devocional literário contemplativo em português focado em restaurar a alma."
            },
            breathExercise: {
              type: Type.STRING,
              description: "Instruções físicas e espirituais passo a passo para respiração, silêncio e percepção de Deus (Ex: 'Inspire o sopro de vida... espere na paz...')."
            }
          },
          required: ["prayer", "verse", "devotional", "breathExercise"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Não foi possível obter uma resposta do modelo Gemini.");
    }

    const data = JSON.parse(textOutput.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Erro ao gerar experiência contemplativa:", error);
    // Return a beautiful graceful fallback if API Key is missing or failed
    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "Configure sua GEMINI_API_KEY nas Configurações do AI Studio para habilitar a IA Contemplativa em tempo real.",
        isConfigError: true
      });
    }
    return res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

// Post endpoint for journaling analysis and personalized response
app.post("/api/journal/reflect", async (req, res) => {
  try {
    const { text, emotionContext } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "O texto do Diário Espiritual é obrigatório" });
    }

    const ai = getGeminiClient();

    const prompt = `Você é um guia espiritual cristão amável e atencioso. O usuário registrou as seguintes anotações em seu 'Diário Espiritual contínuo' (Journaling):
"${text}"

Contexto das emoções atuais: "${emotionContext || 'Sem contexto adicional'}".

Escreva uma resposta empática, pastoral e acolhedora de 1 a 2 parágrafos. Essa resposta deve:
- Validar os sentimentos do usuário sem julgamento.
- Orientar o olhar dele para a graça de Deus, descanso e perseverança espiritual.
- Oferecer uma palavra de bênção ou paz no final.
- Sugerir um breve tópico ou pergunta para oração silenciosa.

Gere um JSON estruturado contendo:
1. "reflection": O texto pastoral amigável de reflexão e acolhimento.
2. "prayerFocus": Uma única e profunda pergunta/frase curta para focar no momento de silêncio (Ex: 'Hoje, descanse na pergunta: Onde percebo a graça de Deus no meu cansaço?').`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reflection: { type: Type.STRING, description: "A reflexão pastoral e empática sobre a nota do diário." },
            prayerFocus: { type: Type.STRING, description: "Frase ou instrução focada para oração mental silenciosa." }
          },
          required: ["reflection", "prayerFocus"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Não foi possível gerar reflexão do diário.");
    }

    const data = JSON.parse(textOutput.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Erro ao refletir sobre diário:", error);
    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "Configure sua GEMINI_API_KEY nas Configurações do AI Studio para habilitar a IA Contemplativa em tempo real.",
        isConfigError: true
      });
    }
    return res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

// Build path setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Santuário] Server running on http://localhost:${PORT}`);
  });
}

startServer();
