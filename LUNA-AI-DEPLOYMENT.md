# Luna AI deployment

Luna answers free-form questions through the `luna-ai` action in the `kpi-sync` Edge Function. The browser never receives the OpenAI API key. The server verifies the signed-in account, builds context only from records visible to that account, and allows up to 12 requests per account per minute. AI answers are read-only and cannot create or edit system data.

For questions requiring current or external information, the Edge Function enables only the read-only `web_search` tool with low search context. Luna extracts validated HTTP(S) citations from the provider response and displays numbered links beside the answer plus a source list with titles. Do not include names of staff, projects, or internal tasks in external searches.

Conversation text is retained for seven days in browser storage under the signed-in account. It is available again in the same browser profile, including after logout and login, but it is not a server backup and does not synchronize to another browser or device. Stored messages are rendered as text and older entries are removed on restore/save. Changes to the account's role or access scope prevent old history from being restored.

Luna's daily, weekly, and monthly report summaries use the application's existing report calculators and task permissions. The PDF button opens the current report export flow. Monthly reports remain limited to Admin and the Board of Directors.

## Luna voice services

Voice input uses the browser's built-in Web Speech recognition API (`SpeechRecognition`/`webkitSpeechRecognition`) in one short, user-started session. Luna requests Vietnamese (`vi-VN`), shows interim text, stops after 20 seconds, and returns the result to the existing permission-checked assistant/task-wizard flow. The web app does not record, upload, persist, or send voice audio to its Edge Function. Keep keyboard input available as the fallback.

Voice output uses `SpeechSynthesisUtterance` and the voices installed/provided by the browser and operating system. Luna requests `vi-VN`, selects a matching Vietnamese voice when one is available, and otherwise lets the platform choose its default. Voice names, gender, accent, and pronunciation vary between devices. The microphone is not left open: users press **Nói** and may say “Luna ơi” followed by a request in the same turn. If they only say “Luna ơi”, Luna replies and asks them to press **Nói** again; this avoids trying to reopen the microphone without a fresh user gesture. Task changes still use the existing permission checks and explicit confirmation flow.

Recognition availability depends on the browser, operating system, language pack, network, and microphone permission. In Safari, enable Siri/Dictation where required. Some browser recognition implementations may use the browser vendor's remote speech service; that behavior is outside this application and can vary by platform and settings. The application itself sends no audio to its own server. Always use HTTPS (or localhost); browser permission prompts cannot be bypassed. When recognition is unavailable, blocked, or cannot reach its speech service, Luna reports the condition and leaves text entry usable.

## Deploy

Run these commands from the repository root with an authenticated Supabase CLI linked to the production project:

```powershell
tools\supabase-cli\supabase.exe db push
tools\supabase-cli\supabase.exe secrets set OPENAI_API_KEY="PASTE_API_KEY_HERE" OPENAI_MODEL="gpt-6-luna"
tools\supabase-cli\supabase.exe functions deploy kpi-sync
```

`OPENAI_API_KEY` is for Luna's separate text AI feature only. Browser voice input/output does not require Azure Speech or an audio transcription secret. Do not put secrets in `index.html`, `script.js`, `supabase-config.js`, local storage, or a committed environment file.

Publish frontend release `3.4.106` with the existing Edge Function version `2026.10.28.1`. Run `Deploy-KpiSync.cmd -CheckOnly` to verify the server version and data services. It does not test a browser's voice service. After publishing, test on current Chrome, Edge, and Safari over HTTPS, including the keyboard fallback and task confirmation.
