# Solution: group size sweep

```python
from grpo_tiny_adder import train

for G in [2, 4, 8, 16]:
    h = train(G=G)
    last = h[-1]
    first = next((x["step"] for x in h if x["accuracy"] >= 0.5), "never")
    print(f"G={G:<3} reward {last['reward']:.3f} accuracy {last['accuracy']:.2f} "
          f"entropy {last['entropy']:.2f} first step >= 0.5: {first}")
```

Output (seed 0, 200 steps):

| G | reward | accuracy | entropy | first step with accuracy ≥ 0.5 |
|---|---|---|---|---|
| 2 | 0.125 | 0.22 | 2.69 | never |
| 4 | 0.562 | 0.58 | 1.71 | 181 |
| 8 | 0.859 | 0.84 | 0.85 | 132 |
| 16 | 0.910 | 0.90 | 0.58 | 113 |

**Why bigger groups learn faster per step.** At the start each guess is right 1 time in 19. The chance that a whole group misses is (18/19)^G: about 90% for G = 2, 81% for G = 4, 65% for G = 8 and 42% for G = 16. All-wrong groups have zero advantage, so a bigger group means more groups that actually teach something, and a better estimate of the baseline when they do.

**What it costs.** Every step samples `batch × G` answers. G = 16 samples twice as many answers per step as G = 8 but gains only a little (accuracy 0.90 vs 0.84 here). On a language model each answer is hundreds of generated tokens, and generation is usually the slowest part of GRPO, so you would compare runs by *wall-clock time* or *number of answers sampled*, not by steps. That is why G = 8 is a common middle ground on small GPUs, and why the Colab script in the next module uses `num_generations=8`.
