export const meta = {
  name: "arena",
  description:
    "Idea tournament: N cheap agents pitch, fight in a bracket, finalists get a web novelty check",
  whenToUse:
    "Pick the strongest and most original idea/angle/name/hook out of many, cheaply. args: {topic, size, context, criteria, seeds, verify, finalJudges, model}",
  phases: [
    { title: "Spawn", detail: "one contestant per lens, short pitch each" },
    {
      title: "Fight",
      detail: "single-elimination, panel of judges on the final",
    },
    { title: "Verify", detail: "web check: do the top 4 already exist?" },
  ],
};

// args: "topic string" | { topic, size?, context?, criteria?, seeds?, verify?, finalJudges?, model? }
// Agents = size + (size - 1) + (finalJudges - 1) + (verify ? up to 4 : 0)
const a = typeof args === "string" ? { topic: args } : args || {};
const topic = a.topic;
if (!topic) throw new Error("arena: args.topic is required");
const seeds = Array.isArray(a.seeds) ? a.seeds.filter(Boolean) : [];
const size = Math.max(
  2,
  Math.min(64, Number(a.size) || Math.max(16, seeds.length)),
);
const context = a.context ? `\nContext: ${a.context}` : "";
const model = a.model || "haiku";
const finalJudges = Math.max(1, Math.min(5, Number(a.finalJudges) || 3));
const criteria =
  a.criteria ||
  "more likely to make real money soonest AND is genuinely new. A clone of a product that already exists loses to an original idea, even a rougher one";

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
  "collide two unrelated industries",
  "a habit rich people already pay a human for",
  "something that only became possible this year",
  "the opposite of the obvious answer",
];

const PITCH = {
  type: "object",
  properties: {
    name: { type: "string", description: "2-4 words" },
    pitch: {
      type: "string",
      description: "max 60 words: what, who pays, how much, why it wins",
    },
    closest_existing: {
      type: "string",
      description: "most similar product you know of, or 'none known'",
    },
    twist: {
      type: "string",
      description: "max 20 words: what makes this different from that product",
    },
  },
  required: ["name", "pitch", "closest_existing", "twist"],
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
const NOVELTY = {
  type: "object",
  properties: {
    exists: {
      type: "string",
      enum: ["yes", "partial", "no"],
      description:
        "yes = a live product does the same thing for the same buyer; partial = close neighbours only; no = nothing found",
    },
    closest: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: { name: { type: "string" }, url: { type: "string" } },
        required: ["name"],
      },
    },
    gap: {
      type: "string",
      description:
        "max 25 words: what the idea does that the closest ones do not",
    },
  },
  required: ["exists", "closest", "gap"],
};

const card = (f) =>
  `${f.name}: ${f.pitch} [closest existing: ${f.closest_existing}; twist: ${f.twist}]`;

phase("Spawn");
let fighters = (
  await parallel(
    Array.from({ length: size }, (_, i) => () => {
      const brief =
        i < seeds.length
          ? `Your job: defend and sharpen this existing idea, keep its core: "${seeds[i]}"`
          : `Your lens: ${LENSES[i % LENSES.length]} (variant ${Math.floor(i / LENSES.length) + 1} - skip the first idea that comes to mind, it is taken).`;
      return agent(
        `You are contestant #${i + 1} in an idea tournament. Topic: ${topic}${context}\n` +
          `${brief}\n` +
          `Pitch ONE concrete idea. Originality is scored: name the closest product that already exists and your twist on it. ` +
          `No tools, no research, answer from what you know. Max 60 words.`,
        {
          label: `pitch:${i + 1}`,
          phase: "Spawn",
          schema: PITCH,
          model,
          effort: "low",
          agentType: "Explore",
        },
      ).then((p) => p && { id: i + 1, ...p, wins: 0 });
    }),
  )
).filter(Boolean);
if (fighters.length < size)
  log(`${size - fighters.length} contestants failed to pitch - dropped`);
if (!fighters.length) throw new Error("arena: no contestants produced a pitch");

