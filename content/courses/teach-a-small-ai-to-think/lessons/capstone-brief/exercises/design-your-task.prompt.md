# Add a new task to the starter repo

Practise milestone M1 on a small task before you tackle your own.

**The task:** "Today is Tuesday. What day of the week will it be in 38 days? Answer with the day's name." The answer can be computed with counting modulo 7.

**Your task:** create `tasks/weekdays.py` in the starter repo with:

1. `build_dataset(n, seed=0, split="train")` that returns `n` rows, each a dict with a `prompt` (use `make_prompt` from `tasks/common.py`) and an `answer` (the day's name). Use `random.Random(seed)` for the train split and `random.Random(seed + 10_000)` for the test split, like the other tasks. Pick the start day at random and a number of days from 1 to 100.
2. `correctness_reward(completions, answer, **kwargs)` that gives 1.0 when the text inside `<answer>` is exactly the right day (ignore case and a trailing full stop), else 0.0.
3. `REWARD_FUNCS = [format_reward, correctness_reward]` and `REWARD_WEIGHTS = [0.5, 1.0]`.

Then register it in `tasks/__init__.py` and write a short test.

**Done looks like:** your test checks that the builder is deterministic, that train and test differ, that every answer is a real day name, and that your reward gives `[1.0, 1.0, 0.0, 0.0, 0.0]` for these replies when the answer is Friday:

```python
replies = ["<think>3 days after Tuesday</think><answer>Friday</answer>",
           "<think>x</think><answer>friday.</answer>",
           "<think>x</think><answer>Fri</answer>",
           "<think>x</think><answer>Friday or Saturday</answer>",
           "Friday"]
```

Finally, say in one sentence whether rejecting "Fri" is the right call.
