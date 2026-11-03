"""Quick CPU self-test for the dataset builders, rewards and scoring.

Run it before you spend GPU time:  python selftest.py
"""
import json
import os
import tempfile

from evaluate import score
from tasks import countdown, logic, units
from tasks.common import format_reward


def wrap(answer, thinking="some steps"):
    return f"<think>{thinking}</think>\n<answer>{answer}</answer>"


def test_format_reward():
    good = wrap("7")
    assert format_reward([good, "7", "<answer>7</answer>", good + " extra"]) == [1.0, 0.0, 0.0, 0.0]
    chat = [[{"role": "assistant", "content": good}]]
    assert format_reward(chat) == [1.0]


def test_countdown():
    rows = countdown.build_dataset(300, seed=0)
    assert rows == countdown.build_dataset(300, seed=0), "builder must be deterministic"
    assert rows != countdown.build_dataset(300, seed=0, split="test")
    for r in rows:  # the stored solution must pass our own checker
        assert countdown.check_equation(r["solution"], r["numbers"], r["target"]), r
        assert 1 <= r["target"] <= 100
    r = {"numbers": [3, 5, 7, 2], "target": 25}
    cases = {
        "(7 - 2) * 5 + 3 - 3": False,      # uses 3 twice, skips nothing else
        "(7 - 2) * 5": False,              # forgets the 3
        "(7 - 2) * (3 + 2)": False,        # uses 2 twice
        "(7 + 3 - 5) * 5": False,          # 5 twice
        "5 * (7 - 2) + 3 * 0": False,      # 0 is not allowed
        "(3 + 7) * 2 + 5": True,
        "(3 + 7) * 2 + 5 = 25": True,      # trailing "= target" is fine
        "(3 + 7) × 2 + 5": True,           # unicode times sign
        "__import__('os')": False,         # never evaluated
        "7 / (5 - 5) + 3": False,          # division by zero
    }
    for expr, expected in cases.items():
        got = countdown.correctness_reward([wrap(expr)], [r["numbers"]], [r["target"]])
        assert got == [1.0 if expected else 0.0], (expr, got)


def test_units():
    rows = units.build_dataset(200, seed=0)
    assert all(r["answer"] > 0 for r in rows)
    got = units.correctness_reward(
        [wrap("3500"), wrap("3,500 meters"), wrap("3510"), wrap("3600"), "3500"],
        [3500.0] * 5,
    )
    assert got == [1.0, 1.0, 1.0, 0.0, 0.0], got


def test_logic():
    rows = logic.build_dataset(200, seed=0)
    names = set(logic.NAMES)
    assert all(r["answer"] in names for r in rows)
    assert all(r["answer"] in r["prompt"][-1]["content"] for r in rows)
    got = logic.correctness_reward([wrap("asha."), wrap("Ben"), wrap("")], ["Asha"] * 3)
    assert got == [1.0, 0.0, 0.0], got


def test_score_and_file_mode():
    rows = countdown.build_dataset(4, seed=0, split="test")
    completions = [wrap(rows[0]["solution"]), wrap(rows[1]["solution"]), wrap("1 + 1"), "no tags"]
    result = score(countdown, rows, completions)
    assert result["accuracy"] == 0.5 and result["format_rate"] == 0.75, result
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "answers.jsonl")
        with open(path, "w", encoding="utf-8") as f:
            for c in completions:
                f.write(json.dumps({"completion": c}) + "\n")
        assert os.path.getsize(path) > 0


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"ok  {name}")
    rows = countdown.build_dataset(3, seed=0)
    for r in rows:
        print(r["numbers"], "->", r["target"], "  e.g.", r["solution"])
    print("All self-tests passed.")
