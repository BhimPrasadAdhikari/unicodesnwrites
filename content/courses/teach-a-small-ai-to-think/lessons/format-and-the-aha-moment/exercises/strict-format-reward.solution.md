# Solution: a stricter format reward

The trick is to say "any character, as long as it isn't the start of a tag" inside each block. In a regular expression that is `(?:(?!</?think>|</?answer>).)*`: at each position, first check that no `<think>`, `</think>`, `<answer>` or `</answer>` starts here, then take one character. That makes a second answer block impossible to sneak in, because the `<answer>` tag of the second block can't be swallowed by the first.

Named groups (`?P<think>`, `?P<answer>`) let us pull out the contents and check them separately.

```python
import re

STRICT_RE = re.compile(
    r"^\s*<think>(?P<think>(?:(?!</?think>|</?answer>).)*)</think>"
    r"\s*<answer>(?P<answer>(?:(?!</?think>|</?answer>).)*)</answer>\s*$",
    re.DOTALL,
)

def strict_format_reward(completions, min_think_words=3, **kwargs):
    rewards = []
    for c in completions:
        m = STRICT_RE.match(c)
        ok = (
            m is not None
            and len(m.group("think").split()) >= min_think_words
            and m.group("answer").strip() != ""
        )
        rewards.append(1.0 if ok else 0.0)
    return rewards

tests = [
    ("<think>17 + 20 is 37, plus 5 is 42</think>\n<answer>42</answer>", 1.0),
    ("<think>a b c</think><answer>1</answer><answer>2</answer>", 0.0),
    ("<think></think><answer>3</answer>", 0.0),
    ("<think>ok</think><answer>3</answer>", 0.0),
    ("<think>one two three</think><answer>  </answer>", 0.0),
    ("<think>one <think> two three</think><answer>3</answer>", 0.0),
    ("The answer is 42.", 0.0),
]
got = strict_format_reward([t for t, _ in tests])
for (text, want), g in zip(tests, got):
    assert g == want, (text, g)
print(got)
```

Running it prints:

```text
[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
```

**Why each check matters**

| Reply | Old reward | New reward | Why |
|---|---|---|---|
| Two answer blocks | 1.0 | 0.0 | A model could learn to hedge with several answers |
| Empty `<think>` | 1.0 | 0.0 | The template asks for thinking first |
| One-word thinking | 1.0 | 0.0 | Below `min_think_words` |
| Blank answer | 1.0 | 0.0 | Nothing to grade |
| Nested `<think>` | 1.0 | 0.0 | Confusing structure, hard to parse reliably |

**Why a minimum length is only a mild rule:** it stops the model skipping the working box entirely, but it must stay small, because a large minimum would *reward length itself*, and that is exactly the kind of padding this lesson warns about. Three words says "write something"; it doesn't say "write a lot".
