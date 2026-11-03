# Solution: attacking the unit-conversion reward

Save this as `units_fix.py` in the starter repo folder and run it.

```python
import re

from tasks import units
from tasks.common import completion_text, extract_answer

NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")
THOUSANDS_RE = re.compile(r"(?<=\d),(?=\d{3}\b)")   # the comma in 3,500 only


def parse_single_number(text):
    """The number in the text, but only if there is exactly one."""
    if not text:
        return None
    found = NUMBER_RE.findall(THOUSANDS_RE.sub("", text))
    return float(found[0]) if len(found) == 1 else None


def strict_correctness_reward(completions, answer, **kwargs):
    rewards = []
    for c, true in zip(completions, answer):
        got = parse_single_number(extract_answer(completion_text(c)))
        ok = got is not None and abs(got - true) <= max(0.01 * abs(true), 0.01)
        rewards.append(1.0 if ok else 0.0)
    return rewards


tests = ["3500", "3500 or 3600", "3500, 3600", "about 3500 to 3600",
         "3,500", "3500 meters", "1,234,567", "-3500"]
golds = [3500.0] * 6 + [1234567.0, 3500.0]
wrap = lambda a: f"<think>x</think><answer>{a}</answer>"
print("old:", units.correctness_reward([wrap(t) for t in tests], golds))
print("new:", strict_correctness_reward([wrap(t) for t in tests], golds))
```

Output:

```text
old: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0]
new: [1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]
```

**The loophole.** The old reward only looks at the *first* number, so any answer that starts with the right number scores full marks, however many other numbers follow: "3500 or 3600" and "about 3500 to 3600" both pass. A model can't see the checker, but during GRPO it doesn't need to: if hedged answers that happen to start with the right number get rewarded, hedging gets reinforced, and you end up with a model that lists ranges instead of committing to one answer. On a real user's question, that's useless.

**The fix, in two parts.**

- `THOUSANDS_RE` removes a comma only when it sits between a digit and exactly three more digits followed by a word boundary. So `3,500` and `1,234,567` become plain numbers, but in `3500, 3600` the comma is followed by a space and stays, so the two numbers stay separate.
- `parse_single_number` returns a number only if exactly one is found. Any hedge with two or more numbers returns `None`, and `None` is never correct.

The honest answers ("3500", "3,500", "3500 meters", "1,234,567") still score 1.0, and the wrong sign ("-3500") still scores 0.

**Takeaway for your own task.** Every checker that "finds the answer somewhere in the text" has this risk. Ask: what's the laziest text that would pass? Then write a test for it. To use the fix in training, replace `correctness_reward` in `tasks/units.py` with this version and rerun `selftest.py`.
