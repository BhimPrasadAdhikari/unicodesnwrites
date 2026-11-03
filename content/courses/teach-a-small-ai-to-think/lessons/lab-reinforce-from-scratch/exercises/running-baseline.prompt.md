# Swap in a running-average baseline

The lab's baseline is the average score of the current batch. Another classic choice, used in many REINFORCE implementations, is a **running average**: a single number that slowly tracks the average score over recent batches.

**What to do**

1. Write `train_running(steps=60, batch_size=8, lr=0.5, bonus=0.0, seed=0, decay=0.9)`, a copy of `train` that uses a running-average baseline instead of the batch mean:
   - advantage = score − running average;
   - after each step, update `running = decay * running + (1 - decay) * rewards.mean()`.
2. First, start the running average at **0**. Run 20 seeds with `bonus=0.0` and with `bonus=10.0`, and record the mean P(`7`) at steps 10, 20 and 60.
3. Then change the start so the running average begins at the **first batch's mean score**. Run both bonuses again.
4. Explain in two or three sentences what went wrong with the zero start when `bonus=10.0`, and why the second start fixes it.

**What "done" looks like**

A working `train_running`, a small table with four rows (two starts × two bonuses) of P(`7`) at steps 10, 20 and 60, and your explanation.
