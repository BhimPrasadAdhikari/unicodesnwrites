# Solution: an easy-to-hard curriculum

Save as `curriculum.py` in the starter repo folder:

```python
import random

from tasks.countdown import check_equation, make_puzzle, make_prompt


def build_curriculum(n, seed=0, easy_fraction=0.5):
    """First the easy 3-number puzzles, then the 4-number ones, in that order."""
    rng = random.Random(seed)
    n_easy = int(n * easy_fraction)
    rows = []
    for i in range(n):
        puzzle = make_puzzle(rng, n_numbers=3 if i < n_easy else 4)
        question = (
            f"Using the numbers {puzzle['numbers']}, write an equation that equals "
            f"{puzzle['target']}. Use each number exactly once. You may use + - * / "
            f"and brackets. Example answer: <answer>(1 + 2) * 3</answer>"
        )
        rows.append({"prompt": make_prompt(question), **puzzle})
    return rows


rows = build_curriculum(2000)
sizes = [len(r["numbers"]) for r in rows]
assert sizes[:1000] == [3] * 1000 and sizes[1000:] == [4] * 1000
assert all(check_equation(r["solution"], r["numbers"], r["target"]) for r in rows)
print(rows[0]["numbers"], rows[0]["target"], "|", rows[-1]["numbers"], rows[-1]["target"])
print("curriculum ok")
```

Output:

```text
[10, 16, 12] 72 | [22, 5, 1, 17] 33
curriculum ok
```

(`make_prompt` is importable from `tasks.countdown` because that module imports it from `tasks.common`.)

**The shuffling option.** `GRPOConfig(shuffle_dataset=False)`. It defaults to `True`, which mixes the easy and hard puzzles together, so the model would see four-number puzzles from step one and the curriculum would disappear. With shuffling off, the trainer goes through the rows in order: easy first, hard later.

**Using it in `train.py`:** replace the line that builds `train_rows` with `train_rows = build_curriculum(args.train_size, seed=args.seed)`, and add `shuffle_dataset=False` to the `GRPOConfig`. Keep evaluating on the normal four-number test split, so your before/after numbers measure the task you actually care about.

**One caution.** With 300 steps and 2 puzzles per step, the trainer only uses 600 puzzles. With `train_size=2000` and `easy_fraction=0.5`, it would never reach the hard half! Either lower `train_size` to about 600, or set `easy_fraction` so the switch to hard puzzles happens within the steps you'll actually run.
