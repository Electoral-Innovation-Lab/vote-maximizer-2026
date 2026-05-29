# Vote Maximizer Interview Synthesis

# VOTE MAXIMIZER UX RESEARCH SYNTHESIS

## 1. MESSAGING VERDICT: Which framing won, and for which personas?

**"Canvassing/donation impact" framing won decisively across all personas.**

**Unanimous preference (5/5):**
- **Maya:** "Definitely A. No question." Said B "makes me feel like I'm playing defense in a game we're already losing."
- **Sandra:** "Honestly? A." Wanted to feel like she's "building something, not just playing defense."
- **Tom:** "A, no question." Called B "emotional manipulation" and said it made him "defensive."
- **Elena:** "Definitely A." Noted her peers are "burned out on that energy" of defending democracy.
- **Priya:** Chose A as "actionable in a way I can immediately understand," though noted B might be "more honest about what's at stake."

**Why impact framing won:**
- **Empowerment over anxiety:** All five wanted to feel effective, not scared
- **Concrete over abstract:** People know what "donate" and "canvass" mean; "protect elections" is vague
- **Positive over defensive:** "Help your side win" > "stop bad things from happening"
- **Personal agency over systemic crisis:** Tool promises individual efficacy, not collective mobilization

**Where protection framing had traction:**
- Sandra: "That part actually really resonates with me" (the vulnerability is real)
- Elena: "'Fragile' makes it feel urgent" for people already anxious about election integrity
- Priya: "Might actually be more honest about what's at stake"

**BUT**: All three immediately followed with caveats about it being "overwhelming," needing concrete actions, or feeling "paralyzed."

---

## 2. COPY CHANGES: Specific phrases that confused people or fell flat

### PROBLEM PHRASES:

**"Per-vote leverage" / "high-leverage races"**
- **Maya:** "Sounds very finance-bro or consulting-speak... like I'm optimizing a stock portfolio"
- **Sandra:** "A bit technical to me. Like something from a business consultant"
- **Tom:** "Leverage concept works but 'per-vote power' feels like jargon someone in a think tank would use"
- **Elena:** "Kinda jargony... not a phrase I'd naturally use with my friends"

**REWRITE:** 
- Replace "high-leverage races" → **"close races where you can make a difference"** or **"races where a few votes could change the winner"**
- Replace "per-vote power" → **"how much your vote matters"** or **"vote impact"**

---

**"Fragile" / "vulnerable to disruption"**
- **Maya:** "Makes me a little anxious but not in a motivating way... makes me want to close the tab"
- **Tom:** "The alarmist tone makes me wonder if you're being straight with me or spinning the data"
- **Priya:** "Makes me think: okay, so these races are fragile... and what exactly am I supposed to do about that?"

**REWRITE:**
- Bury or soften the fragility framing
- IF you keep it: pair immediately with concrete actions (see Trust Signals section)
- Landing page should **not** lead with "every vote is at risk" — start with empowerment

---

**Headline: "Where every vote counts— and every vote is at risk"**
- Creates immediate confusion about whether tool is empowering (counts) or threatening (at risk)
- Tom: "The 'democracy is fragile' angle is a bit much for me"
- Maya: "Is this a tool to help me be more effective, or is it trying to scare me?"

**REWRITE:** 
**"Find the races where your vote matters most"** or **"Where will your donation or volunteer time go furthest?"**

---

**Mixed messaging problem (identified by 4/5 personas):**
- **Maya:** "Keeps talking about voter suppression and fragile democracy alongside strategy stuff... not totally sure which problem this is solving"
- **Sandra:** "Feels like it's trying to be both things at once... a little confused about its message"
- **Tom:** "Seems like it can't decide what it wants to be... muddies the message"
- **Elena:** "Trying to do both, and I'm not sure it's totally landing on either one"

**SOLUTION:** Pick one primary frame. Recommendation: **Lead with impact/empowerment, mention protection as secondary benefit** ("And by helping campaigns in close races, you're also helping ensure every vote counts")

---

**The math section (Section 03):**
- **Maya:** "Completely lost me. I don't know what a t-distribution probability density function is"
- **Sandra:** "Lost me immediately"
- **Tom:** "Totally over my head... sounds like it could be a smokescreen"
- **Elena:** "Kinda loses me"

**REWRITE:**
"We calculate how much a single vote could change the outcome by looking at how close the race is and how uncertain the polls are. Close races with uncertain polls = higher vote impact. [See technical methodology →]"

---

## 3. TRUST SIGNALS: What people said they'd need to trust the tool

### MOST REQUESTED (appeared in 4-5 interviews):

**1. Show historical validation**
- **Maya:** "If you showed me it worked before. Like 'in 2024 we identified these 10 races as high-leverage and here's what happened'"
- **Priya:** "Have they validated this against past elections? Did the 2024 races they predicted as 'high leverage' actually end up being decided by thin margins?"

