# Solution: a strict grader

```python
import re

ANSWER_RE = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)
NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def to_number(text):
    found = NUMBER_RE.findall((text or "").replace(",", "").replace("$", ""))
    return float(found[-1]) if found else None


def strict_number(text):
    """Only trust a single <answer> block that holds exactly one number."""
    blocks = ANSWER_RE.findall(text)
    if len(blocks) != 1 or "</think>" not in text:
        return None
    numbers = NUMBER_RE.findall(blocks[0].replace(",", "").replace("$", ""))
    return float(numbers[0]) if len(numbers) == 1 else None


replies = [
    "<think>12 * 3 = 36, 36 - 10 = 26</think>\n<answer>26</answer>",
    "<think>...</think>\n<answer>$1,200</answer>",
    "So the answer is 26.",
    "<think>hmm</think><answer>26 or 27</answer>",
    "<think>a</think><answer>25</answer><answer>26</answer>",
]
golds = [26, 1200, 26, 26, 26]
for reply, gold in zip(replies, golds):
    print(strict_number(reply) == gold, to_number(reply) == gold)
```

Output (strict first, lenient second):

```text
True True
True True
False True
False False
False True
```

| Reply | Strict | Lenient | Why they differ |
|---|---|---|---|
| Clean answer, 26 | correct | correct | Both agree |
| `$1,200` | correct | correct | Both strip `$` and commas |
| "So the answer is 26." | wrong | correct | No tags: lenient finds the last number anyway |
| "26 or 27" | wrong | wrong | Strict refuses a hedge; lenient picks 27, the last number |
| Two answer blocks, 25 then 26 | wrong | correct | Lenient reads the last number and rewards the hedge |

**When to report each.** Report the lenient score when you compare an untrained model with a trained one, because you want to measure maths ability, not whether it has learned your tags yet. Report the strict score for your final model, because that's how a program using the model would actually read its answers, and it catches hedging that the lenient score hides.

**Bonus: adding it to `evaluate()`.** Add a `strict = []` list, then inside the loop `strict.append(strict_number(reply) == gold)`, and return `"strict_accuracy": statistics.fmean(strict)` alongside the other numbers. Before training, expect strict accuracy to sit well below lenient accuracy; after distillation the gap should shrink as the student adopts the format.
