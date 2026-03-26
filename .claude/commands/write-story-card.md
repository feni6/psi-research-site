# Write a Remarkable Experiments Story Card

You are writing a story card for the "Remarkable Experiments" page (`src/pages/stories.astro`). Each card tells a short, vivid, factually precise story about a specific experiment or individual performance that produced results difficult to explain by conventional means.

The goal of this page is to make a visitor gasp. To make them say "oh my god." To present cases where the evidence is so specific, so well-documented, and so resistant to dismissal that the reader has to sit with it. These are not summaries of research. They are stories about something extraordinary that happened to a specific person or animal, in a specific place, under specific conditions — and was measured.

## Your process

### 1. Find ALL relevant papers in the library

Before reading anything, do a thorough search of the catalog to build the full picture:

- Search `src/data/catalog.json` for papers related to the topic (use Grep to find paper IDs, titles, filenames)
- For each paper you find, read its `related_papers` field — this lists other paper IDs that are connected (replications, critiques, rebuttals, precursors). Follow every link.
- Check the paper's `controversy_id` field. If it has one, search the catalog for ALL other papers with the same `controversy_id` — these are the papers that form the full debate around this topic.
- Search by author name for other papers by the same researchers or their critics (e.g., if writing about Sheldrake, also search for Wiseman; if writing about Bem, also search for Wagenmakers)
- Check which PDFs actually exist in `src/data/pdfs/` using Glob before trying to read them
- If a PDF is missing, fall back to the `plain_summary`, `actual_abstract`, and `notes` fields in the catalog — but note which specific claims you couldn't verify against the original source

**You should end this step with a complete list** of the primary study, all replications, all critiques, all rebuttals, and any overview papers that discuss this case. Read them all.

### 2. Read the full text of every relevant paper

Before writing anything, you MUST read deeply — not skim.

**For the primary study:**
- Read the entire PDF using the Read tool. Not just the abstract. Read the methods (how was the experiment actually set up?), the results tables (what were the exact numbers?), the discussion (what did the authors themselves think was most significant?), and any appendices or supplementary notes.
- If the PDF is long, read it in sections — but read ALL sections. Use offset/limit to page through it. The most compelling details are often buried in the results section or in a footnote, not in the abstract.
- As you read, write down (in your response, before drafting) every specific fact that could appear in the story: names, locations, dates, trial counts, hit rates, descriptions of what happened in specific sessions, details about the participants or animals.

**For every related paper you found in step 1:**
- Read the full PDF of each critique, replication, and rebuttal. You need to understand not just what the critic claimed, but how they reached that conclusion and whether their methodology or reasoning actually holds up.
- Read the catalog entry's `plain_summary`, `notes`, and `actual_abstract` for additional context.
- Look up the controversy markdown files in `src/data/controversies/` if the experiment maps to a controversy — these often contain a structured pro/con breakdown.

**As you read, look specifically for:**
- **Named individuals** — people and animals with names, locations, personal details that make them real
- **Moments** — specific incidents, sessions, or trials where something extraordinary happened that you can narrate as a scene
- **Emotional texture** — what was at stake, who cared, what was the relationship (owner and pet, mother and child, researcher who staked their career)
- **The "oh my god" detail** — the single fact that, when you hear it, changes everything
- **The full critique picture** — what exactly did critics argue, what evidence did they present, and was there a published rebuttal?

**Every factual claim in the final card must trace back to something you read in an actual paper.** If you can't point to where in the source material a fact comes from, don't include it.

### 3. Identify candidate story angles

From a single study or set of related studies, there are usually multiple possible stories. Before writing, identify at least 2-3 candidate angles. For example, from the Sheldrake dog studies, you might consider:

- **Angle A:** The story of Jaytee himself — his behavior, his bond with Pam, the specific videotaped moments
- **Angle B:** The story of the Wiseman dispute — a skeptic tests the same dog, gets the same data, and declares it a failure anyway
- **Angle C:** The statistical story — the sheer weight of 100+ videotaped trials

### 4. Compare angles using the Gasp Test

For each candidate angle, evaluate it against these criteria. The best story maximizes all of them:

**The Gasp Test — would this make someone say "oh my god"?**

