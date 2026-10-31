# Attack the unit-conversion reward

Milestone M1 says: test your reward like an attacker. Let's do it on a reward from the starter repo.

`tasks/units.py` grades an answer by taking **the first number** inside `<answer>`, after removing every comma, and accepting it if it's within 1% of the true answer.

**Your task:**

1. With the true answer 3500, run the current `units.correctness_reward` on answers like these and see what it accepts:
   `3500`, `3500 or 3600`, `3500, 3600`, `about 3500 to 3600`, `3,500`, `3500 meters`, and (for a true answer of 1234567) `1,234,567`.
2. Name the loophole. How could a model exploit it during GRPO training?
3. Write `strict_correctness_reward` that only accepts an answer containing **exactly one** number. Commas used as thousands separators (as in `3,500` or `1,234,567`) must still work, but a comma between two separate numbers (as in `3500, 3600`) must not merge them.

**Done looks like:** a before/after list of rewards for all the answers above, where the hedged answers score 0 under your new reward and the honest ones still score 1.
