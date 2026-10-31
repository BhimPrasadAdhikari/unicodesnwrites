# Solution: a weekdays task

`tasks/weekdays.py`:

```python
"""Weekdays: what day of the week is it N days after a given day?"""
import random

try:
    from .common import completion_text, extract_answer, format_reward, make_prompt
except ImportError:  # run directly as a script
    from common import completion_text, extract_answer, format_reward, make_prompt

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def build_dataset(n, seed=0, split="train"):
    """n questions; the answer is found with simple counting modulo 7."""
    rng = random.Random(seed if split == "train" else seed + 10_000)
    rows = []
    for _ in range(n):
        start = rng.randrange(7)
        days = rng.randint(1, 100)
        question = (f"Today is {DAYS[start]}. What day of the week will it be in "
                    f"{days} days? Answer with the day's name.")
        rows.append({"prompt": make_prompt(question), "answer": DAYS[(start + days) % 7]})
    return rows


def correctness_reward(completions, answer, **kwargs):
    """1.0 if the answer is exactly the right day name (case ignored)."""
    rewards = []
    for c, true in zip(completions, answer):
        got = (extract_answer(completion_text(c)) or "").strip(" .").lower()
        rewards.append(1.0 if got == true.lower() else 0.0)
    return rewards


REWARD_FUNCS = [format_reward, correctness_reward]
REWARD_WEIGHTS = [0.5, 1.0]
```

In `tasks/__init__.py`:

```python
from . import countdown, logic, units, weekdays

TASKS = {"countdown": countdown, "units": units, "logic": logic, "weekdays": weekdays}
```

A test, saved as `test_weekdays.py` in the repo folder:

```python
from tasks import weekdays

rows = weekdays.build_dataset(500, seed=0)
assert rows == weekdays.build_dataset(500, seed=0)
assert rows != weekdays.build_dataset(500, seed=0, split="test")
assert all(r["answer"] in weekdays.DAYS for r in rows)
replies = ["<think>3 days after Tuesday</think><answer>Friday</answer>",
           "<think>x</think><answer>friday.</answer>",
           "<think>x</think><answer>Fri</answer>",
           "<think>x</think><answer>Friday or Saturday</answer>",
           "Friday"]
print(weekdays.correctness_reward(replies, ["Friday"] * 5))
print(rows[0]["prompt"][-1]["content"], "->", rows[0]["answer"])
print("weekdays task ok")
```

Running `python test_weekdays.py` prints:

```text
[1.0, 1.0, 0.0, 0.0, 0.0]
Today is Sunday. What day of the week will it be in 50 days? Answer with the day's name. -> Monday
weekdays task ok
```

(Check: 50 days is 7 weeks and 1 day, and one day after Sunday is Monday.)

**Why each reply scores what it does.** The clean answer and "friday." both match once case and the full stop are ignored. "Friday or Saturday" is a hedge, and exact matching rejects it, which is what we want: otherwise the model could learn to list several days. The bare "Friday" has no `<answer>` tags, so there's nothing to grade.

**Is rejecting "Fri" right?** Yes, for training: the prompt asks for the day's name, and a strict, predictable rule is easier for the model to learn and much harder to game than a fuzzy one. If you wanted to accept abbreviations, you'd map each one explicitly ("fri" to "friday") rather than accepting any prefix, because a prefix rule would also accept "F" or "S", which match more than one day.

**Before you train:** run the base model on 50 of these puzzles with `evaluate.py --task weekdays --n 50 --runs base=Qwen/Qwen2.5-0.5B-Instruct`. If it scores 0%, shrink the range of days (say 1 to 14) until it gets a few right.
