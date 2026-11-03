# Solution: sweeping beta

```python
from grpo_tiny_adder import train

for beta in [0.0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5]:
    last = train(beta=beta)[-1]
    print(f"beta {beta:<5} reward {last['reward']:.3f} "
          f"accuracy {last['accuracy']:.2f} entropy {last['entropy']:.2f}")
```

Output (seed 0, 200 steps):

| beta | reward | accuracy | entropy |
|---|---|---|---|
| 0 | 0.859 | 0.84 | 0.85 |
| 0.01 | 0.844 | 0.81 | 0.96 |
| 0.02 | 0.781 | 0.78 | 1.09 |
| 0.05 | 0.625 | 0.68 | 1.48 |
| 0.1 | 0.383 | 0.48 | 2.14 |
| 0.2 | 0.172 | 0.18 | 2.82 |
| 0.5 | 0.062 | 0.07 | 2.94 |

1. **Where it starts to hurt:** up to about 0.02 the cost is small. By 0.05 accuracy after 200 steps has dropped from 0.84 to 0.68, and by 0.1 the run has learned less than half as much. At 0.5 the model barely moves from random guessing (accuracy 1/19 ≈ 0.05 is pure chance).

2. **Entropy rises with beta.** The reference is the all-zeros table, which means "every answer equally likely", the highest-entropy distribution possible (about 2.94 for 19 answers). A stronger leash pulls the model back toward it, so the answers stay more spread out. At beta 0.5 the entropy is still 2.94: the model never really left home.

3. **Why keep a small beta in a real run:** a language model's weights are shared across everything it knows, and the reward can be imperfect, so a gentle pull toward the starting model guards against drifting into strange or broken text, a cost the tiny, perfectly-graded toy cannot show.

(The toy uses a simple stand-in for the KL gradient, a pull of the logits toward the reference, so exact numbers would differ with the textbook KL gradient. The trend is the same.)
