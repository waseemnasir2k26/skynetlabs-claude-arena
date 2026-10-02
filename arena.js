export const meta = {
  name: "arena",
  description:
    "Idea tournament: N cheap agents pitch, then fight in a single-elimination bracket",
  whenToUse:
    "Pick the strongest idea/angle/name/hook out of many, cheaply. args: {topic, size, context, model}",
  phases: [
    { title: "Spawn", detail: "one contestant per lens, short pitch each" },
    { title: "Fight", detail: "single-elimination, one judge per match" },
  ],
};

// args: "topic string" | { topic, size?, context?, model? }
// Agent count = size + (size - 1). size 50 -> 99 agents.
const a = typeof args === "string" ? { topic: args } : args || {};
const topic = a.topic;
if (!topic) throw new Error("arena: args.topic is required");
const size = Math.max(2, Math.min(64, Number(a.size) || 16));
const context = a.context ? `\nContext: ${a.context}` : "";
const model = a.model || "haiku";

const LENSES = [
  "cheapest to build in 2 weeks",
  "highest price per customer",
  "most defensible moat",
  "fastest to first paying customer",
  "contrarian: what everyone else ignores",
  "boring but recurring revenue",
  "done-for-you service wrapped as software",
  "rides an existing platform or dataset",
  "narrowest possible niche",
  "biggest market if it works",
  "easiest to explain in one sentence",
  "strongest word-of-mouth loop",
];

const PITCH = {
  type: "object",
  properties: {
    name: { type: "string", description: "2-4 words" },
    pitch: {
      type: "string",
      description: "max 60 words: what, who pays, how much, why it wins",
    },
  },
  required: ["name", "pitch"],
};
const VERDICT = {
  type: "object",
  properties: {
    weakness_a: { type: "string", description: "max 15 words" },
    weakness_b: { type: "string", description: "max 15 words" },
    winner: { type: "string", enum: ["A", "B"] },
    reason: { type: "string", description: "max 20 words" },
  },
  required: ["weakness_a", "weakness_b", "winner", "reason"],
};

phase("Spawn");
let fighters = (
  await parallel(
    Array.from(
      { length: size },
      (_, i) => () =>
        agent(
          `You are contestant #${i + 1} in an idea tournament. Topic: ${topic}${context}\n` +
            `Your lens: ${LENSES[i % LENSES.length]} (variant ${Math.floor(i / LENSES.length) + 1} - be different from the obvious answer).\n` +
            `Pitch ONE concrete idea. No tools, no research, answer from what you know. Max 60 words.`,
          {
            label: `pitch:${i + 1}`,
            phase: "Spawn",
            schema: PITCH,
            model,
            effort: "low",
          },
        ).then((p) => p && { id: i + 1, ...p, wins: 0 }),
    ),
  )
).filter(Boolean);
if (fighters.length < size)
  log(`${size - fighters.length} contestants failed to pitch - dropped`);
if (!fighters.length) throw new Error("arena: no contestants produced a pitch");

phase("Fight");
const fights = [];
let round = 0;
let lastLosers = [];
while (fighters.length > 1) {
  round++;
  const pairs = [];
  for (let i = 0; i + 1 < fighters.length; i += 2)
    pairs.push([fighters[i], fighters[i + 1]]);
  const bye = fighters.length % 2 ? fighters[fighters.length - 1] : null;
  const r = round;
  const winners = await parallel(
    pairs.map(([x, y], m) => async () => {
      // swap sides on odd matches so position bias cancels out
      const [A, B] = m % 2 ? [y, x] : [x, y];
      const v = await agent(
        `Tournament judge. Topic: ${topic}${context}\n` +
          `A) ${A.name}: ${A.pitch}\nB) ${B.name}: ${B.pitch}\n` +
          `Attack both: name the worst weakness of each. Then pick the one more likely to make real money soonest. No tools. Be harsh, be brief.`,
        {
          label: `r${r}:${A.name} vs ${B.name}`,
          phase: "Fight",
          schema: VERDICT,
          model,
          effort: "low",
        },
      );
      if (!v) log(`r${r} judge failed: ${A.name} advances by default`);
      const win = !v || v.winner === "A" ? A : B;
      const lose = win === A ? B : A;
      fights.push({
        round: r,
        winner: win.name,
        loser: lose.name,
        reason: v ? v.reason : "judge failed",
        loserWeakness: v ? (lose === A ? v.weakness_a : v.weakness_b) : "",
      });
      win.wins++;
      win.knownWeakness = v
        ? win === A
          ? v.weakness_a
          : v.weakness_b
        : win.knownWeakness;
      return { win, lose };
    }),
  );
  const ok = winners.filter(Boolean);
  lastLosers = ok.map((w) => w.lose);
  fighters = ok.map((w) => w.win);
  if (bye) fighters.push(bye);
  log(`round ${round}: ${fighters.length} left`);
}

const champion = fighters[0];
return {
  topic,
  agentsUsed: size + fights.length,
  champion: {
    name: champion.name,
    pitch: champion.pitch,
    wins: champion.wins,
    knownWeakness: champion.knownWeakness,
  },
  runnerUp: lastLosers[0] && {
    name: lastLosers[0].name,
    pitch: lastLosers[0].pitch,
  },
  semifinalists: fights
    .filter((f) => f.round === round - 1)
    .map((f) => f.loser),
  fights,
};
