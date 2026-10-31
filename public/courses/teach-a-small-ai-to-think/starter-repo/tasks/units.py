"""Unit conversions: turn a quantity in one unit into another unit."""
import random
import re

try:
    from .common import completion_text, extract_answer, format_reward, make_prompt
except ImportError:  # run directly as a script
    from common import completion_text, extract_answer, format_reward, make_prompt

# (from unit, to unit, multiply by)
CONVERSIONS = [
    ("kilometers", "meters", 1000),
    ("meters", "centimeters", 100),
    ("kilograms", "grams", 1000),
    ("liters", "milliliters", 1000),
    ("hours", "minutes", 60),
    ("minutes", "seconds", 60),
    ("feet", "inches", 12),
    ("inches", "centimeters", 2.54),
    ("days", "hours", 24),
]

NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def build_dataset(n, seed=0, split="train"):
    """n conversion questions. Half go forward (km to m), half backward."""
    rng = random.Random(seed if split == "train" else seed + 10_000)
    rows = []
    for _ in range(n):
        src, dst, factor = rng.choice(CONVERSIONS)
        value = round(rng.uniform(0.5, 50), 1)
        if rng.random() < 0.5:
            question = f"How many {dst} are in {value} {src}?"
            answer = value * factor
        else:
            amount = round(value * factor, 2)
            question = f"How many {src} are in {amount} {dst}?"
            answer = amount / factor
        question += " Give just the number, rounded to 2 decimal places if needed."
        rows.append({"prompt": make_prompt(question), "answer": round(answer, 4)})
    return rows


def parse_number(text):
    """The first number in the text, ignoring commas and units."""
    if not text:
        return None
    match = NUMBER_RE.search(text.replace(",", ""))
    return float(match.group()) if match else None


def correctness_reward(completions, answer, **kwargs):
    """1.0 if the number is within 1% of the true answer (or 0.01 absolute).

    Heads-up: this only reads the first number, so hedges like "3500 or 3600"
    pass. Fixing that is the capstone exercise "Attack the unit-conversion reward".
    """
    rewards = []
    for c, true in zip(completions, answer):
        got = parse_number(extract_answer(completion_text(c)))
        ok = got is not None and abs(got - true) <= max(0.01 * abs(true), 0.01)
        rewards.append(1.0 if ok else 0.0)
    return rewards


REWARD_FUNCS = [format_reward, correctness_reward]
REWARD_WEIGHTS = [0.5, 1.0]
