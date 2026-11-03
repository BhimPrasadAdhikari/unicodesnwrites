# Compare lengths within each group

A fixed `max_len` treats every question the same. But a hard question may *need* 300 tokens, and penalizing that pushes down the very answers that solved it.

**Your task:** write `group_length_reward(prompts, completions, answer, alpha=0.5, **kwargs)` that:

1. groups completions by their prompt (TRL repeats each prompt once per sampled answer, so identical prompts belong to the same group),
2. gives 0.0 to every wrong answer,
3. within each group, gives 1.0 to the shortest correct answer and `1 - alpha` to the longest correct answer, sliding in a straight line in between,
4. gives 1.0 when there's only one correct answer in the group (or all correct answers are the same length).

Use `count_tokens`, `is_correct` and `make_completion` from `length_rewards.py`.

**Done looks like:** for this input

```python
prompts = ["What is 17 + 25?"] * 4 + ["What is 9 + 9?"] * 3
completions = [
    make_completion(12, 42), make_completion(80, 42),
    make_completion(170, 42), make_completion(12, 41),
    make_completion(300, 18), make_completion(300, 17), make_completion(20, 17),
]
answer = [42] * 4 + [18] * 3
```

your function returns `[1.0, 0.78, 0.5, 0.0, 1.0, 0.0, 0.0]` (rounded to 2 decimals). Then explain in one sentence why the 300-token answer to "9 + 9" gets full marks.
