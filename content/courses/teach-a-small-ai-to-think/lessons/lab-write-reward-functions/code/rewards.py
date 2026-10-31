"""Reward functions for teaching a small model to reason (standard library only).

Each reward takes a list of completions and returns one float per completion,
the same shape Hugging Face TRL's GRPOTrainer expects.
"""
import re

# The shape we want: thinking first, then a short final answer.
FORMAT_PATTERN = re.compile(r"^\s*<think>.+?</think>\s*<answer>.+?</answer>\s*$", re.DOTALL)
ANSWER_PATTERN = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)
NUMBER_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")


def completion_text(completion):
    """Return plain text whether the completion is a string or a chat message list."""
    if isinstance(completion, str):
        return completion
    return completion[0]["content"]  # conversational format: [{"role": ..., "content": ...}]


def gold_from_gsm8k(solution):
    """GSM8K solutions end with '#### 42'. Keep only the number after ####."""
    return solution.split("####")[-1].strip().replace(",", "")


def extract_answer(text):
    """Return what is inside <answer>...</answer>, or None if the tags are missing."""
    match = ANSWER_PATTERN.search(text)
    return match.group(1).strip() if match else None


def parse_number(text):
    """Pull the last number out of a string: '$1,200.' -> 1200.0. None if there is none."""
    if text is None:
        return None
    numbers = NUMBER_PATTERN.findall(text.replace(",", ""))
    return float(numbers[-1]) if numbers else None


def format_reward(completions, **kwargs):
    """1.0 if the completion is exactly <think>...</think><answer>...</answer>, else 0.0."""
    return [1.0 if FORMAT_PATTERN.match(completion_text(c)) else 0.0 for c in completions]


def soft_format_reward(completions, **kwargs):
    """Partial credit: 0.25 for each of the four tags that appears exactly once."""
    scores = []
    for c in completions:
        text = completion_text(c)
        tags = ["<think>", "</think>", "<answer>", "</answer>"]
        scores.append(sum(0.25 for tag in tags if text.count(tag) == 1))
    return scores


def correctness_reward(completions, answer, **kwargs):
    """1.0 if the number inside <answer> equals the gold number, else 0.0.

    `answer` is a dataset column, so TRL passes it in as a keyword argument.
    """
    scores = []
    for c, gold in zip(completions, answer):
        predicted = parse_number(extract_answer(completion_text(c)))
        target = parse_number(gold_from_gsm8k(gold))
        is_right = predicted is not None and target is not None and abs(predicted - target) < 1e-6
        scores.append(1.0 if is_right else 0.0)
    return scores


def total_reward(completions, answer, format_weight=0.5, **kwargs):
    """What the trainer adds up: correctness counts double the format bonus."""
    fmt = format_reward(completions)
    right = correctness_reward(completions, answer)
    return [r + format_weight * f for r, f in zip(right, fmt)]


if __name__ == "__main__":
    gold = "She sells 16 - 3 - 4 = 9 eggs, earning 9 * 2 = 18 dollars.\n#### 18"
    samples = {
        "tidy and right": "<think>16 - 3 - 4 = 9 eggs, 9 * 2 = 18</think><answer>18</answer>",
        "right, with $": "<think>9 eggs at $2 each</think>\n<answer>$18.</answer>",
        "tidy but wrong": "<think>16 - 3 = 13, 13 * 2 = 26</think><answer>26</answer>",
        "right, no tags": "The answer is 18.",
        "tags twice": "<think>hmm</think><answer>18</answer><answer>18</answer>",
        "chat message": [{"role": "assistant", "content": "<think>9 * 2</think><answer>18</answer>"}],
    }
    completions = list(samples.values())
    answers = [gold] * len(completions)
    fmt = format_reward(completions)
    soft = soft_format_reward(completions)
    right = correctness_reward(completions, answers)
    total = total_reward(completions, answers)
    print(f"{'sample':<16}{'format':>8}{'soft':>7}{'correct':>9}{'total':>7}")
    for name, f, s, r, t in zip(samples, fmt, soft, right, total):
        print(f"{name:<16}{f:>8.2f}{s:>7.2f}{r:>9.2f}{t:>7.2f}")
