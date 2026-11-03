# Feel the length bias with a calculator

A group of four answers to the same question comes back from the model:

| Answer | Correct? | Length (tokens) |
|---|---|---|
| A | yes | 20 |
| B | yes | 80 |
| C | no | 20 |
| D | no | 200 |

Rewards are 1 for correct and 0 for wrong.

**Your task:**

1. Work out each answer's advantage the Dr. GRPO way: reward minus the group mean (no division by the standard deviation).
2. Work out the push *per token* under the original GRPO averaging: advantage divided by that answer's own length.
3. Work out the push per token under Dr. GRPO averaging: advantage divided by a fixed constant of 200 (the maximum completion length).
4. In one or two sentences: under the original averaging, which wrong answer is punished more gently per token, and what habit would that teach the model over thousands of steps?

**Done looks like:** a filled-in table with four rows and your two-sentence answer. You can check your numbers with a few lines of Python if you like.
