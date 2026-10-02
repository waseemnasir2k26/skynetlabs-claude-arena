# SkynetLabs Claude Arena

**Send 100 agents into a bracket. One idea walks out.**

A Claude Code skill that runs an idea tournament. Every contestant agent pitches one idea
from a different lens. Then they fight, single-elimination, with a harsh judge on every
match and a 3-judge panel on the final. The top 4 get a web check: _does this already exist?_

```
/arena a startup idea for people with more money than time, size 50
```

## How it works

```
 SPAWN            FIGHT                              VERIFY
 16 lenses   ->   R1  R2  R3  ... final (3 judges)  ->  top 4 web-checked
 60-word pitch    1 judge per match                    names + URLs of
 + closest rival  sides swapped to cancel A/B bias     closest live products
```

- **Originality is scored.** Each pitch must name the closest existing product and its twist. Clones lose.
- **Judges attack both sides** before picking: you get the worst weakness of every idea, winner included.
- **Bring your own ideas** with `seeds` and let them fight the generated ones.
- **Change the rules** with `criteria` (default: money soonest + genuinely new).

## Cost

Built to be cheap: Haiku, low effort, 60-word pitches, lean agents that skip project memory.
Measured, not estimated:

| Size        | Agents | Haiku tokens | Wall clock |
| ----------- | ------ | ------------ | ---------- |
| 16 + verify | 37     | ~1.0M        | ~6 min     |
| 50          | 99     | ~2.6M        | ~8 min     |

About 26K tokens per agent, nearly all of it fixed system-prompt input.

## Install

Needs Claude Code with the Workflow tool.

```bash
git clone https://github.com/waseemnasir2k26/skynetlabs-claude-arena ~/.claude/skills/arena
```

## Args

| Arg           | Default                       | What                                       |
| ------------- | ----------------------------- | ------------------------------------------ |
| `topic`       | required                      | what the contestants pitch on              |
| `size`        | 16                            | contestants, 2-64 (size 50 = ~100 agents)  |
| `context`     | -                             | short facts pasted into every agent        |
| `criteria`    | money soonest + genuinely new | what judges pick on                        |
| `seeds`       | -                             | your own ideas; contestants defend these   |
| `verify`      | false                         | web-search the top 4 for existing products |
| `finalJudges` | 3                             | panel size on the final                    |
| `model`       | haiku                         | raise at your own cost                     |

## Example: a real run

Topic: _a startup idea that does not exist yet, for buyers with more money than time._
16 contestants, 37 agents, 0 errors.

### Round 3

- **Enterprise Expansion Agent** beat DealBriefs
- **Decision Studio** beat Voice To Viral - "attempts a new category; B simply combines existing tools"

### Final

- **Decision Studio** beat Enterprise Expansion Agent (2-1)

The web check then marked all four finalists `partial`: close neighbours exist for every one,
and it listed them with URLs. That is the point of the last step - the bracket picks the most
persuasive pitch, the check tells you how new it really is.

## Read this before you trust a champion

- The winner is the most persuasive 60-word pitch to a small model. It is a sensor, not a verdict.
- Contestants have no tools. Prices, timelines and market sizes in pitches are invented.
- `verify` finding nothing means "nothing found in three searches", not "nothing exists".

## Files

- `SKILL.md` - skill instructions Claude follows
- `arena.js` - the Workflow script

MIT - built by [SkynetLabs](https://skynetjoe.com)
