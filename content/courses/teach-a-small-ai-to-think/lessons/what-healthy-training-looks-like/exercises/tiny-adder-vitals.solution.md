# Solution: the Tiny Adder's fuel gauge

```python
import numpy as np
import grpo_tiny_adder as m

original_advantages = m.advantages
silent = []  # one True/False per group, in training order


def counting_advantages(rewards):
    silent.append(float(np.std(rewards)) == 0.0)
    return original_advantages(rewards)


m.advantages = counting_advantages  # train() looks this up at call time


def fuel_gauge(G):
    silent.clear()
    history = m.train(G=G)
    per_step = np.array(silent).reshape(len(history), -1).mean(axis=1)  # 16 groups per step
    for step in (1, 50, 100, 150, 200):
        h = history[step - 1]
        print(f"G={G:<2} step {step:3d}  all-same groups {per_step[step - 1]:.2f}  "
              f"reward {h['reward']:.3f}  accuracy {h['accuracy']:.2f}")


fuel_gauge(8)
fuel_gauge(2)
```

Output (seed 0):

| G | step | all-same groups | reward | accuracy |
|---|---|---|---|---|
| 8 | 1 | 0.62 | 0.086 | 0.05 |
| 8 | 50 | 0.38 | 0.141 | 0.11 |
| 8 | 100 | 0.12 | 0.328 | 0.30 |
| 8 | 150 | 0.12 | 0.664 | 0.62 |
| 8 | 200 | 0.31 | 0.859 | 0.84 |
| 2 | 1 | 0.94 | 0.031 | 0.05 |
| 2 | 50 | 0.88 | 0.062 | 0.07 |
| 2 | 100 | 0.88 | 0.062 | 0.09 |
| 2 | 150 | 0.75 | 0.188 | 0.14 |
| 2 | 200 | 0.88 | 0.125 | 0.22 |

(Each value is one step of 16 groups, so it is noisy; the trend is what matters.)

**Why `G=8` falls, then rises.** At the start most groups are all wrong (0.62, close to the 65% you can calculate as (18/19)^8). As the model learns, groups more often contain a mix of right and wrong answers, so the fraction drops to about 0.12: lots of fuel. Near the end the model gets many questions right *every* time, so groups become all-correct, which are silent too; the fraction climbs back to 0.31. That late rise is a sign of success, and it is why learning slows down at the top of the S-curve.

**Why `G=2` stays high.** With two guesses, both are wrong about 90% of the time at the start, and the few informative groups give only a tiny push, so the model barely improves and the fraction stays near 0.9 throughout. This is exactly the "stuck" preset: the fuel gauge is on empty from the first step.
