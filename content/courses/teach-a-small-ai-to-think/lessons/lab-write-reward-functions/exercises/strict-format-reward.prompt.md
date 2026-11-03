# Close the duplicate-tag loophole

The demo showed that `format_reward` gives full marks to an answer with two answer blocks. Fix it.

**What to do**

Write a new function `strict_format_reward(completions, **kwargs)` in `rewards.py` (or in the notebook) that returns 1.0 only when **all** of these are true, and 0.0 otherwise:

1. The whole text matches `FORMAT_PATTERN`.
2. Each of the four tags (`<think>`, `</think>`, `<answer>`, `</answer>`) appears **exactly once**.
3. The thinking is not empty or whitespace only.

Test it on these inputs:

| Input | Expected |
|---|---|
| `<think>9 * 2</think><answer>18</answer>` | 1.0 |
| `<think>hmm</think><answer>18</answer><answer>18</answer>` | 0.0 |
| `<think>   </think><answer>18</answer>` | 0.0 |
| `<answer>18</answer><think>done</think>` | 0.0 |
| `[{"role": "assistant", "content": "<think>9 * 2</think><answer>18</answer>"}]` | 1.0 |

**What "done" looks like**

Your function returns the expected score for all five inputs, it never crashes on text without tags, and you can explain in one sentence why the original pattern let the duplicate through.
