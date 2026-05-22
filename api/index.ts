import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(express.json());

let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY environment variable is required");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

app.get("/api/config-status", (req, res) => {
  res.json({ hasApiKey: !!process.env.GROQ_API_KEY });
});

app.post("/api/experience/generate", async (req, res) => {
  try {
    const { emotion, notes } = req.body;
    if (!emotion) return res.status(400).json({ error: "Emotion is required" });

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Você é um compassivo conselheiro espiritual cristão, pastor teologicamente ortodoxo e guia contemplativo.
Responda SEMPRE com um JSON válido contendo exatamente as chaves: prayer (string), verse (objeto com reference, text, explanation), devotional (string), breathExercise (string).
Use tom acolhedor, calmo, poético e contemplativo. Profundidade teológica, sem superficialidade.`
        },
        {
          role: "user",
          content: `O usuário fez um Soul Check-In com o estado emocional: "${emotion}".
Notas adicionais: "${notes || 'Nenhuma nota fornecida'}".

Gere uma experiência contemplativa cristã profunda e personalizada com:
1. prayer: oração guiada profunda que silencia e conecta com Deus
2. verse: { reference, text, explanation } - versículo bíblico relevante em português
3. devotional: devocional de 2-3 parágrafos focando em comunhão e presença de Deus
4. breathExercise: exercício de respiração e silêncio para reverência

Responda APENAS com JSON válido.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia do modelo");
    return res.json(JSON.parse(content));
  } catch (error: any) {
    console.error("Erro ao gerar experiência:", error);
    if (error.message?.includes("GROQ_API_KEY")) {
      return res.status(500).json({ error: "Configure GROQ_API_KEY.", isConfigError: true });
    }
    return res.status(500).json({ error: error.message || "Erro interno" });
  }
});

app.post("/api/journal/reflect", async (req, res) => {
  try {
    const { text, emotionContext } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "O texto do Diário é obrigatório" });

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Você é um guia espiritual cristão amável. Responda SEMPRE com JSON válido contendo: reflection (string) e prayerFocus (string).`
        },
        {
          role: "user",
          content: `O usuário registrou em seu Diário Espiritual: "${text}"
Contexto emocional: "${emotionContext || 'Sem contexto'}".

Gere:
1. reflection: resposta empática e pastoral de 1-2 parágrafos acolhendo e orientando para a graça de Deus
2. prayerFocus: uma frase curta e profunda para foco de oração silenciosa

Responda APENAS com JSON válido.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 600
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia");
    return res.json(JSON.parse(content));
  } catch (error: any) {
    console.error("Erro ao refletir:", error);
    return res.status(500).json({ error: error.message || "Erro interno" });
  }
});

export default app;
