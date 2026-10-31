# Stop the model hedging its answer

`parse_number` keeps the **last** number it finds. That is handy for `18 dollars`, but it creates a quiet loophole: a model could learn to write several guesses inside the answer block and hope the last one is right.

**What to do**

1. Run the current `correctness_reward` on these two answers to the eggs question (gold 18) and write down the scores:
   - `<think>not sure</think><answer>26 or 18</answer>`
   - `<think>not sure</think><answer>18 or 26</answer>`
2. Explain in one sentence why the two scores differ, and why that is bad for training.
3. Write `single_number_correctness(completions, answer, **kwargs)` that gives 1.0 only when the answer block contains **exactly one** number and it equals the gold number.
4. Check it still accepts `$18.`, `18.0` and `$1,018` when the gold answer is 18, 18 and 1018 respectively.

**What "done" looks like**

Your function gives 0.0 to both hedged answers, 1.0 to the three tidy ones in step 4, never crashes on answers without tags, and you have written the one-sentence explanation from step 2.
