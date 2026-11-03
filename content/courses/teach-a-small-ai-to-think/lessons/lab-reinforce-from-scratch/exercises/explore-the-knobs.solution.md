# Solution: turn the knobs

```python
from reinforce_bandit import average_runs

experiments = {
    "default": dict(baseline="mean"),
    "lr=2.0": dict(baseline="mean", lr=2.0),
    "batch 2": dict(baseline="mean", batch_size=2),
    "batch 2, no baseline": dict(baseline="none", batch_size=2),
}
for name, kwargs in experiments.items():
    mean, std = average_runs(**kwargs)
    print(f"{name:<22} step 10: {mean[10]:.2f} ({std[10]:.2f})   step 60: {mean[60]:.2f} ({std[60]:.2f})")
```

Real results (mean over 20 seeds, spread in brackets):

| Experiment | Step 10 | Step 60 |
|---|---|---|
| Default | 0.59 (0.04) | 0.96 (0.00) |
| lr = 2.0 | 0.94 (0.02) | 0.99 (0.00) |
| Batch 2 | 0.43 (0.07) | 0.92 (0.02) |
| Batch 2, no baseline | 0.60 (0.18) | 0.97 (0.01) |

## A. The fastest setting

`lr=2.0` learned fastest by far (0.94 at step 10). It is safe here because the toy is tiny and its scores never lie: `7` is always worth exactly 1.0 more than `8`, so big steps always point the right way. On a real model, rewards are noisy (a right answer can come from a lucky guess), loopholes exist, and every step changes hundreds of millions of shared parameters. A big step taken on a misleading batch can damage skills the model already had, which is why real runs use small learning rates plus the clipping and KL leash you will meet in Module 4.

## B. Batch of 2, with and without a baseline

With two samples, the mean baseline **cuts the spread a lot** at step 10 (0.07 vs 0.18): runs agree with each other much more. But it also learns a little slower on average (0.43 vs 0.60). Why? With only two samples, whenever both picks are the same answer, both advantages are exactly zero, so that step teaches nothing. And when one pick is `7`, the advantage it gets is only half the gap to the other pick. Without a baseline, every pick with a positive score moves the logits, so steps are bigger but much more erratic.

This is the general trade-off: a baseline lowers noise (good for reliability) but needs enough samples to estimate "usual" well. It is also a preview of GRPO, which samples a **group** of several answers per question precisely so that its baseline, the group average, is a decent estimate. And it explains a GRPO failure mode you will meet in Module 6: when every answer in a group gets the same score, the advantages are all zero and that question teaches nothing.
