# Build an easy-to-hard curriculum

If the base model almost never solves four-number puzzles, most GRPO groups score all zeros and training stalls. One fix is a **curriculum**: start with easier three-number puzzles, then move to four.

**Your task:**

1. Write `build_curriculum(n, seed=0, easy_fraction=0.5)` that returns `n` Countdown rows (same columns as `build_dataset`), where the first `easy_fraction` of them use 3 numbers and the rest use 4. Reuse `make_puzzle` (it has an `n_numbers` argument) and `make_prompt`.
2. Check with code that the first half has 3 numbers, the second half has 4, and every stored solution passes `check_equation`.
3. TRL's `GRPOConfig` shuffles the training data by default. Find the option that turns this off, and explain why you need it for a curriculum.

**Done looks like:** a script that prints one easy and one hard puzzle and "curriculum ok", plus the name of the config option and a one-sentence explanation.
