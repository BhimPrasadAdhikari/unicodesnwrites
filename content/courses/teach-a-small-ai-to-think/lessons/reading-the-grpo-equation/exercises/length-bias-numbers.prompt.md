# Put numbers on the length bias

A group contains four answers to the same question:

| Answer | Correct? | Advantage | Length (tokens) |
|---|---|---|---|
| A | yes | +1.0 | 60 |
| B | yes | +1.0 | 240 |
| C | no | −1.0 | 60 |
| D | no | −1.0 | 240 |

1. Under the original GRPO loss (divide each answer by its own length), compute the push per token for each answer.
2. Under a Dr. GRPO-style loss that divides by a constant of 256 (say, the maximum completion length) for every answer, compute the push per token again.
3. Compute the *total* push on each answer (per-token push × length) under both schemes.
4. In two sentences: under the original loss, if the model is going to be wrong, is it "cheaper" to be wrong briefly or at length? What does that suggest might happen to response length during training?

**Done looks like:** two small tables of numbers and a two-sentence answer.
