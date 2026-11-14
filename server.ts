import 'dotenv/config';
import express, {type Request, type Response} from 'express';
import {GoogleGenAI, ThinkingLevel, type Content} from '@google/genai';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_ID = 'gemini-4-hydrogen';

const SYSTEM_INSTRUCTION = `You are Nena AI, a helpful, intelligent, and friendly AI assistant.

Core Language Rules (CRITICAL):
1. Always detect the language of the user's latest message automatically and reply fluently, naturally, and accurately in that exact same language.
2. Support Sinhala (සිංහල), Tamil (தமிழ்), English, Hindi, Japanese, Arabic, Spanish, French, German, Chinese, Korean, and all other major world languages.
3. If the user writes in Sinhala script (සිංහල), reply in clear, natural, grammatically accurate Sinhala script. If the user writes in Singlish (romanized Sinhala), reply in natural Sinhala (or match their preference if they ask for English/Singlish).
4. If the user explicitly asks to translate or switch languages, follow their instruction.

Formatting & Tone:
- Be concise, accurate, and directly helpful.
- Use clean Markdown formatting (headings, bullet lists, numbered steps, tables, and fenced code blocks with language tags) when it improves readability.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ClientMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatError(err: unknown): {status: number; message: string} {
  const raw = err instanceof Error ? err.message : String(err);
  const statusMatch = raw.match(/\b(400|401|403|404|429|500|503)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;

  if (status === 403 || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'API key is missing or invalid. Please check your key in Settings > Secrets.',
    };
  }
  if (status === 429 || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit reached. Please wait a moment and try again.',
    };
  }
  if (status === 404 || raw.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: 'The AI model is temporarily unavailable. Please try again.',
    };
  }
  return {
    status,
    message: raw || 'Unable to generate a response right now. Please try again.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '2mb'}));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({status: 'ok'});
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = req.body as {messages?: ClientMessage[]};
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const validMessages = messages.filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    );

    if (validMessages.length === 0) {
      res.status(400).json({error: 'Please enter a message.'});
      return;
    }

    const lastMessage = validMessages[validMessages.length - 1];
    if (lastMessage.role !== 'user') {
      res.status(400).json({error: 'The latest message must be from the user.'});
      return;
    }

    // Build prior conversation history ensuring clean role alternation
    const prior = validMessages.slice(0, -1);
    const history: Content[] = [];
    for (const msg of prior) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
      const prev = history[history.length - 1];
      if (prev && prev.role === geminiRole) {
        prev.parts = [{text: `${prev.parts?.[0]?.text ?? ''}\n\n${msg.content}`}];
      } else {
        history.push({
          role: geminiRole,
          parts: [{text: msg.content}],
        });
      }
    }

    let aborted = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        aborted = true;
      }
    });

    try {
      const ai = getGeminiClient();
      const chat = ai.chats.create({
        model: MODEL_ID,
        history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const stream = await chat.sendMessageStream({
        message: lastMessage.content,
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      for await (const chunk of stream) {
        if (aborted) break;
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({text})}\n\n`);
        }
      }

      if (!aborted) {
        res.write(`data: ${JSON.stringify({done: true})}\n\n`);
      }
      res.end();
    } catch (err) {
      const {status, message} = formatError(err);
      if (!res.headersSent) {
        res.status(status).json({error: message});
      } else if (!aborted) {
        res.write(`data: ${JSON.stringify({error: message})}\n\n`);
        res.end();
      }
    }
  });

  app.post('/api/chat/title', async (req: Request, res: Response) => {
    const body = req.body as {message?: string};
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      res.status(400).json({error: 'Message is required'});
      return;
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: message.slice(0, 500),
        config: {
          systemInstruction:
            'Generate a concise 2 to 5 word conversation title in the exact same language as the input message (including Sinhala, Tamil, English, etc.). Return ONLY the title text without quotes, markdown, or trailing punctuation.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });
      const title = (response.text ?? '').trim().replace(/^["']|["']$/g, '');
      res.json({title: title || message.slice(0, 36)});
    } catch {
      res.json({title: message.slice(0, 36)});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nena AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
