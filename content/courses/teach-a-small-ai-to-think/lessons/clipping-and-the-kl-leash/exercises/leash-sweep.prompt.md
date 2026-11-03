# Sweep beta on Tiny Adder

Using `grpo_tiny_adder.py` from the lab (download it from the lab lesson, or copy it from the walkthrough), write a short script that trains Tiny Adder with each of these KL strengths and otherwise default settings:

`beta = 0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5`

For each run, print the final reward, accuracy and entropy (the last entry of the history list).

Then answer:

1. Roughly where does the leash start to hurt learning noticeably?
2. What happens to the entropy (the spread of answers) as beta grows? Why?
3. In one sentence, why might a small beta still be worth it in a real language-model run even though it slows the toy down?

**Done looks like:** a seven-row table of numbers from your own run and three short answers.
