# Solution: checking both sides of the equation

Save this next to `countdown.py` and `common.py` (for example in the lesson's `code/` folder) and run it.

```python
from collections import Counter

from countdown import evaluate_expression, check_equation


def check_equation_both_sides(answer, numbers, target):
    """Accept the equation if any side of an "=" is a valid solution."""
    if not answer:
        return False
    text = answer.replace("×", "*").replace("÷", "/")
    for side in text.split("="):
        try:
            value, used = evaluate_expression(side.strip())
        except (SyntaxError, ValueError, ZeroDivisionError):
            continue
        if Counter(used) == Counter(numbers) and value == target:
            return True
    return False


numbers, target = [20, 21, 7, 18], 66
answers = ["20 + 7 + 21 + 18", "20 + 7 + 21 + 18 = 66", "66 = 20 + 7 + 21 + 18",
           "66", "66 = 66", "20 + 21 + 18 + 7 + 7 = 66"]
for a in answers:
    print(f"{a:<28} old={check_equation(a, numbers, target)!s:<6} "
          f"new={check_equation_both_sides(a, numbers, target)}")
```

Output:

```text
20 + 7 + 21 + 18             old=True   new=True
20 + 7 + 21 + 18 = 66        old=True   new=True
66 = 20 + 7 + 21 + 18        old=False  new=True
66                           old=False  new=False
66 = 66                      old=False  new=False
20 + 21 + 18 + 7 + 7 = 66    old=False  new=False
```

**How it works.** We split on every `=` and try each side on its own. A side that doesn't parse, uses forbidden operations or divides by zero is skipped (`continue`) instead of failing the whole answer. As soon as one side passes both checks, the answer is accepted.

**The `.strip()` matters.** Without it, `" 20 + 7 + 21 + 18"` raises an `IndentationError` (a kind of `SyntaxError`) because of the leading space, the side is skipped, and the false negative quietly stays. That's exactly the kind of bug that only a test with a real example catches.

**Why "any side" can't be gamed.** A side only counts if it uses *every* given number exactly once and equals the target. `66 = 66` has no side that uses 20, 21, 7 and 18, so it fails. Adding more sides never helps a wrong answer, because each side is judged on its own against the same strict rules.

To adopt the fix, replace the body of `check_equation` in `tasks/countdown.py` with this logic, add the six cases to `selftest.py`, and run it.
