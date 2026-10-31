# Close three reward-hacking loopholes

The fixed reward from the previous exercise is fair, but a model under pressure can exploit it. Here are five completions for a question whose answer is 72:

```python
tests = [
    "<think>48 / 2 = 24 in May, so 48 + 24 = 72 total</think><answer>72</answer>",
    "<think>.</think><answer>72</answer>",
    "<think>48 / 2 = 24 in May, so 48 + 24 = 72 total</think><answer>24</answer><answer>72</answer>",
    "<think>48 / 2 = 24 in May, so 48 + 24 = 72 total</think><answer>It is 48, 24 or 72</answer>",
    "<think>half of 48 is 24 and then add them up</think><answer>$72.</answer>",
]
golds = ["#### 72"] * 5
```

Write `hardened_reward` so that:

1. completions with more than one `<answer>` tag score 0,
2. the content of `<answer>` must be a single number (a `$` sign, commas and a trailing full stop are fine; a sentence listing several numbers is not),
3. the `<think>` block must contain at least 5 words.

Show that it scores the five tests as `[1.0, 0.0, 0.0, 0.0, 1.0]`, and explain in two sentences what risk comes with making a grader stricter.

**Done looks like:** working code, the expected output, and two sentences.
