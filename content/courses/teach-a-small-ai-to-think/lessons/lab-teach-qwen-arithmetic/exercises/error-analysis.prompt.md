# Sort 20 wrong answers into error types

Numbers tell you how often the model is wrong; error analysis tells you *why*.

1. In the notebook, after section 8, use the `answer()` helper and `is_correct()` to run the **trained** model on GSM8K test questions 0–99 and collect the first 20 it gets wrong.
2. Read each one and put it into exactly one bucket:
   - **setup**: the plan or equation is wrong
   - **arithmetic**: the plan is right but a calculation is wrong
   - **format**: the right number appears, but not inside `<answer>` (or the tags are broken)
   - **cut off**: the answer stops before finishing (hit the token limit)
   - **misread**: answers a different question than was asked (wrong units, wrong person, partial total)
3. Count the buckets and suggest one change to the training setup aimed at the biggest bucket.

**Done looks like:** working code, a table of counts that adds up to 20, and a one-paragraph recommendation.
