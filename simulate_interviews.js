import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

// ── PASTE YOUR CURRENT COPY HERE ──────────────────────────────────────────────
const PRODUCT_COPY = `
=== LANDING PAGE ===

Eyebrow: Vote Maximizer by The Electoral Innovation Lab

Headline: Where every vote counts— and every vote is at risk.

Subhead: Vote Maximizer calculates where individual votes carry the most weight.
In 2026, that's also where democracy is most fragile.

Stat tagline: 6,696 contests. 50 states. One question: where does one vote go furthest?

CTA: Enter your city, address, or zip code → Find contests
Secondary CTA: Browse the full map ↓


=== INFO PANEL (sidebar on main map view) ===

Title: Vote Maximizer 2026

Subtitle: Maximize the impact of your canvassing and donations.

Body:
Vote Maximizer uses mathematical modeling to calculate per-vote leverage: the change in win
probability that comes from a single vote, or a handful of votes. Contests with high leverage
are close, consequential, and — because the margin for error is smallest — most vulnerable
to disruption from voter suppression, misinformation, or administrative failure.

Our analysis tells you where your donations and canvassing hours go furthest. And it shows
you where election protection efforts are most urgently needed. Use this tool to find
both — and to connect with the organizations already doing that work.

Footer: A project by the Electoral Innovation Lab


=== ABOUT PAGE ===

Header: About Vote Maximizer
Tagline: The science of making your vote count more.

— 01: What is Vote Maximizer? —
Vote Maximizer uses mathematical and strategic analysis to identify the contests and ballot
questions where per-voter impact is greatest in the 2026 election cycle. Our tool centers
not on campaigns, but on the individual voter — giving you the kind of rigorous analysis
that campaign strategists provide to politicians, so you can direct your time, money, and
energy where they'll make the most difference.

High-leverage races are also fragile ones. Where the margin is thin, voter suppression,
misinformation, and administrative irregularities have outsized effect. Vote Maximizer helps
you find both the races worth fighting for, and the ones most in need of protection.

— 02: The Principle of Voter Power —
Not all votes are created equal. Voter power means choosing the contests where a small
number of votes can actually change the outcome: close, high-stakes elections where
individual participation has measurable impact, rather than contests already decided by
wide margins.

Voter power is especially high in competitive ballot initiatives, which can reshape policy
for years to come. These races often receive less attention than candidate elections despite
their direct impact on issues like voting rights, redistricting, and electoral reform.

A high voter power score also indicates a race competitive enough to be vulnerable. Close
elections are where efforts to suppress turnout, spread misinformation about voting
procedures, or challenge results are most likely to affect the outcome — making them both
the highest-leverage races for civic action and the most important to protect.

— 03: The Mathematics —
Every voter power score answers one question: how much does a single additional vote shift
the probability of a different outcome? We use a t-distribution probability density function
centered on the projected margin, with an effective sigma (σ_eff) that blends polling
uncertainty (σ ≈ 3.0 pts) with historical race-type volatility.

Scores are normalized 0–100 within each race type. Statewide races are adjusted for
electorate size using a turnout scaling factor (÷ turnout^0.3). House districts use no
scaling since they have equal populations by law.

— 04: Data Sources —
Margins come from two sources, color-coded in the interface: real polling averages (sourced
from Emerson, PPP, ASR, and Sabato's Crystal Ball, Jan–Mar 2026) shown in green, and Cook
Political Report rating proxies shown in amber. Cook ratings are translated as: Toss-Up = 0,
Lean = ±4 pts, Likely = ±9 pts, Solid = ±18 pts.

As more polls become available through the election cycle, Cook proxies are replaced with
real data and all voter power scores update automatically.

— 05: About the Electoral Innovation Lab —
The Electoral Innovation Lab (EIL) is a Princeton, NJ based non-profit dedicated to building
a science of democracy reform. Vote Maximizer is one of several tools EIL has developed to
help citizens, researchers, and partner organizations understand and strengthen democratic
participation.

EIL's work is nonpartisan, independent, and evidence-driven. We believe that the same
mathematical tools used by campaign strategists should be available to every voter — and
that an informed, engaged citizenry is the most durable defense democracy has.
`;

