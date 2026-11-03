"""Countdown: reach a target number using each given number exactly once."""
import ast
import random
from collections import Counter
from fractions import Fraction

try:
    from .common import completion_text, extract_answer, format_reward, make_prompt
except ImportError:  # run directly as a script
    from common import completion_text, extract_answer, format_reward, make_prompt

OPS = ["+", "-", "*", "/"]


def make_puzzle(rng, n_numbers=4, max_number=25, max_target=100):
    """Build a puzzle that is solvable by construction.

    Pick random numbers, chain them with random operations, and keep the
    result as the target only if it is a whole number between 1 and
    max_target. The chain we built is one valid solution.
    """
    while True:
        numbers = [rng.randint(1, max_number) for _ in range(n_numbers)]
        order = numbers[:]
        rng.shuffle(order)
        expr, value = str(order[0]), Fraction(order[0])
        for n in order[1:]:
            op = rng.choice(OPS)
            value = {"+": value + n, "-": value - n, "*": value * n, "/": value / n}[op]
            expr = f"({expr} {op} {n})"
        if value.denominator == 1 and 1 <= value <= max_target:
            return {"numbers": numbers, "target": int(value), "solution": expr}


def build_dataset(n, seed=0, split="train"):
    """n puzzles as plain dicts. The test split uses a different seed."""
    rng = random.Random(seed if split == "train" else seed + 10_000)
    rows = []
    for _ in range(n):
        puzzle = make_puzzle(rng)
        question = (
            f"Using the numbers {puzzle['numbers']}, write an equation that equals "
            f"{puzzle['target']}. Use each number exactly once. You may use + - * / "
            f"and brackets. Example answer: <answer>(1 + 2) * 3</answer>"
        )
        rows.append({"prompt": make_prompt(question), **puzzle})
    return rows


def evaluate_expression(expr):
    """Safely evaluate + - * / arithmetic. Returns (value, numbers used)."""
    tree = ast.parse(expr, mode="eval")
    used = []

    def walk(node):
        if isinstance(node, ast.Expression):
            return walk(node.body)
        if isinstance(node, ast.Constant) and type(node.value) is int:
            used.append(node.value)
            return Fraction(node.value)
        if isinstance(node, ast.BinOp):
            left, right = walk(node.left), walk(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right  # ZeroDivisionError is caught by the caller
        raise ValueError("only whole numbers, + - * / and brackets are allowed")

    return walk(tree), used


def check_equation(answer, numbers, target):
    """True if the answer uses each number exactly once and hits the target."""
    if not answer:
        return False
    expr = answer.replace("×", "*").replace("÷", "/").split("=")[0].strip()
    try:
        value, used = evaluate_expression(expr)
    except (SyntaxError, ValueError, ZeroDivisionError):
        return False
    return Counter(used) == Counter(numbers) and value == target


def correctness_reward(completions, numbers, target, **kwargs):
    """1.0 for a valid equation that reaches the target, else 0.0."""
    rewards = []
    for c, nums, tgt in zip(completions, numbers, target):
        answer = extract_answer(completion_text(c))
        rewards.append(1.0 if check_equation(answer, nums, tgt) else 0.0)
    return rewards


REWARD_FUNCS = [format_reward, correctness_reward]
REWARD_WEIGHTS = [0.5, 1.0]  # being right counts twice as much as neat tags


if __name__ == "__main__":
    # A quick look: three puzzles, then four answers to the first one, graded.
    rows = build_dataset(3, seed=0)
    for r in rows:
        print(f"numbers {r['numbers']}  target {r['target']}  (one solution: {r['solution']})")
    first = rows[0]
    replies = [
        f"<think>try adding</think><answer>{first['solution']}</answer>",
        "<think>close enough</think><answer>20 + 21 + 18</answer>",
        "<think>use 7 twice</think><answer>20 + 21 + 18 + 7 + 7</answer>",
        "The answer is 20 + 7 + 21 + 18",
    ]
    fmt = format_reward(replies)
    ok = correctness_reward(replies, [first["numbers"]] * 4, [first["target"]] * 4)
    for reply, f, c in zip(replies, fmt, ok):
        print(f"format {f:.0f}  correct {c:.0f}  total {0.5 * f + c:.1f}  <- {reply}")