**ACTION:** Add a "Track Record" section showing 2022 or 2024 predictions vs. actual margins

---

**2. Transparent about limitations**
- **Maya:** "Being transparent about limitations would help. Like 'our predictions are based on polling which can be wrong' or 'here's what we got right and wrong last cycle'"
- **Priya:** "They admit these proxies will get replaced with real polls 'as they become available' — so the scores are going to change throughout the cycle? That means early donors are acting on less reliable data"

**ACTION:** 
- Add disclaimer: "This tool gets more accurate as more polls are released. Races marked in amber are based on expert ratings, not polls—check back for updates."
- Add confidence levels to scores

---

**3. Show your work / spot-check capability**
- **Tom:** "If I could click through and see 'here's the actual poll data we used for this race,' even better"
- **Priya:** "Show me one specific race — the actual polling data or Cook rating you started with, walk me through the formula step by step"
- **Sandra:** "I'd want to see if the races they're calling 'high-leverage' match up with what I'm already hearing from people I trust"

**ACTION:** 
- Make races clickable to show: source polls, margin, how score was calculated
- Add "Compare this race to expert ratings" to validate against existing knowledge

---

**4. Prove nonpartisanship**
- **Tom:** "They say they are, but I'd want to see if the 'high-leverage' races they highlight lean consistently one direction"
- **Elena:** "Social proof matters a lot when you can't verify the technical stuff yourself"
- **Sandra:** "I'd also want to know if it's really nonpartisan like they claim, or if there's a hidden agenda"

**ACTION:** 
- Show distribution: "X Republican-leaning, Y Democratic-leaning, Z toss-up races"
- Testimonials from across political spectrum OR from neutral institutions

---

### MEDIUM PRIORITY:

**5. Plain language over formulas**
- **Tom:** "I'd rather they say 'we average recent polls and adjust for how unpredictable this type of race usually is' in plain English"
- All five personas glazed over or distrusted the math section

**ACTION:** Rewrite Section 03 as noted above; move technical details to separate page

---

**6. Clear about what's real data vs. proxy**
- **Priya:** "How much of this map is actual math versus just educated guesses dressed up as probabilities? And if they're mixing both, how do I know which races are based on real data versus proxy ratings?"
- Copy does mention color-coding (green vs. amber) but **Priya was the only one who caught this**

**ACTION:** Make data source MORE prominent in UI. Consider: "Based on 3 recent polls ✓" vs. "Based on expert rating (no polls yet)"

---

## 4. SURPRISES: Anything unexpected across the interviews

### SURPRISE #1: The "fragility" framing backfired more than expected
Going into research, team may have thought "election protection" would resonate with civically engaged users. Instead:

- **Nobody** picked protection framing as more motivating
- Multiple people used words like "exhausting," "overwhelming," "paralyzing"
- Even Sandra (the active volunteer who DOES worry about election integrity) said it made her feel "a little overwhelmed"

**Key insight from Elena:** "A lot of my friends are burned out on that energy. We've been in 'everything is under attack' mode for years now."

This suggests **fatigue with defensive/threat-based mobilization** even among people who care deeply about democracy.

---

### SURPRISE #2: "Leverage" language read as cold/transactional to half the cohort

Expected this to signal "strategic" and "smart." Instead:
- Maya: "Finance-bro," "optimizing a stock portfolio instead of participating in democracy"
- Sandra: "Business consultant," not how volunteers talk

**But**: Tom (the small business owner) had no problem with it, and Priya understood it technically.

**Insight:** "Leverage" may work for analytically-minded users but alienates people who see civic engagement as values-driven, not optimization.

---

### SURPRISE #3: Math complexity actively hurt trust for some users

Expected: "More explanation = more credibility"

Reality: 
- **Tom:** "When people get too technical too fast, I assume they're either showing off or hiding something"
- **Priya:** (the most technically sophisticated) was immediately suspicious of the Cook rating proxies being "dressed up as probabilities"

**Lesson:** Transparency ≠ showing all the math. Transparency = being clear about **uncertainty and limitations.**

---

### SURPRISE #4: Strong desire for historical proof over methodological proof

Expected people to want to understand the model.

Actually: **5/5 personas** said some version of "I don't need to understand how you did it, I need to see that it worked before."

This is a huge opportunity: If you have ANY track record (even partial), lead with that instead of the t-distribution.

---

### SURPRISE #5: The mixed messaging bothered people MORE than getting the framing "wrong"

It wasn't just that protection framing was less motivating—it was that **mixing both framings created confusion and distrust.**

- **Tom:** "Pick a lane... trying to be both makes me trust it less"
- **Maya:** "Mixed messaging makes me wonder: is this tool actually for individual voters like me, or is it for organizers and activists?"