// ── PERSONAS ──────────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    name: "Maya",
    prompt: `You are Maya, a 24-year-old recent college grad in her second election cycle. 
You care deeply about climate policy and abortion access. You're politically aware 
but not versed in electoral strategy. You want to feel like your actions matter 
but you're skeptical of tools that overpromise. You get nervous about doom-and-gloom 
framing but you do want to understand where you can actually have impact.
You are not a data person — if something sounds too mathematical you tune out.`,
  },
  {
    name: "Sandra",
    prompt: `You are Sandra, a 58-year-old retired teacher who volunteers for her local 
Democratic party. You've been canvassing for 20 years. You care about democracy 
deeply and you've become more worried about election integrity since 2020. 
You are not very tech-savvy — you need things explained simply. You are warm 
and engaged but you will say when something confuses you.`,
  },
  {
    name: "Tom",
    prompt: `You are Tom, a 45-year-old small business owner in Columbus, Ohio. 
You vote in every election but you're not a political activist. You're skeptical 
of anything that sounds alarmist or partisan. You want straightforward information, 
not spin. If something feels like it's trying to scare you or manipulate you, 
you disengage immediately. You respond well to data if it's presented plainly.`,
  },
  {
    name: "Elena",
    prompt: `You are Elena, a 22-year-old college senior who organizes on campus. 
You're trying to get your peers to donate and canvass. You're looking for tools 
you can share with others to help them see why their participation matters. 
You're tech-savvy and enthusiastic. You think about everything through the lens 
of: "could I use this to convince someone else to act?"`,
  },
  {
    name: "Priya",
    prompt: `You are Priya, a 27-year-old data analyst who follows politics closely. 
You are deeply curious about methodology — you'll ask how the math works, 
what assumptions are baked in, and whether the framing is honest. 
You are not hostile, but you are rigorous. You'll notice if something is 
overstated or if the copy doesn't match what the tool actually does.`,
  },
];

// ── INTERVIEW QUESTIONS ───────────────────────────────────────────────────────
const QUESTIONS = [
  `Here is the copy from a civic tool called Vote Maximizer. Read it and tell me 
  in your own words: what do you think this tool does?\n\n${PRODUCT_COPY}`,

  `The tool shows you "high-leverage" races — places where per-vote power is highest. 
  What does that phrase mean to you? Does it make sense?`,

  `We describe these same high-leverage races as the most "fragile" or vulnerable 
  to disruption — voter suppression, misinformation, low turnout. Does that framing 
  make you want to act, or does it feel overwhelming?`,

  `Which framing would motivate you more:
  A) "Find out where your donation or canvassing hours will have the most impact"
  B) "Find the elections most at risk — and help protect them"
  Tell me which and why.`,

  `Does this tool feel like it's about YOUR power as an individual, 
  or about protecting democracy more broadly? Is that distinction a problem for you?`,

  `What would make you trust the math behind this? What would make you distrust it?`,
];

// ── RUN ONE INTERVIEW ─────────────────────────────────────────────────────────
async function runInterview(persona) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`INTERVIEWING: ${persona.name}`);
  console.log("=".repeat(60));

  const messages = [];
  const transcript = [];

  for (const question of QUESTIONS) {
    messages.push({ role: "user", content: question });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: `${persona.prompt}
      
Respond as this person would in a real user interview. Be honest about confusion, 
skepticism, or enthusiasm. Don't be uniformly positive. Keep responses to 3-5 sentences — 
you're a busy person being interviewed, not writing an essay.`,
      messages,
    });

    const answer = response.content[0].text;
    messages.push({ role: "assistant", content: answer });

    console.log(`\nQ: ${question}\n`);
    console.log(`${persona.name}: ${answer}\n`);

    transcript.push({ question, answer });
  }

  return { persona: persona.name, transcript };
}

// ── SYNTHESIZE ALL INTERVIEWS ─────────────────────────────────────────────────
async function synthesize(interviews) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("SYNTHESIZING FINDINGS");
  console.log("=".repeat(60));

  const transcriptText = interviews
    .map(
      (i) =>
        `PERSONA: ${i.persona}\n` +
        i.transcript
          .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
          .join("\n\n")
    )
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a UX researcher analyzing 5 user interview transcripts for Vote Maximizer, 
a civic tech tool. The core question being tested is: does "election protection / brittleness" 
framing land better than "canvassing / donation impact" framing?

Here are the transcripts:

${transcriptText}

Provide a synthesis with these sections:
1. MESSAGING VERDICT: Which framing won, and for which personas?
2. COPY CHANGES: Specific phrases that confused people or fell flat — suggest rewrites.
3. TRUST SIGNALS: What did people say they'd need to trust the tool?
4. SURPRISES: Anything unexpected across the interviews.
5. RECOMMENDED NEXT STEPS: Top 3 things to act on.

Be specific and direct. Reference personas by name.`,
      },
    ],
  });

  return response.content[0].text;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const interviews = [];

  for (const persona of PERSONAS) {
    const result = await runInterview(persona);
    interviews.push(result);
  }

  const synthesis = await synthesize(interviews);

  console.log("\n\nSYNTHESIS:\n");
  console.log(synthesis);

  // Save everything to a file
  const output = {
    date: new Date().toISOString(),
    interviews,
    synthesis,
  };

  fs.writeFileSync(
    "interview_results.json",
    JSON.stringify(output, null, 2)
  );
  fs.writeFileSync("synthesis.md", `# Vote Maximizer Interview Synthesis\n\n${synthesis}`);

  console.log("\n✓ Results saved to interview_results.json and synthesis.md");
}

main().catch(console.error);