| Criteria | What to ask | Weight |
|----------|------------|--------|
| **Sympathetic character** | Is there a named person or animal the reader will care about? A dog waiting by a window is more affecting than a participant in a booth. A mother sensing her child is in danger is more affecting than a mean hit rate. | Highest |
| **Narrative specificity** | Can you tell this as a scene — something that happened in a place, at a time, to someone? Or is it an abstract statistical claim? Scenes beat statistics. | Highest |
| **The impossible detail** | Is there one specific fact that seems flatly impossible under a conventional worldview? The more specific and concrete, the better. "The dog went to the window at the exact moment she decided to come home, 15 miles away" is better than "the hit rate was 32% vs 25% chance." | Highest |
| **Bulletproof conditions** | How hard is it to explain away? Videotape, double-blind, random timing, automated recording — each one closes an escape hatch. The fewer ways to dismiss it, the more the reader has to sit with it. | High |
| **Survived challenge** | Did a skeptic try to debunk it and fail, or inadvertently confirm it? This is narrative gold — it's the twist in the story. | High |
| **Emotional stakes** | Is there a relationship, a bond, a loss, a devotion at the center? The best psi stories are also love stories, or loyalty stories, or stories about someone being told they're crazy when they're not. | High |
| **Implication weight** | If this is real, how big is it? "A dog can sense its owner's intentions from miles away" has different weight than "a random number generator was slightly biased." | Medium |
| **Sample-of-one advantage** | A single extraordinary individual or case can be more compelling than a thousand mediocre ones. If one person hit 12 out of 12 in a telepathy test, that's more visceral than 1,000 people hitting 28% vs 25%. Don't shy away from n=1 if the case is strong. | Medium |

**Write out your comparison explicitly** before choosing. Rate each angle on the criteria above. Pick the one that scores highest overall, with ties broken by the Gasp Test: which one would make a thoughtful, skeptical person stop scrolling?

### 5. Write two or three draft versions of the winning angle

Even after choosing the best angle, the way you tell it matters enormously. Write 2-3 draft versions of the body text that differ in:

- **Opening line** — do you start with the character, the impossible fact, or the scene?
- **What you emphasize** — the emotional bond, the scientific rigor, or the skeptic's comeuppance?
- **Pacing** — do you build slowly to the reveal, or hit them with the extraordinary claim immediately?

**Compare the drafts** by reading each one and asking: which one would I forward to a friend with the message "you have to read this"? Pick that one.

### 6. Finalize the card

Each card has these fields in the `stories` array in `src/pages/stories.astro`:

```typescript
{
  id: string,           // URL-safe slug
  title: string,        // Short, evocative — 3-6 words. Should sound like a magazine headline.
  subtitle: string,     // One sentence that captures the core extraordinary claim with enough
                        // specificity to be arresting. This is the hook — it should make someone
                        // want to read the paragraphs below.
  domain: string,       // e.g. 'Telepathy', 'Precognition', 'Remote Viewing'
  domainIcon: string,   // emoji
  domainColor: string,  // tailwind color name: 'purple', 'violet', 'teal', etc.
  paperIds: string[],   // IDs from catalog.json — include primary study AND critiques
  body: string,         // HTML string — see structure below
}
```

Note: The `body` is a single-line HTML string inside a TypeScript object. Escape any double quotes inside it with `&quot;` or use single quotes in the HTML. Keep it on one line or use string concatenation.

### 7. Write the body HTML

The `body` field contains exactly two paragraphs of HTML (`<p>...</p><p>...</p>`).

**Paragraph 1 — The story itself:**
This is a narrative. It has a character, a setting, and something extraordinary that happened. Use the person's or animal's name. Describe what they did in concrete, visual terms — not what a statistical test showed, but what actually happened in the room, at the window, on the videotape. Weave numbers in naturally as part of the story, not as a separate layer of evidence. "Jaytee trotted to the porch window and sat there, watching — and the time-stamped videotape showed he'd done this within seconds of Pam deciding to come home, 15 miles away" is a story. "The hit rate was significantly above chance (p < 0.01)" is not a story.

Do NOT hedge with "may suggest" or "could indicate." Tell the reader what happened. If a dog went to the window 55% of the time during returns and 4% during absences across 100 videotaped trials, say that plainly. The facts are extraordinary enough without softening.

