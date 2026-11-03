# Solution: a group-relative length reward

Save this next to `length_rewards.py` and run it.

```python
from collections import defaultdict

from length_rewards import count_tokens, is_correct, make_completion


def group_length_reward(prompts, completions, answer, alpha=0.5, **kwargs):
    """Correct answers: 1.0 for the shortest correct one in the group,
    sliding down to 1 - alpha for the longest correct one. Wrong: 0.0."""
    groups = defaultdict(list)                 # same prompt -> same group
    for i, p in enumerate(prompts):
        groups[str(p)].append(i)

    rewards = [0.0] * len(completions)
    for indices in groups.values():
        right = [i for i in indices if is_correct(completions[i], answer[i])]
        if not right:
            continue                           # nobody right: all stay 0.0
        lengths = {i: count_tokens(completions[i]) for i in right}
        shortest, longest = min(lengths.values()), max(lengths.values())
        for i in right:
            if longest == shortest:
                rewards[i] = 1.0
            else:
                rewards[i] = 1.0 - alpha * (lengths[i] - shortest) / (longest - shortest)
    return rewards


if __name__ == "__main__":
    prompts = ["What is 17 + 25?"] * 4 + ["What is 9 + 9?"] * 3
    completions = [
        make_completion(12, 42), make_completion(80, 42),
        make_completion(170, 42), make_completion(12, 41),
        make_completion(300, 18), make_completion(300, 17), make_completion(20, 17),
    ]
    answer = [42] * 4 + [18] * 3
    rewards = group_length_reward(prompts, completions, answer)
    print([round(r, 2) for r in rewards])
```

Output:

```text
[1.0, 0.78, 0.5, 0.0, 1.0, 0.0, 0.0]
```

**How it works.** A dictionary maps each prompt to the positions of its answers. We use `str(p)` as the key so it also works when prompts are lists of chat messages (lists can't be dictionary keys). For each group we find the correct answers, then their shortest and longest lengths, and place every correct answer on a straight line between 1.0 and `1 - alpha`.

For "17 + 25" there are three correct answers of 11, 79 and 169 tokens. The shortest gets 1.0, the longest 0.5, and the middle one 1 − 0.5 × (79 − 11) / (169 − 11) ≈ 0.78.

**Why the 300-token answer to "9 + 9" gets full marks:** it's the only correct answer in its group, so there's nothing shorter to compare it with, and a lone right answer to a question the model finds hard should be encouraged, not penalized for its length.

**One thing to watch:** this reward only compares answers *within* a group, so it never pushes a group whose correct answers are all long toward being shorter. That's the price of protecting hard problems. A small fixed penalty on top, or a gentle `overlong_shaping`, covers that case.
