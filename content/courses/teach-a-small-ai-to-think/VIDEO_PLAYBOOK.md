# Making the lesson videos hold attention

Research notes and a checklist for the "Teach a Small AI to Think" videos, written after viewers found the pilot ("The nudge", 7 min) boring and hard to follow.

## What the research says

| Finding | Source | How strong |
|---|---|---|
| Engagement drops sharply after about 6 minutes; short, chunked videos keep people watching. Hand-drawn, Khan-style videos and a human presence beat plain slides. | Guo, Kim and Rubin, 6.9 million edX viewing sessions (2014) | Strong, large data set |
| Clear, smooth lecture videos can feel easy but teach nothing, and even make wrong ideas stronger. Videos that show a common wrong idea first, then knock it down, teach far better. | Derek Muller's PhD (the Veritasium founder), Sydney 2008 | Strong, controlled experiments |
| People learn better with a conversational tone, cues that point at what matters (arrows, highlights), and lessons cut into short pieces. | Mayer's multimedia learning principles | Strong, many experiments |
| Curiosity comes from a gap the viewer can see and believes they can close. Too big a gap discourages them. | Loewenstein's information-gap theory (1994), and later studies on video learning | Strong theory, moderate video evidence |
| Most viewers who leave do so in the first minute. Top creators add a new twist ("re-engagement") about every 3 minutes. | Reported from MrBeast's leaked production document | Industry practice, not verified |
| Something on screen should change every few seconds (8 to 12 seconds is common advice), but over-editing tires older viewers. | Creator and editor guides | Weak, rule of thumb only |
| AI voices are fine if they sound human. A flat, robotic read costs attention. | Small academic studies (mixed results) | Weak to moderate |
| In-video questions ("pause and guess") improve recall, but too many feel like interruptions. | MOOC studies on embedded questions | Moderate |

## What's wrong with the pilot, in those terms

1. **No hook.** It opens with "In the last module, we built a grader." That's a recap, and the first minute is where viewers leave.
2. **Pictures sit still too long.** Each scene holds one picture for 20 to 60 seconds (the chart for 59 seconds), with only a few marks added.
3. **No story or stakes.** There's no character to root for and no question that the viewer wants answered.
4. **Nothing to do.** The viewer never guesses, predicts or gets something wrong, so it feels like being lectured.
5. **No music or sound.** It's a voice over silence, which feels flat even when the script is good.
6. **One long video.** At 7 minutes it's past the point where attention drops, but cutting it shorter would lose depth. The fix is several short episodes, not one long one.

## The playbook for every video

**Structure: short episodes, each built like a mini mystery**
- Episodes of 4 to 6 minutes. Split a module into 2 or 3 episodes rather than making one 10-minute video.
- **0:00–0:15, the hook:** show the payoff or a surprise first. For example: "This model got 3 + 4 wrong four times out of five. Sixty rounds later, it gets it right almost nine times out of ten, and nobody ever told it the answer. Here's how."
- **0:15–0:30, the promise:** say in one line what the viewer will be able to do or understand by the end.
- **Every 2 to 3 minutes, a new open question:** "But there's a catch...", "So why doesn't this work for mistakes?"
- **End with a cliffhanger into the next episode,** not just "Next up: X."

**Teach through wrong ideas, not explanations (the Muller method)**
- Each episode raises one common wrong belief, lets the viewer believe it, then shows why it fails. For example: "Surely a reward of zero teaches the model to avoid that answer? Watch... nothing happens."
- **One "pause and guess" moment per episode:** a question appears on screen, a short countdown plays, then the reveal.

**A recurring character and stakes**
- Give the small model a face and a name, for example a simple drawn glyph character called "Tiny" in the house style, so viewers watch *someone* learn, not just bars move.
- Keep a running scoreboard across the course (for example "Tiny's maths score: 22%"), updated at the end of each episode, so there's a reason to watch the next one.

**Keep the screen moving**
- A visual beat every 5 to 10 seconds: a camera push-in, a new annotation, a cut to a close-up, a counter ticking, the character reacting.
- Animate cause and effect: when the reward lands, show the treat or tick flying into the bar, then the bar growing.
- **One idea per screen.** Split long scenes into 2 or 3 shots.

**Sound**
- A quiet music bed that changes at each section, plus small sound effects: a tick for a reward, a buzz for a wrong answer, a whoosh for transitions. The current videos have none.
- A voice with more feeling: a faster read in the hook, slower for the key idea, and real pauses before reveals.

**Language (already improved in the pilot, keep it)**
- Everyday comparisons first, technical names last and labelled optional. About 130 to 150 words a minute.

## Measuring it

Once the videos are on YouTube (even unlisted), open the audience retention graph in Studio. Look at how many viewers are left at 30 seconds and at 1 minute, and find the dips. Fix the scene just before each dip. That beats any rule above.

## Sources

- [Guo, Kim and Rubin, "How Video Production Affects Student Engagement" (2014)](https://www.cs.rochester.edu/hci/pubs/pdfs/edX-MOOC-video-production-and-engagement_LAS-2014.pdf)
- [The Journal: "Watching Videos Does Not Necessarily Lead to Learning" (on Muller's research)](https://thejournal.com/articles/2015/05/05/watching-videos-does-not-necessarily-lead-to-learning.aspx)
- [Muller and Sharma, "Tackling misconceptions in introductory physics using multimedia presentations"](https://openjournals.library.sydney.edu.au/IISME/article/view/6345)
- [University of Sydney profile of Derek Muller](https://www.sydney.edu.au/news-opinion/news/2024/11/05/the-element-of-truth.html)
- [Mayer, Multimedia Principles (2020 summary)](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf)
- [Ho et al., curiosity and online video learning, Frontiers in Medicine (2021)](https://www.frontiersin.org/articles/10.3389/fmed.2021.772956/pdf)
- [OMR on the leaked MrBeast production document](https://omr.com/de/daily/mrbeast-doc-pdf-leak)
- [Creator Essentials: pattern interrupts, and the risk of over-editing](https://www.creatoressentials.com/glossary/pattern-interrupt/)
- [Royal Roads: AI-generated audio in learning](https://malat-webspace.royalroads.ca/rru0277/ai-generated-audio-technology-in-learning/)
- [Stanford, in-video quizzes (Learning at Scale 2016)](https://swap.stanford.edu/was/20140911222256mp_/http://hci.stanford.edu/publications/2016/invideo/invideo-las2016.pdf)
