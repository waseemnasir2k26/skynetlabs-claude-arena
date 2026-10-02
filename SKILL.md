---
name: arena
description: >
  Idea tournament. Sends N cheap agents (default 16, up to 64 contestants; size 50 = ~100
  agents) to each pitch one idea from a different lens, then they fight in a
  single-elimination bracket - one harsh judge per match, a 3-judge panel on the final -
  until one champion is left. Optional web novelty check on the top 4 ("does this already
  exist?"). Token-cheap by design: Haiku, low effort, 60-word pitches.
  Use to pick the strongest and most original startup idea, offer, hook, headline, name or
  angle out of many. Trigger: "/arena", "arena this", "send 100 agents", "make them fight",
  "idea tournament", "battle these ideas". Do NOT use for grading a finished deliverable,
  code review, or fan-out build work.
---

# /arena - idea tournament

## Run

1. Get `topic` from the user's message. One sentence, includes the buyer and the constraint.
2. Pick `size` (contestants). Agents used = `2 x size + 1` (+4 with `verify`).
   - default `16` (33 agents) - "100 agents" -> `50` (101 agents) - hard max `64`
3. Call the Workflow tool with the absolute path of `arena.js` in this skill's folder:

```
Workflow({
  scriptPath: "<this skill folder>/arena.js",
  args: {
    topic: "<topic>",
    size: 16,
    context: "<optional facts, max ~100 words>",
    criteria: "<optional: what the judges pick on>",
    seeds: ["<optional existing idea>", "..."],
    verify: true
  }
})
```

4. When it finishes, report: champion (name, pitch, known weakness, novelty verdict),
   the podium, and the 3 most useful kill-reasons from `fights`. `bracketMarkdown` is
   ready to paste if the user wants the full bracket.

## Args

| Arg           | Default                       | What                                                                    |
| ------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `topic`       | required                      | what the contestants pitch on                                           |
| `size`        | 16                            | contestants, 2-64                                                       |
| `context`     | -                             | short facts pasted into every agent - keep it under ~100 words          |
| `criteria`    | money soonest + genuinely new | what judges pick on                                                     |
| `seeds`       | -                             | existing ideas; the first contestants defend these instead of inventing |
| `verify`      | false                         | web-search the top 4 for existing products                              |
| `finalJudges` | 3                             | panel size on the final match                                           |
| `model`       | haiku                         | raise only when asked                                                   |

## Rules

- Measured cost: ~26K Haiku tokens per agent (mostly fixed system-prompt input).
  size 16 = ~0.9M, size 50 = ~2.6M. Say the estimate before any run above size 16.
- Agents run as `agentType: "Explore"` so they skip project instructions and memory.
- The bracket is a sensor, not a verdict. Champion = most persuasive 60-word pitch to a
  small model. A human decides.
- Contestants have no tools: prices, timelines and market sizes in pitches are invented.
- `verify` narrows "does this exist?" - it does not prove nothing exists. Three searches
  by a small model miss things. Report `exists: no` as "nothing found", never as "unique".
