# Solution: a running-average baseline

Save this next to `reinforce_bandit.py` and run it from the same folder.

```python
import numpy as np
from reinforce_bandit import ANSWERS, REWARDS, softmax


def train_running(steps=60, batch_size=8, lr=0.5, bonus=0.0, seed=0, decay=0.9, warm_start=True):
    """REINFORCE with a running-average baseline instead of the batch mean."""
    rng = np.random.default_rng(seed)
    logits = np.zeros(len(ANSWERS))
    running = None if warm_start else 0.0
    p_correct = [softmax(logits)[0]]
    for _ in range(steps):
        probs = softmax(logits)
        picks = rng.choice(len(ANSWERS), size=batch_size, p=probs)
        rewards = REWARDS[picks] + bonus
        if running is None:
            running = rewards.mean()  # warm start from the first batch
        advantages = rewards - running  # compare with the running average
        grad = np.zeros_like(logits)
        for k, a in zip(picks, advantages):
            grad += a * (np.eye(len(ANSWERS))[k] - probs)
        logits = logits + lr * grad / batch_size
        running = decay * running + (1 - decay) * rewards.mean()  # update after use
        p_correct.append(softmax(logits)[0])
    return np.array(p_correct)


for warm in [False, True]:
    for bonus in [0.0, 10.0]:
        runs = np.stack([train_running(bonus=bonus, seed=s, warm_start=warm) for s in range(20)])
        m = runs.mean(axis=0)
        print(f"warm_start={warm!s:<5} bonus={bonus:>4}:  "
              f"step 10 {m[10]:.2f}  step 20 {m[20]:.2f}  step 60 {m[60]:.2f}")
```

Real results (mean P(`7`) over 20 seeds):

| Start | Bonus | Step 10 | Step 20 | Step 60 |
|---|---|---|---|---|
| 0 | 0 | 0.63 | 0.86 | 0.97 |
| 0 | +10 | 0.24 | 0.35 | 0.63 |
| First batch mean | 0 | 0.64 | 0.86 | 0.97 |
| First batch mean | +10 | 0.64 | 0.86 | 0.97 |

## Why

- **Zero start with +10.** At the beginning, the running average is 0 but every score is about 10 to 11.5. So for the first several steps every advantage is a big positive number, exactly like having no baseline at all. With `decay=0.9`, the average only moves 10% of the way toward the true level each step, so it takes a couple of dozen steps to catch up. By then, many runs have already snowballed onto a wrong answer, and the average at step 60 is only 0.63.
- **Warm start.** Starting the running average at the first batch's mean puts it near the right level from step one. From then on, the shared +10 cancels just as it does with the batch-mean baseline, and the results match the no-bonus run exactly.
- **Without a bonus**, both starts behave about the same, because the scores (0 to 1.5) are close to 0 anyway.

## The bigger lesson

A baseline only helps if it is a good estimate of "usual" **for the current situation**. A running average lags behind; a batch mean is always current but noisy with small batches. GRPO's choice, coming next module, is the mean of a group of answers to the **same question**, which is current, specific to that question, and needs no extra model to estimate.
