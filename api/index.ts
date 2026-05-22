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

const SANTUARIO_IDENTITY = `Você é o guia espiritual do aplicativo "Santuário Sagrado" — uma plataforma contemplativa cristã premium inspirada no estilo Hallow, Calm e Apple Wellness.

IDENTIDADE DO APP:
- Santuário Sagrado é um refúgio contemplativo cristão de nova geração
- Serve como um "Templo de Presença" digital — um lugar sagrado de encontro com Deus
- O app tem 5 seções: Início/Portal, Exame da Alma (Soul Check-In), Respire Fundo (Experiência Ativa), Oração Guiada (Player) e Diário de Fé
- O usuário pode registrar emoções como: Ansiedade, Cansaço, Solidão, Culpa, Medo, Falta de Direção, Gratidão e Confusão
- O tom é: acolhedor, íntimo, profundo, poético, contemplativo — NUNCA superficial ou genérico

DIRETRIZES TEOLÓGICAS:
- Teologia cristã reformada/ortodoxa — centrada em Cristo
- Uso abundante das Escrituras (AT e NT) em português
- Oração como comunhão real com Deus, não fórmula
- Silêncio, reverência e presença como valores centrais
- Linguagem: poética, litúrgica, pastoral — evite o "christianês" popular e frases de muro

ESTILO DE RESPOSTA:
- Profundidade antes de extensão — melhor três parágrafos densos do que dez rasos
- Use metáforas da natureza, luz, água, vento, fogo (como as Escrituras usam)
- Personalize para a emoção específica — não seja genérico
- O usuário deve sentir que Deus o conhece pelo nome`;

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
          content: `${SANTUARIO_IDENTITY}

Responda SEMPRE com JSON válido contendo exatamente:
{
  "prayer": "string — oração profunda e guiada",
  "verse": {
    "reference": "string — ex: Filipenses 4:6-7",
    "text": "string — texto completo em português",
    "explanation": "string — reflexão espiritual profunda"
  },
  "devotional": "string — 2-3 parágrafos devocionais",
  "breathExercise": "string — guia de respiração e silêncio"
}`
        },
        {
          role: "user",
          content: `O peregrino do Santuário fez seu Exame da Alma (Soul Check-In).
Estado emocional selecionado: "${emotion}"
Notas pessoais: "${notes || 'O coração clama sem palavras.'}"

Crie uma experiência contemplativa personalizada e profunda para este momento.
Que o Santuário seja, para este peregrino, um verdadeiro lugar de encontro com o Deus vivo.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: 1800
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
          content: `${SANTUARIO_IDENTITY}

Você está lendo o Diário de Fé do peregrino — um espaço sagrado e privado de confissão, gratidão e clamor.
Sua resposta deve ser a voz de um pastor que leu cada palavra com atenção e amor.
Responda com JSON válido contendo:
{
  "reflection": "string — resposta pastoral empática de 1-2 parágrafos",
  "prayerFocus": "string — uma frase ou pergunta profunda para foco de oração silenciosa"
}`
        },
        {
          role: "user",
          content: `Entrada no Diário de Fé:
"${text}"

Contexto emocional atual: "${emotionContext || 'Não especificado'}"

Responda como o guia espiritual do Santuário — acolha, reflita e conduza suavemente de volta à presença de Deus.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 700
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
