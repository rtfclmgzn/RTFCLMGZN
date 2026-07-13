# Newsroom Core smoke test

- [ ] `RTFCLMGZN_NEWSROOM.bat` opens a private local dashboard
- [ ] dashboard reports exactly 26 agents, 9 personas, and 12 checkpoints
- [ ] safe demo reaches checkpoint 9 and remains non-publishable
- [ ] process restart preserves stories and events
- [ ] malformed story packages are rejected
- [ ] packages missing checkpoints 1–9 are rejected
- [ ] duplicate slugs are rejected
- [ ] owner approval records the exact draft SHA-256
- [ ] release package includes checksums and only allowed web paths
- [ ] Release Manager refuses a dirty Git workspace
- [ ] release publication creates one commit and bumps all cache markers together
- [ ] new article opens at its hash route after Cloudflare confirms deployment
