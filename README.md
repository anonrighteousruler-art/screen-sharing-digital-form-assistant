# Form Assistant

A voice agent that watches your shared screen and talks you through filling out an online form, one field at a time. It guides by voice only; you do the clicking and typing.

Built on the Gemini Live API: mic audio and one screen frame per second go up, spoken replies come back.

## Run it

```sh
npm install
cp .env.example .env   # add your key from https://aistudio.google.com/apikey
npm run dev
```

Open the local URL in Chrome or Edge, click **Start**, share the tab or window with your form, and start talking.

## Files

- `src/main.ts` — session setup, system prompt, transcript
- `src/audio.ts` — mic capture (16 kHz PCM) and reply playback (24 kHz PCM)
- `src/screen.ts` — screen capture, one JPEG frame per second

## Notes

- The API key is bundled into the page, so this is for running locally. Before hosting it publicly, issue short-lived tokens from a small server instead.
- To try a different Live model, set `VITE_GEMINI_MODEL` in `.env`.
