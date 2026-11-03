"""Length-aware reward functions for reasoning models (plain Python, CPU).

Three ways to tell a model "be right, but don't ramble":
  1. length_penalty_reward: correct answers lose a little reward per token.
  2. budget_reward: correct answers inside a token budget get full marks.
  3. overlong_shaping: DAPO-style soft punishment near a hard length cap.

Every function has the same shape as a Hugging Face TRL reward function:
it takes a list of completions (plus dataset columns as keyword arguments)
and returns one float per completion. Run this file to see a demo.
"""
import re
import statistics

ANSWER_RE = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)


def count_tokens(text):
    """Rough token count: one word = one token (good enough for a demo)."""
    return len(text.split())


def is_correct(text, answer):
    """True if the text inside <answer>...</answer> equals the right answer."""
    match = ANSWER_RE.search(text)
    return match is not None and match.group(1).strip() == str(answer)


def correctness_reward(completions, answer, **kwargs):
    """The baseline: 1.0 if correct, 0.0 if not. Length does not matter."""
    return [1.0 if is_correct(c, a) else 0.0 for c, a in zip(completions, answer)]


def length_penalty_reward(completions, answer, max_len=200, alpha=0.5, **kwargs):
    """Correct answers score 1 minus a penalty that grows with length.

    A correct answer of length 0 would score 1.0; one of max_len tokens or
    more scores 1 - alpha. Wrong answers score 0 no matter how short, so the
    model can never win by being short and wrong.
    """
    rewards = []
    for c, a in zip(completions, answer):
        if not is_correct(c, a):
            rewards.append(0.0)
            continue
        used = min(count_tokens(c) / max_len, 1.0)
        rewards.append(1.0 - alpha * used)
    return rewards


def budget_reward(completions, answer, budget=100, **kwargs):
    """Full marks for a correct answer inside the budget.

    Past the budget the reward slides down in a straight line and reaches
    0 at twice the budget. Wrong answers always score 0.
    """
    rewards = []
    for c, a in zip(completions, answer):
        if not is_correct(c, a):
            rewards.append(0.0)
            continue
        over = max(count_tokens(c) - budget, 0)
        rewards.append(max(1.0 - over / budget, 0.0))
    return rewards


def overlong_shaping(completions, max_len=200, cache=50, **kwargs):
    """DAPO's "soft overlong punishment" (ByteDance Seed, 2025).

    No penalty up to max_len - cache tokens, then a straight-line penalty
    down to -1.0 at max_len, and -1.0 beyond. Add it to a correctness
    reward; on its own it says nothing about being right.
    """
    rewards = []
    for c in completions:
        n = count_tokens(c)
        if n <= max_len - cache:
            rewards.append(0.0)
        elif n <= max_len:
            rewards.append((max_len - cache - n) / cache)
        else:
            rewards.append(-1.0)
    return rewards


def group_advantages(rewards):
    """GRPO advantage: (reward - group mean) / (group std + 1e-4)."""
    mean = statistics.fmean(rewards)
    std = statistics.pstdev(rewards)
    return [(r - mean) / (std + 1e-4) for r in rewards]


def make_completion(n_words, final):
    """Build a fake completion of about n_words words ending in an answer."""
    filler = "let me check 17 plus 25 once more to be sure".split()
    words = [filler[i % len(filler)] for i in range(max(n_words - 4, 0))]
    return "<think> " + " ".join(words) + f" </think> <answer>{final}</answer>"


def main():
    # One prompt ("What is 17 + 25?"), a group of five sampled answers.
    group = [
        ("short, correct", make_completion(12, 42)),
        ("medium, correct", make_completion(80, 42)),
        ("long, correct", make_completion(170, 42)),
        ("very long, correct", make_completion(260, 42)),
        ("short, wrong", make_completion(12, 41)),
    ]
    names = [name for name, _ in group]
    completions = [text for _, text in group]
    answer = [42] * len(completions)

    columns = {
        "correct": correctness_reward(completions, answer),
        "penalty": length_penalty_reward(completions, answer),
        "budget": budget_reward(completions, answer),
        "overlong": overlong_shaping(completions),
    }
    print(f"{'completion':<20}{'tokens':>7}" + "".join(f"{k:>10}" for k in columns))
    for i, name in enumerate(names):
        row = f"{name:<20}{count_tokens(completions[i]):>7}"
        row += "".join(f"{columns[k][i]:>10.2f}" for k in columns)
        print(row)

    print("\nGRPO advantages for the same group:")
    for key in ("correct", "penalty"):
        adv = group_advantages(columns[key])
        print(f"  {key:<8}" + "".join(f"{a:>7.2f}" for a in adv))


if __name__ == "__main__":
    main()
