---
name: arena
description: >
  Idea tournament. Sends N cheap agents (default 16, up to 64 contestants = 127 agents;
  size 50 = 99 agents) to each pitch one idea from a different lens, then they fight in a
  single-elimination bracket - one harsh judge per match - until one champion is left.
  Token-cheap by design: Haiku, low effort, 60-word pitches, no tools, no research.
  Use to pick the strongest startup idea, offer, hook, headline, name or angle out of many.
  Trigger: "/arena", "arena this", "send 100 agents", "make them fight", "idea tournament",
  "battle these ideas". Do NOT use for grading a finished deliverable -> /critic-loop;
  real multi-model review -> /council; fan-out build work -> /send-agents.
---

# /arena - idea tournament

## Run

1. Get `topic` from the user's message. One sentence, includes the buyer and the constraint.
2. Pick `size` (contestants). Agents used = `2 x size - 1`.
   - default `16` (31 agents) - "100 agents" -> `50` (99 agents) - hard max `64`
3. Call the Workflow tool:

```
Workflow({
  scriptPath: "C:/Users/info/.claude/skills/arena/arena.js",
  args: { topic: "<topic>", size: 16, context: "<optional facts, max ~100 words>" }
})
```

4. When it finishes, report: champion (name + pitch + its known weakness), runner-up,
   semifinalists, and the 3 most useful kill-reasons from `fights`. Nothing else.

## Rules

- Measured cost 2026-10-02: ~26K Haiku tokens per agent (mostly fixed system-prompt input).
  size 16 = ~0.8M, size 50 = ~2.6M. Say the estimate before any run above size 16.
- Agents run as `agentType: "Explore"` so they skip CLAUDE.md + memory (was ~47K/agent without).
- Keep it cheap: never raise `model` above `haiku` unless the user asks. `context` stays short -
  it is pasted into every one of the agents.
- The bracket is a sensor, not a verdict. Champion = most persuasive 60-word pitch to a small
  model. Waseem decides. Money decisions still go through `/critic-loop` or `/council`.
- Contestants have no tools and do no research - facts in pitches are unverified.
- To seed with existing ideas instead of generated ones, put them in `context` and say
  "contestants must each defend or improve one of these".
