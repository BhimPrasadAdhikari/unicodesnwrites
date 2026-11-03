# Match the equation to the code

Here are seven pieces of the GRPO objective and seven lines (or fragments) of `grpo_tiny_adder.py`, shuffled. Match each piece to its line, and write one plain-English sentence for each.

**Equation pieces**

1. `{o_1 … o_G} ~ π_θold(·|q)`
2. `(1/G) Σ_i`
3. `π_θ(o_i,t|…) / π_θold(o_i,t|…)`
4. `min[ratio · Â, clip(ratio, 1−ε, 1+ε) · Â]`
5. `Â_i = (r_i − mean(r)) / std(r)`
6. `− β · D_KL[π_θ ‖ π_ref]`
7. "maximize J"

**Code fragments**

- A. `row = row + lr * step`
- B. `step -= beta * (row - ref_row)`
- C. `ks = rng.choice(N_ANSWERS, size=G, p=softmax(L[a, b]))`
- D. `return (r - r.mean()) / (r.std() + 1e-4)`
- E. `step /= len(ks)`
- F. `clipped = (A > 0 and ratio > 1 + eps) or (A < 0 and ratio < 1 - eps)`
- G. `ratio = p_new[k] / p_old[k]`

Finally, name one part of the equation that has *no* line in the toy, and explain why.

**Done looks like:** seven matches, seven sentences, and one short paragraph on the missing piece.
