// SPIKE decision log — the autonomous AI Editor-in-Chief's record of stories it
// declined to publish. The newsroom is fully autonomous: flagged stories are
// adjudicated by the AI Editor-in-Chief (publish / remediate-then-publish / spike)
// with NO human in the loop. The rare story it judges cannot be made sound is
// logged here as a SETTLED decision — for transparency and audit, not for approval.
// Nothing in this file is waiting on anyone; it is a record, not a queue.
//
// It surfaces read-only in the decision log at #/review. Object shape mirrors a
// normal article, plus pipeline.gate.decision = "SPIKED by AI Editor-in-Chief"
// and pipeline.gate.triggers = [ ...categories... ] and a rationale.
window.RTFC_PENDING_REVIEW = [];
