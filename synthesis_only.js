import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();
const { interviews } = JSON.parse(fs.readFileSync("interview_results.json", "utf8"));

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
  max_tokens: 5000,
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

const synthesis = response.content[0].text;
fs.writeFileSync("synthesis.md", `# Vote Maximizer Interview Synthesis\n\n${synthesis}`);
console.log("✓ synthesis.md saved");