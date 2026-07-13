// Cloudflare Pages Function — studio-grade narration proxy for the Briefing / Listen.
// Route: POST /api/tts   Body: { "text": "...", "voice": "optional-voice-id" }
// Returns: audio/mpeg (the spoken audio).
//
// WHY a server function: the ElevenLabs API key must NEVER ship in the browser. This
// function holds it in a Cloudflare secret and proxies the request, so the key stays private.
//
// TO TURN ON (see VOICE-UPGRADE.md):
//   1. Get an ElevenLabs API key + pick a voice id.
//   2. In the Cloudflare Pages project → Settings → Environment variables, add:
//        ELEVENLABS_KEY   = <your key>          (encrypt it)
//        ELEVENLABS_VOICE = <default voice id>  (a warm female voice)
//   3. Redeploy. The site auto-detects /api/tts and upgrades the narration.
// Until the key is set, this returns 503 and the player falls back to the browser voice.

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.ELEVENLABS_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "voice-not-configured" }), {
      status: 503, headers: { "content-type": "application/json" }
    });
  }
  let body;
  try { body = await request.json(); } catch (e) { return new Response("bad request", { status: 400 }); }
  const text = (body.text || "").toString().slice(0, 2500); // cap per request (cost guard)
  if (!text.trim()) return new Response("empty", { status: 400 });
  const voice = (body.voice || env.ELEVENLABS_VOICE || "EXAVITQu4vr4xnSDxMaL").toString(); // default: a warm female voice

  const upstream = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voice) + "/stream?optimize_streaming_latency=2",
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", "accept": "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",   // fast + cheap; swap to a higher-fidelity model if desired
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
      })
    }
  );
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: "upstream", status: upstream.status, detail: detail.slice(0, 300) }), {
      status: 502, headers: { "content-type": "application/json" }
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" }
  });
}
