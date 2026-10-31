# Solution: a group's advantages by hand

**1. Mean.** Three answers are right: 3 / 8 = **0.375**.

**2. Standard deviation.** Each right answer is 1 − 0.375 = 0.625 above the mean; each wrong answer is 0.375 below.

- Squared differences: three of 0.625² = 0.390625, five of 0.375² = 0.140625.
- Average: (3 × 0.390625 + 5 × 0.140625) / 8 = (1.171875 + 0.703125) / 8 = 0.234375.
- Square root: **0.484** (shortcut for 0/1 rewards: sqrt(0.375 × 0.625) gives the same).

**3. Advantages.**

- Right answers: (1 − 0.375) / 0.4842 = **+1.29**
- Wrong answers: (0 − 0.375) / 0.4842 = **−0.77**

| # | Answer | Reward | Advantage |
|---|---|---|---|
| 1 | 12 | 1 | +1.29 |
| 2 | 12 | 1 | +1.29 |
| 3 | 13 | 0 | −0.77 |
| 4 | 2 | 0 | −0.77 |
| 5 | 11 | 0 | −0.77 |
| 6 | 12 | 1 | +1.29 |
| 7 | 75 | 0 | −0.77 |
| 8 | 14 | 0 | −0.77 |

Check: 3 × 1.29 + 5 × (−0.77) = 3.87 − 3.85 ≈ 0 (the tiny leftover is rounding).

**4.** The answer "12" becomes more likely (it appears three times, each with +1.29, so it gets a strong push). The answers 13, 2, 11, 75 and 14 each become a little less likely.

You can confirm with Python:

```python
import numpy as np
r = np.array([1, 1, 0, 0, 0, 1, 0, 0], dtype=float)
print(r.mean(), r.std(), np.round((r - r.mean()) / (r.std() + 1e-4), 2))
# 0.375 0.4841229182759271 [ 1.29  1.29 -0.77 -0.77 -0.77  1.29 -0.77 -0.77]
```

**Why it matters:** with 3 out of 8 right, success is uncommon but not rare, so the push up (+1.29) is moderate. Compare the lesson's table: one success out of eight earned +2.64. The rarer the success, the louder GRPO celebrates it.
