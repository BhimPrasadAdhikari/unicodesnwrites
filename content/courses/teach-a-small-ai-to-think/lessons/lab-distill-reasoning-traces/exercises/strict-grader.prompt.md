# Add a strict grader next to the lenient one

The lab's grader is deliberately generous: it takes the number from `<answer>`, or from `\boxed{}`, or just the last number in the reply. That's fair for the "before" run, but it can hide problems. A reply that hedges with two answers, or never uses the tags, can still be counted as right.

**Your task:** write `strict_number(text)` that returns a number only when:

1. the reply contains `</think>` (it finished thinking),
2. there is **exactly one** `<answer>…</answer>` block, and
3. that block contains **exactly one** number (commas and `$` ignored).

Otherwise it returns `None`. Then compare it with the lenient `to_number` on these replies:

```python
replies = [
    "<think>12 * 3 = 36, 36 - 10 = 26</think>\n<answer>26</answer>",
    "<think>...</think>\n<answer>$1,200</answer>",
    "So the answer is 26.",
    "<think>hmm</think><answer>26 or 27</answer>",
    "<think>a</think><answer>25</answer><answer>26</answer>",
]
golds = [26, 1200, 26, 26, 26]
```

**Done looks like:** a table showing, for each reply, whether the strict and the lenient grader mark it correct, and two sentences on when you'd report each one. Bonus: add a `strict_accuracy` number to `evaluate()` in `sft_distill.py`.
