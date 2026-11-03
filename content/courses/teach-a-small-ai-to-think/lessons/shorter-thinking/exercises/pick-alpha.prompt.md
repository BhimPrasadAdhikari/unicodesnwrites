# How strong should the penalty be?

`length_penalty_reward` gives a correct answer `1 - alpha * min(length / max_len, 1)` and a wrong answer 0.

**Your task:** using `max_len=200`, fill in this table for a correct answer that is 200 tokens or longer, and for a wrong answer of 10 tokens:

| alpha | Long correct answer | Short wrong answer | Which does GRPO prefer? |
|---|---|---|---|
| 0.2 | | | |
| 0.5 | | | |
| 1.0 | | | |
| 1.5 | | | |

Then answer:

1. Above which value of `alpha` does the length penalty break the golden rule ("never reward short and wrong over long and right")?
2. Why is `alpha = 1.0` already a bad idea, even though it doesn't *quite* break the rule?
3. Rerun the demo group from `length_rewards.py` with `alpha=1.0` and look at the advantages. What happens to the very long correct answer?

**Done looks like:** a filled-in table, three short answers, and the advantage you observed.
