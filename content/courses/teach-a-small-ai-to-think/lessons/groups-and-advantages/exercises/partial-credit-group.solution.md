# Solution: advantages with partial credit

```python
import numpy as np
r = np.array([1.5, 1.0, 0.5, 0.5, 0.0, 0.0, 1.5, 0.0])
print(r.mean(), r.std())                         # 0.625 0.5995
print(np.round((r - r.mean()) / (r.std() + 1e-4), 2))
# [ 1.46  0.63 -0.21 -0.21 -1.04 -1.04  1.46 -1.04]
```

**1.** Mean 0.625, std 0.5995. Advantages: `+1.46, +0.63, −0.21, −0.21, −1.04, −1.04, +1.46, −1.04`.

**2. Ranking.**

| Reward | Advantage | Effect |
|---|---|---|
| 1.5 (right and tidy) | +1.46 | pushed up most |
| 1.0 (right, untidy) | +0.63 | pushed up |
| 0.5 (tidy, wrong) | −0.21 | pushed down slightly |
| 0.0 (neither) | −1.04 | pushed down most |

**3.** In this group the correct-but-untidy answer (1.0) beats the group average of 0.625, so its advantage is positive (+0.63) and it becomes more likely. If every other answer had scored 1.5, the mean would be about 1.44 and this same answer would be *below* average, so it would get a negative advantage and be pushed down.

**Why:** advantages are always relative to the group. The same answer can be encouraged in one group and discouraged in another, depending on what its "classmates" did. That is exactly what lets GRPO keep improving: once tidy, correct answers are common, merely-correct ones stop being rewarded.
