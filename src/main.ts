import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { Player, startMic } from './audio';
import { startScreen } from './screen';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-3.1-flash-live-preview';

const SYSTEM_PROMPT = `You are a friendly voice assistant helping the user fill out an online form.
You can see the user's shared screen. You cannot click or type; you guide by voice only.
- First, briefly say what the form is and roughly how many fields it has.
- Then go one field at a time, top to bottom: name the field, say where it is on screen, and explain what it wants in plain language.
- Wait for the user to fill it before moving on. Use the screen to confirm it looks right, and point out mistakes or validation errors you see.
- Mention required fields, formats (dates, phone numbers), and dropdown or checkbox choices.
- Keep replies short and conversational. Never read sensitive values (passwords, SSNs, card numbers) back aloud.
- When the form is complete, remind the user to review it before submitting.`;

const toggle = document.getElementById('toggle') as HTMLButtonElement;
const status = document.getElementById('status')!;
const log = document.getElementById('log')!;

let stop: (() => void) | null = null;

function setStatus(text: string) {
  status.textContent = text;
}

// Transcript: append to the current line per speaker until the turn ends.
const current: Record<'user' | 'agent', HTMLParagraphElement | null> = { user: null, agent: null };
function transcribe(who: 'user' | 'agent', text: string) {
  if (!current[who]) {
    current[who] = document.createElement('p');
    current[who]!.className = who;
    current[who]!.textContent = who === 'user' ? 'You: ' : 'Assistant: ';
    log.append(current[who]!);
  }
  current[who]!.textContent += text;
  current[who]!.scrollIntoView({ block: 'end' });
}

async function start() {
  if (!API_KEY) {
    setStatus('Set VITE_GEMINI_API_KEY in .env and restart.');
    return;
  }
  toggle.disabled = true;
  const cleanups: (() => void)[] = [];
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    cleanups.reverse().forEach((f) => f());
    stop = null;
    toggle.textContent = 'Start';
    toggle.className = '';
    toggle.disabled = false;
  };

  try {
    // Ask for the screen first: it needs the click's user gesture.
    let session: Session | null = null;
    cleanups.push(await startScreen((data) => session?.sendRealtimeInput({ video: { data, mimeType: 'image/jpeg' } }), end));

    const player = new Player();
    cleanups.push(() => player.close());

    setStatus('Connecting…');
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_PROMPT,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (msg: LiveServerMessage) => {
          const c = msg.serverContent;
          if (msg.data) player.play(msg.data);
          if (c?.interrupted) player.interrupt();
          if (c?.inputTranscription?.text) transcribe('user', c.inputTranscription.text);
          if (c?.outputTranscription?.text) transcribe('agent', c.outputTranscription.text);
          if (c?.turnComplete) current.user = current.agent = null;
        },
        onerror: (e) => setStatus(`Error: ${e.message}`),
        onclose: (e) => {
          setStatus(e.reason ? `Disconnected: ${e.reason}` : 'Disconnected');
          end();
        },
      },
    });
    const s = session;
    cleanups.push(() => s.close());

    cleanups.push(await startMic((data) => s.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })));
    s.sendRealtimeInput({ text: 'Hi, I need help filling out the form on my screen.' });

    stop = end;
    toggle.textContent = 'Stop';
    toggle.className = 'stop';
    toggle.disabled = false;
    setStatus('Listening');
  } catch (err) {
    setStatus(`Could not start: ${err instanceof Error ? err.message : err}`);
    end();
  }
}

toggle.onclick = () => (stop ? (stop(), setStatus('Stopped')) : start());
