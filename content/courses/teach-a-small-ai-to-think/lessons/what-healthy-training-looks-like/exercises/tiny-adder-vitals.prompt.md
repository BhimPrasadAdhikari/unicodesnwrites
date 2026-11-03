# Measure the Tiny Adder's fuel gauge

TRL logs `frac_reward_zero_std`, the share of groups where every answer got the same reward. The Tiny Adder does not log it, so add it yourself.

1. Without editing `grpo_tiny_adder.py`, count how many of the 16 groups in each step had all-equal rewards. (Hint: wrap the module's `advantages` function so it records whether the rewards' standard deviation is zero, then call `train()`.)
2. Print the fraction at steps 1, 50, 100, 150 and 200, next to reward and accuracy, for `G=8` and for `G=2`.
3. Explain in two or three sentences: why does the `G=8` fraction fall and then rise again near the end? Why does `G=2` stay high?

**Done looks like:** working code, two small tables of real output, and a short explanation.
