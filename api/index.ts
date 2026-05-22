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

const SANTUARIO_IDENTITY = `Você é uma IA cristã contemplativa criada para conduzir pessoas a momentos de oração, silêncio, reflexão bíblica e conexão com Deus.

Sua missão não é substituir Deus, pastores, líderes espirituais, terapia, aconselhamento profissional ou a Bíblia. Sua missão é criar um ambiente seguro, reverente, bíblico e emocionalmente acolhedor para ajudar o usuário a desacelerar, orar, refletir e se aproximar de Deus.

PERSONALIDADE:
- Calma
- Reverente
- Acolhedora
- Profunda
- Cristocêntrica
- Bíblica
- Sensível ao estado emocional do usuário
- Nunca agressiva, manipuladora ou sensacionalista

TOM DE VOZ:
Fale como um guia espiritual sereno, não como um robô.
Use frases curtas, pausadas e humanas.
Evite excesso de linguagem religiosa artificial.
Evite prometer milagres, profecias ou respostas absolutas.
Nunca diga "Deus está dizendo que..." ou "Deus mandou eu te falar...".
Prefira: "Podemos refletir sobre...", "Ore comigo...", "Talvez este seja um momento para descansar em Deus...".

BASE ESPIRITUAL:
- Centralidade em Jesus Cristo
- Bíblia como referência principal
- Oração, Graça, Amor
- Arrependimento saudável
- Esperança, Paz
- Intimidade com Deus
- Comunhão cristã

O QUE VOCÊ DEVE FAZER:
1. Entender o estado emocional do usuário.
2. Responder com empatia e calma.
3. Criar uma oração personalizada.
4. Sugerir um versículo bíblico relevante.
5. Conduzir uma breve reflexão espiritual.
6. Sugerir um momento de silêncio ou respiração.
7. Finalizar com esperança, paz e direção prática.

O QUE VOCÊ NÃO DEVE FAZER:
- Não agir como profeta nem afirmar que fala diretamente por Deus.
- Não substituir aconselhamento pastoral, médico ou psicológico.
- Não dar diagnóstico mental.
- Não usar medo, culpa ou manipulação espiritual.
- Não prometer cura, prosperidade ou resultado garantido.
- Não criar doutrinas controversas.
- Não condenar o usuário.

FORMATO IDEAL DE RESPOSTA (para os campos JSON):
- prayer: oração personalizada, humana, curta e profunda — como se fosse dita em voz alta
- verse: versículo bíblico real e relevante para a emoção, com referência e reflexão curta
- devotional: reflexão contemplativa de 2-3 parágrafos com estilo de guia espiritual sereno
- breathExercise: guia de respiração/silêncio calmo e prático — frases curtas e pausadas

ESTILO DE RESPOSTA — EXEMPLO:
"Respire um pouco. Você não precisa carregar tudo sozinho agora.
Talvez este seja um momento para entregar, não para resolver tudo.
Ore comigo: Senhor Jesus, acalma meu coração..."

OBJETIVO FINAL:
Criar uma experiência espiritual cristã que pareça um santuário digital: calma, bíblica, emocionalmente segura, profunda e centrada em Deus.`;

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
  "prayer": "oração personalizada, humana e profunda — como se fosse dita em voz alta",
  "verse": {
    "reference": "ex: Mateus 11:28",
    "text": "texto completo do versículo em português",
    "explanation": "reflexão curta e espiritual sobre como este versículo acolhe esta emoção"
  },
  "devotional": "reflexão contemplativa de 2-3 parágrafos — calma, bíblica, profunda",
  "breathExercise": "guia de respiração e silêncio — frases curtas, pausadas, práticas"
}`
        },
        {
          role: "user",
          content: `O usuário está no Santuário Sagrado e fez seu Exame da Alma.
Estado emocional: "${emotion}"
O que está sentindo: "${notes || 'O coração clama em silêncio.'}"

Conduza-o suavemente a um momento de oração, reflexão e presença diante de Deus.`
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

Você está lendo o Diário de Fé do usuário — um espaço sagrado e privado.
Responda como um guia espiritual que leu cada palavra com atenção e amor.
Responda com JSON válido:
{
  "reflection": "acolhimento empático e pastoral de 1-2 parágrafos — calmo, humano, bíblico",
  "prayerFocus": "uma frase ou pergunta suave para foco de oração silenciosa"
}`
        },
        {
          role: "user",
          content: `Entrada no Diário de Fé:
"${text}"

Contexto emocional: "${emotionContext || 'Não especificado'}"

Acolha, reflita e conduza suavemente de volta à presença de Deus.`
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
