# Solution: a partial-credit grader

```python
import grpo_tiny_adder as m

def partial_credit(a, b, k, buggy=False):
    distance = abs(k - (a + b))
    return 1.0 if distance == 0 else (0.5 if distance == 1 else 0.0)

honest = m.train()
m.reward = partial_credit          # train() looks up m.reward at call time
partial = m.train()

for i in (49, 99, 199):
    print(honest[i]["step"], f"{honest[i]['accuracy']:.2f}", f"{partial[i]['accuracy']:.2f}")
```

Output (seed 0):

| Step | Accuracy, honest 0/1 grader | Accuracy, partial credit |
|---|---|---|
| 50 | 0.11 | 0.09 |
| 100 | 0.30 | 0.23 |
| 200 | 0.84 | 0.73 |

**Did it help?** No, on this toy it made learning of the exact sum slightly *slower*. Partial credit does make more groups informative early on (an off-by-one answer now earns something), but it also tells the model that "close" is good. Probability flows toward the neighbors of the right answer as well as to the right answer itself, so it takes longer to concentrate on the exact sum. The reward curve looks healthier (it climbs to 0.78 by step 200), which is exactly why you must compare against the true goal, not the reward.

**Why this matters:** reward shaping is a trade-off, not a free win. Partial credit can rescue a run that is stuck at zero (when almost every group is silent), but it can also pull the model toward "almost right". The grader is now honest (it uses `a` and `b`), yet it still changes what the model optimizes. Always test a new reward against an untrained-on measure, as the real GSM8K run will do with held-out questions.
