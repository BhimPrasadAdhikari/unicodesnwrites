# Diagnose three suspicious runs

A friend shows you three GRPO runs on GSM8K. Each one "looks great" on the reward curve. Work out what is really happening.

All three use a format reward and a correctness reward, added together. "Held-out accuracy" is measured every 100 steps on 200 test questions the model never trains on, using a simple separate check.

**Run A**

- Total reward rose from 0.2 to 0.9 in the first 50 steps, then stayed flat.
- Format reward: 1.0 from step 40 onward. Correctness reward: about 0.3 the whole time.
- Held-out accuracy: 30% at the start, 30% at the end.
- Format weight: 1.0. Correctness weight: 0.5.
- A typical answer at step 500: `<think>Let me solve.</think><answer>42</answer>`

**Run B**

- Correctness reward rose steadily from 0.3 to 0.8.
- Held-out accuracy: 30% at the start, 31% at the end.
- A typical answer: `<think>…</think><answer>12, 18, 24 or 36</answer>`
- The correctness reward takes the last number inside the answer tags.

**Run C**

- Correctness reward rose from 0.3 to 0.95 over 3,000 steps.
- Held-out accuracy: 30% at the start, 34% at the end.
- The training set is 500 questions; the run went through it about 50 times.
- Answers look neat and correct, but when you change a number in a training question, the model gives the old answer.

**What to do**

For each run, write:

1. **What the model learned** (one sentence).
2. **Which clue gave it away.**
3. **One fix**, and how you would know it worked.

**What "done" looks like**

Three short diagnoses, each with a behavior, a clue and a fix that changes the reward, the data or the evaluation (not just "train longer" or "lower the learning rate").
