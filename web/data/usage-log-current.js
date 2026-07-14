// Append-only continuation of the newsroom usage/change ledger.
// Kept separate so maintenance and emergency fixes can be appended without rewriting history.
(function(){
  var rows = [
    { id:"u-0082", ts:"2026-07-14T18:18:00Z", article_id:"live-017", agent:"research", task_type:"research", model:"gpt-5.6-sol", description:"Researched and structured the GPT-5.6 model-family article for owner-approved publication", input_tokens:8500, output_tokens:1200, measured:"estimated" },
    { id:"u-0083", ts:"2026-07-14T18:22:00Z", article_id:"live-018", agent:"research", task_type:"research", model:"gpt-5.6-sol", description:"Researched AI infrastructure constraints across compute, power, cooling and permitting", input_tokens:10000, output_tokens:1500, measured:"estimated" },
    { id:"u-0084", ts:"2026-07-14T18:26:00Z", article_id:"live-019", agent:"research", task_type:"research", model:"gpt-5.6-sol", description:"Researched the OpenAI, Google, Anthropic and Meta ecosystem competition article", input_tokens:9000, output_tokens:1300, measured:"estimated" },
    { id:"u-0085", ts:"2026-07-14T18:34:00Z", article_id:"system", agent:"publishing", task_type:"site", model:"gpt-5.6-sol", description:"Published the approved three-story batch, diagnosed the frontend failure and restored the last known-good site revision", input_tokens:12000, output_tokens:2200, measured:"estimated" },
    { id:"u-0086", ts:"2026-07-14T18:49:00Z", article_id:"system", agent:"publishing", task_type:"site", model:"gpt-5.6-sol", description:"Republished the three-story batch through the corrected content path with valid newsroom persona keys", input_tokens:6500, output_tokens:1200, measured:"estimated" },
    { id:"u-0087", ts:"2026-07-14T19:02:00Z", article_id:"system", agent:"managing-editor", task_type:"quality", model:"gpt-5.6-sol", description:"Expanded three briefs into full synthesis-length articles and reconciled visible format with actual word count", input_tokens:10500, output_tokens:5200, measured:"estimated" },
    { id:"u-0088", ts:"2026-07-14T19:18:00Z", article_id:"system", agent:"managing-editor", task_type:"policy", model:"gpt-5.6-sol", description:"Added source-aware format planning: brief for narrow evidence, synthesis for multi-source reporting, research for deep primary-source stacks", input_tokens:7000, output_tokens:2200, measured:"estimated" },
    { id:"u-0089", ts:"2026-07-14T19:21:00Z", article_id:"system", agent:"layout-production", task_type:"image-policy", model:"gpt-5.6-sol", description:"Added a 90-day cover-image cooldown registry, same-batch uniqueness rule and generation fallback policy", input_tokens:8000, output_tokens:3000, measured:"estimated" },
    { id:"u-0090", ts:"2026-07-14T19:33:00Z", article_id:"system", agent:"data-desk", task_type:"benchmark-scan", model:"gpt-5.6-sol", description:"Scanned current Artificial Analysis, SWE-bench and Terminal-Bench leaderboards and refreshed the model scoreboard", input_tokens:9000, output_tokens:1800, measured:"estimated" },
    { id:"u-0091", ts:"2026-07-14T19:38:00Z", article_id:"system", agent:"publishing", task_type:"observability", model:"gpt-5.6-sol", description:"Repaired the stale usage ledger and added mandatory change logging for future publication and maintenance commits", input_tokens:5000, output_tokens:1600, measured:"estimated" }
  ];
  if(!Array.isArray(window.RTFC_USAGE_LOG)) window.RTFC_USAGE_LOG=[];
  var seen={}; window.RTFC_USAGE_LOG.forEach(function(r){seen[r.id]=1;});
  rows.forEach(function(r){if(!seen[r.id]) window.RTFC_USAGE_LOG.push(r);});
})();
