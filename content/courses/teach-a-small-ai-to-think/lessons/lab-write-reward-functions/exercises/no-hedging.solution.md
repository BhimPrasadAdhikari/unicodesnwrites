# Solution: stop the model hedging its answer

## Steps 1 and 2

With the original `correctness_reward`:

| Answer | Score |
|---|---|
| `<answer>26 or 18</answer>` | 1.0 |
| `<answer>18 or 26</answer>` | 0.0 |

The scores differ because `parse_number` only looks at the **last** number. That is bad for training because a model that learns to list several guesses gets rewarded whenever the right one happens to come last. Over thousands of questions it would learn "list guesses, put a likely one last" instead of "work it out".

## Step 3

```python
def single_number_correctness(completions, answer, **kwargs):
    """1.0 only if the answer block holds exactly one number and it matches the gold number."""
    scores = []
    for c, gold in zip(completions, answer):
        inside = extract_answer(completion_text(c))
        numbers = NUMBER_PATTERN.findall(inside.replace(",", "")) if inside else []
        target = parse_number(gold_from_gsm8k(gold))
        is_right = len(numbers) == 1 and target is not None and abs(float(numbers[0]) - target) < 1e-6
        scores.append(1.0 if is_right else 0.0)
    return scores
```

## Step 4: check it

```python
tests = [
    ("<think>not sure</think><answer>26 or 18</answer>", "#### 18"),
    ("<think>not sure</think><answer>18 or 26</answer>", "#### 18"),
    ("<think>9 * 2</think><answer>$18.</answer>", "#### 18"),
    ("<think>9 * 2</think><answer>18.0</answer>", "#### 18"),
    ("<think>1000 + 18</think><answer>$1,018</answer>", "#### 1,018"),
    ("The answer is 18.", "#### 18"),
]
completions, golds = zip(*tests)
print(single_number_correctness(list(completions), list(golds)))
# [0.0, 0.0, 1.0, 1.0, 1.0, 0.0]
```

## Why it works

- **Counting numbers inside the answer block only.** Numbers in the thinking are fine and expected; only the final answer must be a single number.
- **Commas removed first,** so `1,018` is one number (1018), not two (1 and 018).
- **`if inside else []`** means a missing answer block gives an empty list, hence a score of 0, never a crash.

## A trade-off to notice

This rule also rejects honest answers like `<answer>18 dollars for 9 eggs</answer>`, because that holds two numbers. That is usually fine: we told the model to put only the final answer in the block, and the reward now enforces it. But it is a real choice. Every rule you add closes one loophole and may punish some honest answers. Test both kinds.
