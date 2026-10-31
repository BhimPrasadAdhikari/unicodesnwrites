# Solution: close the duplicate-tag loophole

```python
import re

TAGS = ["<think>", "</think>", "<answer>", "</answer>"]
THINK_PATTERN = re.compile(r"<think>(.*?)</think>", re.DOTALL)


def strict_format_reward(completions, **kwargs):
    """1.0 only for one think block with real content, then one answer block."""
    scores = []
    for c in completions:
        text = completion_text(c)
        once_each = all(text.count(tag) == 1 for tag in TAGS)
        think = THINK_PATTERN.search(text)
        has_thinking = think is not None and think.group(1).strip() != ""
        scores.append(1.0 if once_each and has_thinking and FORMAT_PATTERN.match(text) else 0.0)
    return scores
```

Running it on the five test inputs (this is real output):

```
tidy             1.0
tags twice       0.0
spaces only      0.0
wrong order      0.0
chat message     1.0
```

## Why it works

- **Counting tags** is the fix for the loophole. The original pattern was satisfied because `.+?` stretched over `18</answer><answer>18` to reach the end of the text. Counting does not care how a pattern could be stretched; two `<answer>` tags is simply two.
- **The thinking check** uses `.strip()` so that spaces and line breaks alone do not count. (The original pattern already rejects a completely empty `<think></think>`, because `.+?` needs at least one character, but it lets `<think>   </think>` through.)
- **Keeping `FORMAT_PATTERN`** still enforces the order and that nothing sits outside the two blocks. Tag counts alone would accept the wrong order.
- **`completion_text`** means the chat-message input works without any extra code.

## Should you always be this strict?

Not necessarily at the very start. A strict format reward gives a beginner model very little to learn from, because almost none of its first answers are perfect. A common approach is to use the soft (partial-credit) format reward early on, or alongside the strict one with a small weight, and rely on the strict one once the model has mostly picked up the shape. Whatever you choose, test it on strange inputs first, exactly as you did here.
