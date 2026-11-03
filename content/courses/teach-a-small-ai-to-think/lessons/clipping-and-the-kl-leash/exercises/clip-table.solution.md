# Solution: the clipping table

| # | A | Ratio | Clipped or flows? | Objective |
|---|---|---|---|---|
| 1 | +1 | 1.1 | flows (inside the band) | 1.1 |
| 2 | +1 | 1.3 | **clipped** (good answer already 30% more likely) | 1.2 |
| 3 | −1 | 0.9 | flows (inside the band) | −0.9 |
| 4 | −1 | 0.7 | **clipped** (bad answer already 30% less likely) | −0.8 |
| 5 | −1 | 1.5 | flows (bad answer went the wrong way) | −1.5 |
| 6 | +1 | 0.6 | flows (good answer went the wrong way) | 0.6 |

You can check the objective column in Python:

```python
import numpy as np
for A, r in [(1, 1.1), (1, 1.3), (-1, 0.9), (-1, 0.7), (-1, 1.5), (1, 0.6)]:
    print(A, r, min(r * A, float(np.clip(r, 0.8, 1.2)) * A))
```

In rows 2 and 4 the objective is a constant (1.2 or −0.8) no matter how the ratio changes nearby, so its slope, the gradient, is zero. That is what "clipped" means.

**The pattern in rows 5 and 6:** the ratio moved *against* what the advantage wanted (a bad answer became more likely, a good one less likely). Taking the `min` keeps the unclipped, worse-looking value, so the gradient keeps flowing and the update corrects the mistake. Clipping is a brake on overshooting, never a brake on fixing errors. This matches the two-line rule in `grpo_tiny_adder.py`: clip only when `A > 0 and ratio > 1 + eps` or `A < 0 and ratio < 1 - eps`.
