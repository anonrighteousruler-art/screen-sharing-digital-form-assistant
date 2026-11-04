# Form Assistant

A voice agent that watches your shared screen and talks you through filling out an online form, one field at a time. It guides by voice only; you do the clicking and typing.

Built on the Gemini Live API: mic audio and one screen frame per second go up, spoken replies come back.

## Run it

```sh
npm install
npm run build
```

This makes one self-contained file, `dist/index.html`. Open it in Chrome or Edge (double-clicking it works), paste your Gemini key from https://aistudio.google.com/apikey, click **Start**, share the tab or window with your form, and start talking.

For development, `npm run dev` serves it with live reload. You can put the key in `.env` (see `.env.example`) so you don't have to paste it.

## Files

- `src/main.ts` — session setup, system prompt, transcript
- `src/audio.ts` — mic capture (16 kHz PCM) and reply playback (24 kHz PCM)
- `src/screen.ts` — screen capture, one JPEG frame per second

## Notes

- The key you paste is saved in that browser only. Don't host the page publicly with a key baked in through `.env`; for a public site, issue short-lived tokens from a small server instead.
- To try a different Live model, set `VITE_GEMINI_MODEL` in `.env`.
