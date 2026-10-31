# Solution: a gentle thinking reward

```python
import re

THINK_PATTERN = re.compile(r"<think>(.*?)</think>", re.DOTALL)


def completion_text(completion):
    return completion if isinstance(completion, str) else completion[0]["content"]


def thinking_reward(completions, **kwargs):
    """Up to 0.1 for writing some reasoning inside <think>, capped at 50 words."""
    scores = []
    for c in completions:
        match = THINK_PATTERN.search(completion_text(c))
        if not match:
            scores.append(0.0)
            continue
        words = len(match.group(1).split())
        scores.append(0.1 * min(words, 50) / 50)
    return scores


tests = [
    "<think>ok</think><answer>12</answer>",
    "<think>" + "step " * 30 + "</think><answer>12</answer>",
    [{"role": "assistant", "content": "The answer is 12."}],
]
print(thinking_reward(tests))
# [0.002, 0.06, 0.0]
```

To use it, add it to the list in `train_grpo.py`:

```python
reward_funcs=[format_reward, correctness_reward, thinking_reward],
```

TRL will log it separately as `rewards/thinking_reward/mean`.

**Why capped and small.** Without a cap, the cheapest way to earn more reward would be to write more words, so the model would learn to ramble until it hit `max_completion_length`, a form of reward hacking. Keeping the maximum at 0.1 (versus 1.0 for a correct answer) means the bonus can only break ties between otherwise-equal answers in a group; it can never outweigh actually getting the maths right.
