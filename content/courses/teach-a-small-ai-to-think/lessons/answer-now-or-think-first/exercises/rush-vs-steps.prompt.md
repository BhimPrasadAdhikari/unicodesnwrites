# Rush it, or work it out?

Test the lesson's main claim on your own model: does asking for steps help a small model, and by how much?

**What to do**

1. Open the **Hello GPU notebook** from the welcome lesson and run it up to section 6.
2. Change the `ask` function so the instruction added to each question can be passed in, for example `ask(questions, instruction, max_new_tokens)`.
3. Run the same 20 GSM8K questions twice:
   - **Rush:** instruction `"Reply with only the final number."` and `max_new_tokens=20`.
   - **Steps:** instruction `"Think step by step, then give the final number on its own line."` and `max_new_tokens=400`.
4. Grade both with the notebook's `last_number` check and record both scores.
5. Find one question the "steps" version got right and the "rush" version got wrong. Which step did the rushed answer skip?

**What "done" looks like**

- Two scores out of 20 (rush vs steps) on the same questions.
- One example where steps helped, with a sentence on why.
- One sentence on whether the gap was bigger or smaller than you expected for a small model, and what that tells you about asking versus training.
