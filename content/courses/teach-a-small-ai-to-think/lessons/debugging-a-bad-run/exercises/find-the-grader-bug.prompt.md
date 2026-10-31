# Find the bug that keeps reward at zero

A learner's GRPO run sits at reward 0 for 60 steps with `frac_reward_zero_std` at 1.0. Their completions look reasonable when printed. Here is their correctness reward:

```python
import re

BUGGY = re.compile(r"<answer>(\d+)</answer>")

def buggy_reward(completions, answer, **kwargs):
    scores = []
    for text, gold in zip(completions, answer):
        match = BUGGY.search(text)
        target = gold.split("####")[-1].strip()
        scores.append(1.0 if match and match.group(1) == target else 0.0)
    return scores
```

1. Run it on these four completions, all of which a human would mark correct:

```python
tests = [
    "<think>48 / 2 = 24, 48 + 24 = 72</think><answer>72</answer>",
    "<think>48 + 24</think>\n<answer> 72 </answer>",
    "<think>...</think><Answer>72</Answer>",
    "<think>...</think><answer>$1,200</answer>",
]
golds = ["She sold 48 + 24 = 72\n#### 72"] * 3 + ["#### 1200"]
```

2. List every reason a correct answer can score 0.
3. Write a fixed `fixed_reward` that scores all four as correct, and show its output.
4. In one sentence: why would this bug make *training* stuck, not just the score look low?

**Done looks like:** the buggy output, a list of causes, working fixed code with output `[1.0, 1.0, 1.0, 1.0]`, and one sentence.
