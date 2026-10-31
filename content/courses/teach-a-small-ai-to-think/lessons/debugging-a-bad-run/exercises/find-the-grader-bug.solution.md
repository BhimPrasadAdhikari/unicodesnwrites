# Solution: the grader bug

**1. Buggy output:** `[1.0, 0.0, 0.0, 0.0]`. Only the first, perfectly tidy answer scores.

**2. Why correct answers score 0:**

| Completion | Why it fails |
|---|---|
| `<answer> 72 </answer>` | the pattern `(\d+)` allows no spaces around the number |
| `<Answer>72</Answer>` | the match is case-sensitive |
| `<answer>$1,200</answer>` | `$` and the comma are not digits, so the pattern does not match |
| (in general) | comparing strings means `"72.0"` or `"072"` would not equal `"72"` either |

**3. Fixed version:**

```python
import re

ANSWER = re.compile(r"<answer>(.*?)</answer>", re.DOTALL | re.IGNORECASE)
NUMBER = re.compile(r"-?\d+(?:\.\d+)?")

def parse_number(text):
    numbers = NUMBER.findall(text.replace(",", ""))
    return float(numbers[-1]) if numbers else None

def fixed_reward(completions, answer, **kwargs):
    scores = []
    for text, gold in zip(completions, answer):
        match = ANSWER.search(text)
        predicted = parse_number(match.group(1)) if match else None
        target = parse_number(gold.split("####")[-1])
        ok = predicted is not None and target is not None and abs(predicted - target) < 1e-6
        scores.append(1.0 if ok else 0.0)
    return scores

print(fixed_reward(tests, golds))   # [1.0, 1.0, 1.0, 1.0]
```

The fix captures *anything* inside the tags (ignoring case), strips commas, pulls out the number and compares numbers rather than strings. This is the same approach as `rewards.py` and `train_grpo.py`.

**4. Why training gets stuck:** a small model rarely produces the one exact spelling the buggy pattern accepts, so nearly every group scores all zeros, every advantage is zero, and GRPO receives no signal at all; the model never learns, which is why `frac_reward_zero_std` sat at 1.0.

**Lesson:** always unit-test a reward on hand-written right, wrong and messy answers before you spend GPU time.
