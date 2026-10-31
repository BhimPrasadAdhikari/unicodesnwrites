# Solution: choosing alpha

A correct answer of 200+ tokens scores `1 - alpha`. A wrong answer always scores 0.

| alpha | Long correct answer | Short wrong answer | Which does GRPO prefer? |
|---|---|---|---|
| 0.2 | 0.8 | 0.0 | the correct one, clearly |
| 0.5 | 0.5 | 0.0 | the correct one |
| 1.0 | 0.0 | 0.0 | neither: they score the same |
| 1.5 | −0.5 | 0.0 | **the wrong one** |

1. **Above `alpha = 1`** the long correct answer scores below zero, so a short wrong answer beats it. The model would learn to give up on hard problems and guess.
2. **At `alpha = 1`** a long correct answer is worth exactly as much as a wrong one. On a hard problem where every right answer is long, the model gets no signal at all for being right. It's the edge of the cliff.
3. Run this next to `length_rewards.py`:

```python
from length_rewards import length_penalty_reward, group_advantages, make_completion

completions = [make_completion(n, a) for n, a in [(12, 42), (80, 42), (170, 42), (260, 42), (12, 41)]]
rewards = length_penalty_reward(completions, [42] * 5, alpha=1.0)
print([round(r, 2) for r in rewards])
print([round(a, 2) for a in group_advantages(rewards)])
```

It prints:

```text
[0.94, 0.6, 0.16, 0.0, 0.0]
[1.61, 0.7, -0.5, -0.91, -0.91]
```

The very long correct answer (fourth) now has **exactly the same** advantage as the short wrong answer (fifth): −0.91. GRPO pushes both down equally hard. Even the long-but-under-the-cap correct answer (third) is pushed down. That's the golden rule failing in practice.

**Rule of thumb:** start with `alpha` between 0.1 and 0.3, and only raise it if length keeps growing while accuracy holds.
