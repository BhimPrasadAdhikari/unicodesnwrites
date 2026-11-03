# See what temperature does to soft labels

A teacher model gives these raw scores (logits) for four possible answers to "17 + 25?":

| Answer | Teacher logit |
|---|---|
| 42 | 4.0 |
| 41 | 2.0 |
| 43 | 1.5 |
| 24 | −1.0 |

**Your task:**

1. Write a function `softmax(logits, temperature=1.0)` in plain Python (no numpy needed) that divides every logit by the temperature, then turns them into probabilities that add up to 1. Subtract the largest value before calling `math.exp`, so big numbers don't overflow.
2. Print the probabilities at temperatures 0.5, 1.0, 2.0 and 5.0, plus the hard label (1 for "42", 0 for the rest).
3. In two or three sentences: what happens to the "near-miss" answers 41 and 43 as the temperature rises, and why might a student learn more from the temperature-2 version than from the hard label?

**Done looks like:** a short script that prints five lines (four temperatures plus the hard label), and your explanation.
