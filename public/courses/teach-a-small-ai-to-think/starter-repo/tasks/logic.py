"""A tiny logic puzzle: three people, two clues, one question."""
import random

try:
    from .common import completion_text, extract_answer, format_reward, make_prompt
except ImportError:  # run directly as a script
    from common import completion_text, extract_answer, format_reward, make_prompt

NAMES = ["Asha", "Ben", "Chen", "Dev", "Ema", "Farah", "Gita", "Hugo", "Ines", "Jai"]
# (comparison, opposite, word for the top, word for the bottom)
TRAITS = [
    ("taller", "shorter", "tallest", "shortest"),
    ("older", "younger", "oldest", "youngest"),
    ("faster", "slower", "fastest", "slowest"),
]


def build_dataset(n, seed=0, split="train"):
    """n puzzles. The hidden order is random; two clues pin it down exactly."""
    rng = random.Random(seed if split == "train" else seed + 10_000)
    rows = []
    for _ in range(n):
        top, mid, bottom = rng.sample(NAMES, 3)  # hidden order, top first
        more, less, most, least = rng.choice(TRAITS)
        clues = []
        for a, b in ((top, mid), (mid, bottom)):
            if rng.random() < 0.5:
                clues.append(f"{a} is {more} than {b}.")
            else:
                clues.append(f"{b} is {less} than {a}.")
        rng.shuffle(clues)
        ask, answer = rng.choice(
            [(f"Who is the {most}?", top), (f"Who is the {least}?", bottom),
             ("Who is in the middle?", mid)]
        )
        question = " ".join(clues) + f" {ask} Answer with one name."
        rows.append({"prompt": make_prompt(question), "answer": answer})
    return rows


def correctness_reward(completions, answer, **kwargs):
    """1.0 if the answer is exactly the right name (case and full stop ignored)."""
    rewards = []
    for c, true in zip(completions, answer):
        got = extract_answer(completion_text(c)) or ""
        rewards.append(1.0 if got.strip(" .").lower() == true.lower() else 0.0)
    return rewards


REWARD_FUNCS = [format_reward, correctness_reward]
REWARD_WEIGHTS = [0.5, 1.0]