**Key insight:** Better to commit fully to ONE frame (even if it's not perfect) than to hedge with both. Hedging reads as either:
- Confusion about audience (Tom, Maya)
- Or manipulation (Tom: "using scary language just to get me to donate")

---

## 5. RECOMMENDED NEXT STEPS: Top 3 things to act on

### PRIORITY 1: REBUILD LANDING PAGE AROUND IMPACT FRAMING

**Current headline:** "Where every vote counts— and every vote is at risk"

**Recommended headline:** 
**"Find the races where your vote matters most"**
or
**"Where will your donation have the biggest impact?"**

**Current subhead:** "Vote Maximizer calculates where individual votes carry the most weight. In 2026, that's also where democracy is most fragile."

**Recommended subhead:**
**"Vote Maximizer shows you which races are so close that a handful of votes could flip the outcome—so you can focus your time and money where they'll make the most difference."**

**Bury the fragility framing:** Move election protection language to About page or FAQs. If you must mention it, make it secondary:

"Close races are also the most vulnerable to suppression and misinformation—that's why protecting voter access in these contests matters so much. [Learn more about election protection →]"

**Rationale:** 5/5 personas wanted empowerment first, protection second (if at all). Landing page has <10 seconds to communicate purpose—lead with the value prop people actually want.

---

### PRIORITY 2: ADD TRUST BUILDERS IMMEDIATELY

Based on what users said would make them trust the tool:

**A) Add a "Track Record" section (or FAQ item):**
"In 2024, Vote Maximizer identified [X races] as high-leverage. Of these, [Y%] were decided by margins under Z votes, and [specific example]. In 2022, we predicted [specific example that came true]."

If you don't have this data, RUN THE MODEL RETROACTIVELY on 2022/2024 and publish results. This was the #1 trust signal.

**B) Add transparency about data quality:**
- UI: Make it MUCH clearer which races are poll-based vs. proxy-based
- Add: "This race is based on [3 polls from March 2024]. Confidence: Medium" vs. "This race is based on expert ratings (no polls yet). Confidence: Low"
- Explain: "Scores will update as more polls are released. Check back in [month] for better data."

**C) Simplify + humanize the math section:**
Move current Section 03 to "Technical Methodology" page. Replace with:

"How we calculate vote impact:
- We start with polling data (or expert ratings if no polls exist yet)
- We calculate how likely the race is to be decided by a small number of votes
- Close races + uncertain polls = higher vote impact scores
- Scores range from 0-100 within each race type

This gets more accurate as more polls come in. [See full methodology] [See our track record]"

**D) Prove nonpartisanship visually:**
Add a stat: "Currently tracking: X Republican-leaning races, Y Democratic-leaning races, Z toss-ups"

---

### PRIORITY 3: DECIDE ON PRIMARY AUDIENCE AND COMMIT

The mixed messaging problem is hurting you. You need to decide:

**OPTION A: Tool for individual donors/volunteers (casual users)**
- Lead with personal empowerment
- Emphasize strategic giving/volunteering
- Make protection framing optional/secondary
- Simpler language, less jargon ("close races" not "high-leverage")
- User goal: "I have $100 and 5 hours—where should they go?"

**OPTION B: Tool for organizers/activists (power users)**
- Lead with democratic protection
- Emphasize systemic vulnerability + solutions
- Connect directly to election protection orgs (make this MUCH more prominent)
- More sophisticated language okay
- User goal: "Where should my org deploy resources to defend democracy?"

**Recommended:** Go with OPTION A, then build Option B features later.

**Why:** 
- 4/5 personas were in the "casual engaged citizen" category (Maya, Tom, Elena, Priya)
- Even Sandra (active volunteer) responded better to empowerment framing
- Easier to layer IN complexity than to simplify later
- The name "Vote Maximizer" already signals individual optimization

**How to implement:**
- Primary landing page + copy = Option A framing
- Add secondary page: "For Organizations: Using Vote Maximizer for Election Protection" with Option B framing + resources for election protection work, voter protection orgs, poll monitoring, etc.
- This satisfies both audiences without confusing either

---

## BONUS: Quick wins (do these immediately)

1. **Change "per-vote leverage" → "vote impact"** everywhere in UI
2. **Add one-sentence explainer to scores:** "Vote impact: 87/100 — This race could be decided by hundreds of votes" 
3. **FAQ: "Is this tool partisan?"** with transparent answer about methodology + distribution of races
4. **Remove or soften:** "Where every vote is at risk" from headline
5. **Add:** "Based on [X polls / expert ratings]" to every race card

---

## FINAL TAKEAWAY

Your instinct to test these two framings was exactly right—**and the research gave you a clear answer.** Impact/empowerment framing wins decisively. The protection framing isn't wrong, but it needs to be secondary and paired with concrete actions, not used as the primary hook.

The bigger issue than framing choice is **frame mixing**. Commit to one story, deliver it clearly, and you'll build more trust than trying to be everything to everyone.