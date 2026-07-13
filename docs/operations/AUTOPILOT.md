# Autopilot operating runbook

Autopilot is the deterministic controller that coordinates discovery, checkpoints, policy, packaging, publication, and distribution. Models provide artifacts; they do not own side effects.

## Operating modes

### `off`
No cycle may start.

### `draft_only`
The system can discover and process stories, but all public release actions remain blocked. This is the installation default.

### `approval_required`
Eligible stories stop at the exact-version owner gate. The owner reviews sources, claims, draft, editorial score, verification, compliance, and cost before packaging and publishing.

### `bounded_autopublish`
Only stories passing all deterministic gates may publish. Enabling this mode requires explicit owner preauthorization, the matching policy version, an acknowledgment timestamp, `auto_publish_enabled=true`, and an execution command carrying `--allow-publish-if-authorized`.

## Twelve checkpoints

1. Signal intake
2. Assignment and lane selection
3. Evidence collection
4. Claim-map construction
5. Draft
6. Editorial quality review
7. Fact verification
8. Risk and compliance classification
9. Deterministic adjudication and approval gate
10. Packaging
11. Release validation and publication
12. Distribution, monitoring, and corrections

Model calls are limited to checkpoints 1–8. Checkpoints 9–12 are controlled by deterministic policy and release tooling.

## Automatic-publication gate

A story cannot auto-publish unless all of the following are true:

- mode and owner preauthorization are valid, unexpired, and tied to the current policy version;
- at least one Newsroom release has already completed direct owner approval and successful publication;
- the scheduler/manual command supplies the explicit execution authorization flag;
- all required checkpoint artifacts exist and validate;
- the draft identity matches the stored story;
- every draft URL belongs to the governed evidence set;
- minimum source, domain-diversity, primary-source, and publication-date thresholds pass;
- all material claims are supported and mapped to known evidence;
- no contradiction or unsupported material claim remains;
- editorial, verification, and confidence scores pass;
- compliance approves and emits no auto-publish blocker;
- risk is allowed and section/topic is not blocked;
- daily story, publication, provider-call, search-call, cost, and spacing limits pass;
- the Git working tree is clean and on `main`;
- the exact draft hash matches the stored policy decision;
- the checksum-sealed Release Manager validates the package;
- Git push and, when configured, Cloudflare release-marker verification succeed.

A failure at any gate blocks or routes the story to owner review.

## Scheduling

The bundled Windows scheduled task runs under the current Windows user and launches `RTFCLMGZN_AUTOPILOT_TASK.bat`. The task is disabled until the owner explicitly enables it. Each run uses a file lock and database reconciliation to prevent overlapping cycles.

## Incident response

Disable scheduling immediately with `DISABLE_RTFCLMGZN_AUTOPILOT.bat` if:

- provider spend is unexpected;
- duplicate or low-quality stories appear;
- Git or Cloudflare deployment fails;
- credentials may be exposed;
- the provider changes an API or model contract;
- a release is factually disputed;
- the local computer is unstable.

Then open the Studio, export the event trail, preserve the database and release package, rotate affected credentials, and run diagnostics before re-enabling anything.
