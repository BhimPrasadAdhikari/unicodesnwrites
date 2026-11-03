# Solution: soft labels and temperature

```python
import math

def softmax(logits, temperature=1.0):
    scaled = [x / temperature for x in logits]
    top = max(scaled)
    exps = [math.exp(x - top) for x in scaled]
    total = sum(exps)
    return [e / total for e in exps]

answers = ["42", "41", "43", "24"]
teacher_logits = [4.0, 2.0, 1.5, -1.0]
for t in (0.5, 1.0, 2.0, 5.0):
    probs = softmax(teacher_logits, t)
    print(f"T={t:<4}", "  ".join(f"{a}:{p:.2f}" for a, p in zip(answers, probs)))
hard = [1.0 if a == "42" else 0.0 for a in answers]
print("hard  ", "  ".join(f"{a}:{p:.2f}" for a, p in zip(answers, hard)))
```

Output:

```text
T=0.5  42:0.98  41:0.02  43:0.01  24:0.00
T=1.0  42:0.82  41:0.11  43:0.07  24:0.01
T=2.0  42:0.58  41:0.21  43:0.16  24:0.05
T=5.0  42:0.38  41:0.25  43:0.23  24:0.14
hard   42:1.00  41:0.00  43:0.00  24:0.00
```

**Why subtract the largest value?** `exp(x - top)` divided by the sum gives exactly the same probabilities as `exp(x)` divided by its sum (the shift cancels out), but it keeps the numbers small, so `math.exp` never overflows.

**What temperature does.** As the temperature rises, probability moves from the top answer to the others. The near-misses 41 and 43 grow from almost nothing (0.02 and 0.01 at T=0.5) to clearly visible (0.21 and 0.16 at T=2), and they stay well above the far-off 24. At very high temperature (T=5) everything starts to look alike and the useful ranking blurs.

**Why a student learns more from T=2 than from the hard label.** The hard label only says "42, nothing else". The T=2 version also says "41 and 43 are close, 24 is not", which teaches the student how answers relate to each other. That extra information per example is what Hinton and colleagues called the teacher's "dark knowledge". (Reasoning-model distillation by SFT on traces uses hard labels only, which is one reason it needs many examples.)
