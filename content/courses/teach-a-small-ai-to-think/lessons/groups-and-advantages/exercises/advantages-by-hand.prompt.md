# Compute a group's advantages by hand

The Tiny Adder was asked "What is 7 + 5?" eight times. Here are its answers:

| # | Answer | Reward |
|---|---|---|
| 1 | 12 | 1 |
| 2 | 12 | 1 |
| 3 | 13 | 0 |
| 4 | 2 | 0 |
| 5 | 11 | 0 |
| 6 | 12 | 1 |
| 7 | 75 | 0 |
| 8 | 14 | 0 |

1. Compute the group's mean reward.
2. Compute the group's standard deviation (population std: average the squared differences from the mean, then take the square root).
3. Compute the advantage of every answer with `A = (r - mean) / (std + 1e-4)`.
4. Which answers will become more likely after the update, and which less likely?

**Done looks like:** a mean, a std, eight advantages rounded to two decimals that add up to zero, and one sentence answering question 4. Check your numbers with three lines of Python if you like.
