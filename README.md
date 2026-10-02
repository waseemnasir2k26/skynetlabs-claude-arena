# claude-arena

A Claude Code skill that runs an idea tournament: N cheap agents each pitch one idea from a
different lens, then fight in a single-elimination bracket until one champion is left.

- `size` contestants -> `2 x size - 1` agents (size 50 = 99 agents)
- Haiku, low effort, 60-word pitches, no tools - built to stay cheap
- Position-swapped matches so the judge's A/B bias cancels out

## Install

Copy or link this folder to `~/.claude/skills/arena`, then in Claude Code:

```
/arena best startup idea for people with more money than time, size 50
```

## Files

- `SKILL.md` - skill instructions
- `arena.js` - Workflow script (`args: { topic, size, context, model }`)

MIT