// One match. `votes` judges, sides swapped per judge and per match so position bias cancels out.
const fight = async (x, y, r, m, votes) => {
  const ballots = (
    await parallel(
      Array.from({ length: votes }, (_, k) => async () => {
        const [A, B] = (m + k) % 2 ? [y, x] : [x, y];
        const v = await agent(
          `Tournament judge${votes > 1 ? ` ${k + 1} of ${votes}` : ""}. Topic: ${topic}${context}\n` +
            `A) ${card(A)}\nB) ${card(B)}\n` +
            `Attack both: name the worst weakness of each. Then pick the one that is ${criteria}. No tools. Be harsh, be brief.`,
          {
            label: `r${r}:${A.name} vs ${B.name}${votes > 1 ? ` #${k + 1}` : ""}`,
            phase: "Fight",
            schema: VERDICT,
            model,
            effort: "low",
            agentType: "Explore",
          },
        );
        if (!v) return null;
        const xWon = (v.winner === "A") === (A === x);
        return {
          xWon,
          reason: v.reason,
          xWeak: A === x ? v.weakness_a : v.weakness_b,
          yWeak: A === x ? v.weakness_b : v.weakness_a,
        };
      }),
    )
  ).filter(Boolean);
  if (!ballots.length) {
    log(`r${r} judges failed: ${x.name} advances by default`);
    return { win: x, lose: y, reason: "judge failed", score: "0-0" };
  }
  const xVotes = ballots.filter((b) => b.xWon).length;
  const xWins = xVotes * 2 >= ballots.length;
  const deciding = ballots.find((b) => b.xWon === xWins) || ballots[0];
  const win = xWins ? x : y;
  const lose = xWins ? y : x;
  win.knownWeakness = xWins ? deciding.xWeak : deciding.yWeak;
  lose.knownWeakness = xWins ? deciding.yWeak : deciding.xWeak;
  return {
    win,
    lose,
    reason: deciding.reason,
    score: xWins
      ? `${xVotes}-${ballots.length - xVotes}`
      : `${ballots.length - xVotes}-${xVotes}`,
  };
};

phase("Fight");
const fights = [];
const out = []; // eliminated fighters, latest last
let round = 0;
while (fighters.length > 1) {
  round++;
  const pairs = [];
  for (let i = 0; i + 1 < fighters.length; i += 2)
    pairs.push([fighters[i], fighters[i + 1]]);
  const bye = fighters.length % 2 ? fighters[fighters.length - 1] : null;
  const r = round;
  const isFinal = fighters.length === 2;
  const results = (
    await parallel(
      pairs.map(
        ([x, y], m) =>
          () =>
            fight(x, y, r, m, isFinal ? finalJudges : 1),
      ),
    )
  ).filter(Boolean);
  for (const res of results) {
    res.win.wins++;
    res.lose.outRound = r;
    out.push(res.lose);
    fights.push({
      round: r,
      winner: res.win.name,
      loser: res.lose.name,
      score: res.score,
      reason: res.reason,
      loserWeakness: res.lose.knownWeakness || "",
    });
  }
  fighters = results.map((res) => res.win);
  if (bye) fighters.push(bye);
  log(`round ${round}: ${fighters.length} left`);
}

const champion = fighters[0];
const top = [champion, ...out.slice().reverse()].slice(0, 4);

if (a.verify) {
  phase("Verify");
  const checks = await parallel(
    top.map(
      (f) => () =>
        agent(
          `Novelty check. Idea: ${card(f)}\n` +
            `Use web search (max 3 searches) to find whether a live product already does this for the same buyer. ` +
            `Report only what you actually found, with real names and URLs. If you could not search, say so in gap and set exists to "partial".`,
          {
            label: `verify:${f.name}`,
            phase: "Verify",
            schema: NOVELTY,
            model,
            effort: "low",
            agentType: "Explore",
          },
        ),
    ),
  );
  top.forEach((f, i) => (f.novelty = checks[i] || null));
} else {
  log("verify off - originality is self-reported by contestants, not checked");
}

const bracket = [];
for (let r = 1; r <= round; r++) {
  bracket.push(`### Round ${r}${r === round ? " - final" : ""}`);
  for (const f of fights.filter((x) => x.round === r))
    bracket.push(
      `- **${f.winner}** beat ${f.loser}${f.score !== "1-0" ? ` (${f.score})` : ""} - ${f.reason}`,
    );
}

const view = (f) => ({
  name: f.name,
  pitch: f.pitch,
  closestExisting: f.closest_existing,
  twist: f.twist,
  wins: f.wins,
  knownWeakness: f.knownWeakness || "",
  novelty: f.novelty,
});

return {
  topic,
  agentsUsed:
    size + fights.length + (finalJudges - 1) + (a.verify ? top.length : 0),
  champion: view(champion),
  podium: top.slice(1).map(view),
  bracketMarkdown: bracket.join("\n"),
  fights,
};
