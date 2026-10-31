# How big should the group be?

Using `grpo_tiny_adder.py`, train Tiny Adder four times with group sizes `G = 2, 4, 8, 16`, keeping everything else at its default.

For each run, record:

- final reward, accuracy and entropy (the last history entry), and
- the first step at which accuracy reaches 0.5 (or "never" within 200 steps).

Then answer in two or three sentences: why do bigger groups learn faster per step, and what does that speed cost you in a real language-model run?

**Done looks like:** a four-row table from your own run and a short answer that mentions silent (all-wrong) groups and the cost of sampling.
