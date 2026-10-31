# Close the loopholes in the format reward

The format reward in this lesson uses this pattern:

```python
FORMAT_RE = re.compile(r"^\s*<think>.*?</think>\s*<answer>.*?</answer>\s*$", re.DOTALL)
```

It looks strict, but try it on these replies and you'll find it gives full marks to two of them that it shouldn't:

```text
<think>a</think><answer>1</answer><answer>2</answer>
<think></think><answer>3</answer>
```

The first hides two different answers (a model could learn to hedge). The second has an empty thinking box, so the "think first" part of the template means nothing.

**Your task:** write `strict_format_reward(completions, min_think_words=3, **kwargs)` that returns `1.0` only when:

1. the reply is exactly one `<think>…</think>` block followed by exactly one `<answer>…</answer>` block (whitespace around them is fine),
2. no `<think>` or `<answer>` tag appears inside either block,
3. the thinking has at least `min_think_words` words, and
4. the answer is not blank.

**Done looks like:** your function returns `[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]` for these seven replies, in this order:

```python
tests = [
    "<think>17 + 20 is 37, plus 5 is 42</think>\n<answer>42</answer>",
    "<think>a b c</think><answer>1</answer><answer>2</answer>",
    "<think></think><answer>3</answer>",
    "<think>ok</think><answer>3</answer>",
    "<think>one two three</think><answer>  </answer>",
    "<think>one <think> two three</think><answer>3</answer>",
    "The answer is 42.",
]
```

Then answer in one sentence: why is a *minimum* thinking length a mild rule rather than a strong one?
