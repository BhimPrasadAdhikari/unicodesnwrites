# Solution: one nudge, by hand

## Case 1: `7` sampled, advantage +1

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| onehot(7) | 1 | 0 | 0 | 0 |
| − probs | −0.5 | −0.2 | −0.2 | −0.1 |
| **direction** | **+0.5** | **−0.2** | **−0.2** | **−0.1** |
| × 0.5 × (+1) = **change** | **+0.25** | **−0.10** | **−0.10** | **−0.05** |

`7` goes up; `8`, `6` and `no idea` go down.

## Case 2: `no idea` sampled, advantage −1

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| onehot(no idea) | 0 | 0 | 0 | 1 |
| − probs | −0.5 | −0.2 | −0.2 | −0.1 |
| direction | −0.5 | −0.2 | −0.2 | +0.9 |
| × 0.5 × (−1) = **change** | **+0.25** | **+0.10** | **+0.10** | **−0.45** |

`no idea` goes down; the other three go up.

## Step 4: new probabilities

```python
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

p = np.array([0.5, 0.2, 0.2, 0.1])
dials = np.log(p)
print(softmax(dials + np.array([0.25, -0.10, -0.10, -0.05])))  # case 1
print(softmax(dials + np.array([0.25, 0.10, 0.10, -0.45])))    # case 2
```

Real output, rounded:

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| before | 0.50 | 0.20 | 0.20 | 0.10 |
| after case 1 | **0.58** | 0.16 | 0.16 | 0.09 |
| after case 2 | **0.56** | 0.19 | 0.19 | **0.06** |

## Step 5: why `7` gains most in case 2

When `no idea` is pushed down, the probability it loses is shared out **in proportion to how likely each other answer already is**, and `7` already held the biggest share (0.5), so it gets the biggest dial increase (+0.25 vs +0.10).

## Why this matters

- **The direction always sums to zero** (+0.5 − 0.2 − 0.2 − 0.1 = 0). Probability is never created, only moved between answers. That is softmax's "shares must add to 100%" at work.
- **Negative advantages teach too.** In case 2 the model learned something useful from a bad answer, without ever sampling the good one.
- **The "rich get richer" effect** in step 5 is helpful when the leading answer is right, but it is also how a model can lock onto a wrong favorite. That is one reason a sensible learning rate and good exploration (sampling several answers) matter.
