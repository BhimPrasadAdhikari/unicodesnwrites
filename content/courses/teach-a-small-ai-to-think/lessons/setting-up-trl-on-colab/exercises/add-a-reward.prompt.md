# Add a gentle length reward

Small models sometimes skip the thinking and write `<think>ok</think><answer>12</answer>`. Write a third reward function, `thinking_reward`, that gives a small bonus for actually thinking:

- 0.0 if there is no `<think>…</think>` block,
- otherwise `0.1 × min(words_inside_think, 50) / 50`, so the bonus grows with the number of words up to 50 and then stops at 0.1.

It must follow TRL's reward signature: take `completions` and `**kwargs`, return one float per completion, and work for both plain strings and chat-format completions.

Test it on these three completions (no GPU or TRL needed):

```python
tests = [
    "<think>ok</think><answer>12</answer>",
    "<think>" + "step " * 30 + "</think><answer>12</answer>",
    [{"role": "assistant", "content": "The answer is 12."}],
]
```

Then explain in two sentences why the bonus is capped and kept much smaller than the correctness reward.

**Done looks like:** a working function, its printed output for the three tests, and two sentences.
