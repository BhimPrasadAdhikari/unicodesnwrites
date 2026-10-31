# Solution: the length bias by hand

**Step 1: advantages.** The group mean reward is (1 + 1 + 0 + 0) / 4 = 0.5. So correct answers get 1 − 0.5 = **+0.5** and wrong answers get 0 − 0.5 = **−0.5**.

**Steps 2 and 3: push per token.**

| Answer | Correct? | Length | Advantage | Original GRPO: advantage ÷ own length | Dr. GRPO: advantage ÷ 200 |
|---|---|---|---|---|---|
| A | yes | 20 | +0.5 | +0.0250 | +0.0025 |
| B | yes | 80 | +0.5 | +0.00625 | +0.0025 |
| C | no | 20 | −0.5 | −0.0250 | −0.0025 |
| D | no | 200 | −0.5 | −0.0025 | −0.0025 |

You can check it in Python:

```python
rewards = [1, 1, 0, 0]
lengths = [20, 80, 20, 200]
mean = sum(rewards) / len(rewards)
for name, r, n in zip("ABCD", rewards, lengths):
    adv = r - mean
    print(name, adv, round(adv / n, 5), round(adv / 200, 5))
```

which prints:

```text
A 0.5 0.025 0.0025
B 0.5 0.00625 0.0025
C -0.5 -0.025 -0.0025
D -0.5 -0.0025 -0.0025
```

**Step 4.** Under the original averaging, the long wrong answer D is punished ten times more gently per token than the short wrong answer C (−0.0025 against −0.025). Over many steps the model learns that when it is unsure, rambling is "safer" than committing to a short wrong answer, so wrong answers grow longer. With Dr. GRPO's constant divisor, every token of every answer gets the same size of push, so length alone no longer changes how hard an answer is pushed up or down.

One more way to see it: under the original averaging, every answer gets the same *total* push (its advantage) however long it is, so the extra tokens of a long wrong answer are almost free. Under Dr. GRPO, a long answer's total push grows with its length, so a long wrong answer is punished more in total, not less.
