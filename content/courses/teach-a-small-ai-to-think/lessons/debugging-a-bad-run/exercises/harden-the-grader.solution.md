# Solution: a hardened grader

```python
import re

ANSWER = re.compile(r"<answer>(.*?)</answer>", re.DOTALL | re.IGNORECASE)
THINK = re.compile(r"<think>(.*?)</think>", re.DOTALL)
SINGLE_NUMBER = re.compile(r"^\s*\$?\s*(-?[\d,]*\.?\d+)\s*\.?\s*$")
NUMBER = re.compile(r"-?\d+(?:\.\d+)?")

def parse_number(text):
    numbers = NUMBER.findall(text.replace(",", ""))
    return float(numbers[-1]) if numbers else None

def hardened_reward(completions, answer, **kwargs):
    scores = []
    for text, gold in zip(completions, answer):
        answers = ANSWER.findall(text)
        think = THINK.search(text)
        # Loopholes 1 and 3: exactly one answer tag, and some real thinking.
        if len(answers) != 1 or not think or len(think.group(1).split()) < 5:
            scores.append(0.0)
            continue
        # Loophole 2: the answer must be one number, not a list of guesses.
        only = SINGLE_NUMBER.match(answers[0])
        target = parse_number(gold.split("####")[-1])
        ok = (only is not None and target is not None
              and abs(float(only.group(1).replace(",", "")) - target) < 1e-6)
        scores.append(1.0 if ok else 0.0)
    return scores

print(hardened_reward(tests, golds))   # [1.0, 0.0, 0.0, 0.0, 1.0]
```

How each test is handled:

| # | Completion | Score | Why |
|---|---|---|---|
| 1 | proper thinking, `72` | 1.0 | passes every check |
| 2 | `<think>.</think>` | 0.0 | fewer than 5 words of thinking |
| 3 | two `<answer>` tags | 0.0 | more than one answer tag |
| 4 | "It is 48, 24 or 72" | 0.0 | not a single number |
| 5 | `$72.` | 1.0 | a `$` and a trailing full stop are allowed |

For comparison, the earlier `fixed_reward` scores these `[1.0, 1.0, 0.0, 1.0, 1.0]`: it pays for the empty thinking and for the list of guesses (it takes the last number, 72).

**The risk of a stricter grader:** every rule you add is another way for an honest, correct answer to score zero, so a too-strict grader can push the run back toward "stuck at zero", especially early when the model's formatting is still messy. A common compromise is to keep the correctness check strict but give the format and thinking rules their own smaller rewards (or phase them in), and to re-test the grader on real completions every time you change it.
