# Advantages with partial credit

In the real run you will combine two rewards: up to **1.0** for a correct number and **0.5** for using the `<think>…</think><answer>…</answer>` format. So one answer can score 0, 0.5, 1.0 or 1.5.

A group of eight GSM8K answers scored:

`[1.5, 1.0, 0.5, 0.5, 0.0, 0.0, 1.5, 0.0]`

1. Compute the advantages with `A = (r - mean) / (std + 1e-4)`.
2. Rank the answers from "pushed up the most" to "pushed down the most".
3. An answer that was correct but badly formatted scored 1.0. Does it get a positive or negative advantage here? Would that change if every other answer in the group had scored 1.5?

**Done looks like:** eight advantages (two decimals), a ranking, and a two-sentence answer to question 3.
