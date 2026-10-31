# Solution: the length bias in numbers

**1 and 3. Original GRPO (divide by own length)**

| Answer | Advantage | Length | Per-token push | Total push |
|---|---|---|---|---|
| A (right) | +1 | 60 | +0.0167 | +1.0 |
| B (right) | +1 | 240 | +0.0042 | +1.0 |
| C (wrong) | −1 | 60 | −0.0167 | −1.0 |
| D (wrong) | −1 | 240 | −0.0042 | −1.0 |

**2 and 3. Constant normalizer of 256 (Dr. GRPO style)**

| Answer | Advantage | Length | Per-token push | Total push |
|---|---|---|---|---|
| A (right) | +1 | 60 | +0.0039 | +0.23 |
| B (right) | +1 | 240 | +0.0039 | +0.94 |
| C (wrong) | −1 | 60 | −0.0039 | −0.23 |
| D (wrong) | −1 | 240 | −0.0039 | −0.94 |

**4.** Under the original loss, every *token* of the long wrong answer D is penalized four times less than each token of the short wrong answer C, so the specific choices that made D wrong are barely discouraged; being wrong at length is "cheaper" per token. Over many steps this can let long, rambling wrong answers survive and grow, which is the inflation of response length (especially in wrong answers) that the Dr. GRPO paper describes.

With a constant normalizer every token gets the same weight, so a long answer simply has more tokens being pushed, and no answer can dilute its penalty by being long. DAPO's token-level loss (divide by the total number of tokens in the batch) has a similar effect. In TRL these are `loss_type="dr_grpo"` and `loss_type="dapo"`.
