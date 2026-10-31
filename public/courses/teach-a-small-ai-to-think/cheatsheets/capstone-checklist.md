# Capstone checklist

*Teach a Small AI to Think* · unicodesnwrites.tech

**The brief:** pick a task a computer can check → measure a small model on it → train it with GRPO → measure again on new puzzles → share the model and a short write-up.

## 1. Is my task a good one?

- [ ] **Checkable:** a short Python function can say right or wrong
- [ ] **Generatable:** a function can make thousands of puzzles with answers
- [ ] **Right difficulty:** the base model gets roughly 5–60% right (not 0%, not ~100%)
- [ ] **Short answers:** the final answer fits in a few tokens

## 2. Milestones

| # | Milestone | Done when... |
|---|---|---|
| M0 | Set up | `python selftest.py` passes on Colab (T4 GPU) |
| M1 | Task + reward | Builder works; reward passes your tests, including cheats *and* correct answers written oddly |
| M2 | Baseline | `evaluate.py` on 200 test puzzles: accuracy, format, length; 10 replies read |
| M3 | Pilot | 50 steps: `reward` moves, `frac_reward_zero_std` < 1.0, `completions/clipped_ratio` small |
| M4 | Full run | 300+ steps; reward and length curves saved |
| M5 | Evaluate + share | Same test set before/after; 3 samples (1 wrong); model on Hugging Face |

## 3. Commands

```bash
python selftest.py
python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct
python train.py --task countdown --max-steps 50          # pilot
python train.py --task countdown --max-steps 300         # full run
python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct trained=outputs/countdown
```

## 4. What to submit

- **Hugging Face model** (a LoRA adapter is fine), with a model card: base model, task, rewards, settings, how to try it
- **Write-up, 300–800 words:**

| Section | Include |
|---|---|
| Task | What puzzles look like; why they're checkable |
| Reward | What earns reward; one loophole you tested |
| Baseline | Accuracy, format, length; the command |
| Training | Steps, group size, learning rate, length cap; curves |
| Results | Before/after table (same test set); 3 real samples, 1 wrong |
| Reflection | A surprise, a limitation, a next experiment |

## 5. Rubric at a glance (20 points: 14 pass, 18 distinction)

Task & reward · Baseline · Training run · Results, honestly · Reflection (4 points each)

**Hard rules:** test puzzles never in training · only numbers you measured (label others "illustrative") · model card names the base model.

## 6. If stuck

| Symptom | Try |
|---|---|
| Reward flat at 0 | Easier puzzles; read replies; test checker on correct answers |
| Reward up, accuracy flat | Loophole: read high-reward replies, tighten the checker |
| Out of memory | `--max-completion-length 192` or `--num-generations 4` |
| Replies keep growing | Lower the cap; add a gentle length reward |
| Late accuracy drop | Evaluate an earlier checkpoint (saved every 100 steps) |
