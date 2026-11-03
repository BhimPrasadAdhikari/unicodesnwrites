# Fix the false negative in the Countdown checker

`check_equation` only looks at the left side of an `=`. So the valid answer `66 = 20 + 7 + 21 + 18` (target first) scores 0 for the puzzle `[20, 21, 7, 18] → 66`. That's a **false negative**: a correct answer marked wrong, which during GRPO pushes the model away from a correct way of writing.

**Your task:** write `check_equation_both_sides(answer, numbers, target)` that accepts the answer if **any** side of the `=` is a valid solution (uses every number exactly once and equals the target). Reuse `evaluate_expression` from `countdown.py`.

Watch out for one trap: splitting `"66 = 20 + 7"` on `=` gives `" 20 + 7"` with a leading space, and Python's parser treats leading spaces as indentation.

**Done looks like:** for the puzzle `[20, 21, 7, 18] → 66`, your function gives:

| Answer | Expected |
|---|---|
| `20 + 7 + 21 + 18` | True |
| `20 + 7 + 21 + 18 = 66` | True |
| `66 = 20 + 7 + 21 + 18` | True |
| `66` | False |
| `66 = 66` | False |
| `20 + 21 + 18 + 7 + 7 = 66` | False |

Then explain in one or two sentences why accepting "any side" can't be gamed by an answer like `66 = 66`.
