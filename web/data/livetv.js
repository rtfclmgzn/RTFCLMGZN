/* ============================================================
   RTFC_LIVETV — curated "what's live / upcoming" AI streaming board.
   We do NOT host or embed streams (embeds go dark + break); we point
   readers to the real channels that go live for launches, keynotes,
   and running AI coverage. The Buzz/Events desks keep this current.
   Each entry links OUT to the channel's live page.
   NEVER invent a stream or claim something is live that isn't — this
   is a directory of where to watch, not a fabricated schedule.
   ============================================================ */
window.RTFC_LIVETV = {
  updated: "2026-08-26",
  // Channels that reliably livestream AI launches, keynotes & talks.
  channels: [
    { name:"OpenAI", who:"Model launches & live demos", cadence:"Livestreams major releases",
      tag:"labs", url:"https://www.youtube.com/@OpenAI/streams" },
    { name:"Google DeepMind", who:"Research & product keynotes", cadence:"Event-driven",
      tag:"labs", url:"https://www.youtube.com/@GoogleDeepMind/streams" },
    { name:"Anthropic", who:"Claude launches & safety talks", cadence:"Event-driven",
      tag:"labs", url:"https://www.youtube.com/@anthropic-ai/streams" },
    { name:"NVIDIA", who:"GTC keynotes & hardware reveals", cadence:"Keynote season",
      tag:"compute", url:"https://www.youtube.com/@NVIDIA/streams" },
    { name:"Microsoft", who:"Copilot & Azure AI events", cadence:"Event-driven",
      tag:"products", url:"https://www.youtube.com/@Microsoft/streams" },
    { name:"Meta", who:"Llama, Connect & AI hardware", cadence:"Event-driven",
      tag:"labs", url:"https://www.youtube.com/@Meta/streams" },
    { name:"Two Minute Papers", who:"New AI research, explained", cadence:"Several a week",
      tag:"research", url:"https://www.youtube.com/@TwoMinutePapers/streams" },
    { name:"Yannic Kilcher", who:"Paper deep-dives & live discussion", cadence:"Weekly-ish",
      tag:"research", url:"https://www.youtube.com/@YannicKilcher/streams" },
    { name:"Lex Fridman", who:"Long-form AI conversations", cadence:"Weekly",
      tag:"voices", url:"https://www.youtube.com/@lexfridman/streams" },
    { name:"The AI Daily Brief", who:"Daily AI news show", cadence:"Daily",
      tag:"news", url:"https://www.youtube.com/@AIDailyBrief/streams" },
    { name:"Matthew Berman", who:"Model tests & AI news, live", cadence:"Most days",
      tag:"news", url:"https://www.youtube.com/@matthew_berman/streams" },
    { name:"IEEE Spectrum", who:"Robotics & engineering", cadence:"Event-driven",
      tag:"robotics", url:"https://www.youtube.com/@ieeespectrum/streams" }
  ],
  tags: {
    labs:"AI labs", compute:"Chips & compute", products:"Products",
    research:"Research", voices:"Conversations", news:"News shows", robotics:"Robotics"
  }
};
