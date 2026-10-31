# Solution: re-planning the batch

**1.** Halve the micro-batch and double the accumulation:

```python
per_device_train_batch_size=4,
gradient_accumulation_steps=4,   # 4 x 4 = 16 completions per step, same as before
num_generations=8,
```

Memory use during the backward pass drops because only 4 completions are processed at a time; the optimizer still sees 16 completions per step.

**2.** 16 completions / 8 per group = **2 questions** per step, unchanged.

**3.** With the original settings there are 8 × 2 = 16 completions per step. 16 is divisible by 16, so TRL accepts `num_generations=16`, but each step would now contain **only one question** (one group of 16). That makes each step's update depend on a single problem, which is noisy. A setting that keeps two questions per step:

```python
per_device_train_batch_size=8,
gradient_accumulation_steps=4,   # 32 completions = 2 questions x 16
num_generations=16,
```

This doubles the generation work per step, so each step takes roughly twice as long.

**4.** Any one of these works:

- `max_completion_length` (e.g. 256 → 192): fewer tokens to store, but the model has less room to think, and more answers get cut off (and masked out, with `mask_truncated_completions=True`).
- LoRA rank `r` (16 → 8): fewer trainable numbers, but a smaller adapter may learn less.
- A smaller `per_device_train_batch_size` with more accumulation, as in part 1: same learning, slower steps.

**Why:** in TRL every batch size is counted in completions, and the step must hold whole groups. Thinking in "questions × group size" makes these trade-offs easy to see.