**Paragraph 2 — The challenge, the twist, and what it means:**
Every great story has a turn. For these stories, the turn is usually: someone tried to make it go away, and couldn't.

But how you handle the critique depends on whether the critique is actually good. You read the full text of the critical papers in step 2. Now evaluate them honestly:

- **If the critique is strong and was never adequately rebutted** — say so. Not every story on this page needs a clean vindication. An honest acknowledgment of a real weakness is more credible than pretending every objection was demolished. (But if the critique is truly devastating, this case probably shouldn't be on the "Remarkable Experiments" page at all.)
- **If the critique is strong but was rebutted with evidence** — present the challenge, the rebuttal, and why the rebuttal is convincing. This is the best dramatic arc.
- **If the critique is weak, methodologically flawed, or based on a misunderstanding** — do NOT present it as an equal-weight challenge that was heroically overcome. That gives it more credibility than it deserves. Instead, you can mention it briefly and explain why it doesn't hold up, or you can skip it and focus on the strength of the original evidence. A bad critique is not a plot device — it's a distraction. For example: if a skeptic re-analyzed data using criteria that were never part of the original study design, or applied a statistical framework that the original authors (and other statisticians) have shown to be inappropriate for this type of data, say that plainly. Don't frame a flawed critique as a serious challenge just for the sake of narrative balance.
- **If the critic's own data actually supports the effect** — this is the most powerful version of the story. Say it directly: the skeptic tested it themselves, and their own numbers showed the effect. That's not "balance" — that's evidence.

The point is: match the weight you give a critique to the actual strength of the critique, based on what you read in the papers. Do not manufacture false balance. If the evidence overwhelmingly points one way, the card should reflect that.

Then end with the implication. Don't retreat. If a terrier in Lancashire can sense its owner's intention to come home from miles away, through walls, across random times, with no sensory cue — and this was captured on hundreds of hours of videotape — then something is happening that science does not currently have a framework for. Say that.

### 8. Writing principles

- **This is storytelling, not science communication.** You are writing narrative nonfiction. The facts are from peer-reviewed papers, but the form is a story. Think magazine feature, not literature review.
- **Character first.** Every card needs someone (or some animal) the reader can picture and care about. If the study doesn't have a named individual, find the most human detail you can.
- **The specific is always more powerful than the general.** "A terrier named Jaytee in Ramsbottom, Lancashire" beats "a dog." "Pam Smart's return journey from her friend's house" beats "the owner's return." "The exact moment she turned to her friend and said 'I think I'll head home now'" beats "the time of departure."
- **Lead with what's extraordinary**, not with background or methodology.
- **Numbers serve the narrative — the narrative does not serve the numbers.** Include statistics because they make the story more astonishing, not because they make it more "rigorous-sounding." If a number doesn't make the reader's eyes widen, cut it or rephrase it.
- **Skeptical critiques get the weight they earned — no more, no less.** A strong critique that was rebutted with evidence is narrative gold: claim, challenge, vindication. A weak critique that misapplied statistics or moved the goalposts is not an equal-weight counterpoint — don't elevate it into one just for the sake of "balance." You read the actual papers. You know which critiques landed and which didn't. Write accordingly.
- **Name the implications.** If taken at face value, what does this mean about the world? Don't be afraid to say it. The reader is an adult.
- **Two paragraphs. Every sentence earns its place.** If you can cut a sentence without losing the gasp, cut it.

### 9. After writing

- Verify the build passes: `npm run build`
- Check that all `paperIds` resolve correctly (the template shows "Author Year" links at the bottom of each card)
- Read the finished card one final time and apply the ultimate test: **if you sent this to a smart, skeptical friend, would they text you back?** Not "interesting" — would they actually respond, with surprise or pushback or "wait, really?" If not, the story isn't vivid enough or specific enough yet. Go back to the source material and find the detail you missed.

## Argument: $ARGUMENTS

The argument tells you which story card to write. It may be:
- A specific topic like "jaytee" or "telephone telepathy" or "ganzfeld star performers"
- A broad prompt like "find the best remote viewing case" — in which case, search the catalog, read multiple candidates, and use the comparison framework above to pick the most compelling one
- "compare" followed by two topics — in which case, evaluate both using the Gasp Test table and recommend which should be written first (or at all)

Use the argument to identify which PDFs to read and which card to create or update.
