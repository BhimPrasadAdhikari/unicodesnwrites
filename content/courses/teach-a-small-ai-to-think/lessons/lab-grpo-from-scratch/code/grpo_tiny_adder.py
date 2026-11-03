"""GRPO from scratch on "Tiny Adder" (numpy only, runs on CPU in seconds).

The policy answers a + b for single digits. It is a table of logits
L[a][b][k] over answers k = 0..18, starting at zero (every answer equally likely).
"""
import numpy as np

N_ANSWERS = 19  # possible sums: 0..18


def softmax(logits):
    z = np.exp(logits - logits.max(axis=-1, keepdims=True))
    return z / z.sum(axis=-1, keepdims=True)


def reward(a, b, k, buggy=False):
    """1 for the right sum. The buggy grader rewards any even number instead."""
    if buggy:
        return 1.0 if k % 2 == 0 else 0.0
    return 1.0 if k == a + b else 0.0


def advantages(rewards):
    """Group-relative advantage: how much better than the group's average?"""
    r = np.asarray(rewards, dtype=float)
    return (r - r.mean()) / (r.std() + 1e-4)


def grpo_update(row, ref_row, ks, adv, lr, beta, eps, ppo_epochs):
    """Update one prompt's logits from its group of sampled answers ks."""
    p_old = softmax(row)  # the policy that produced the samples
    for _ in range(ppo_epochs):
        p_new = softmax(row)
        step = np.zeros(N_ANSWERS)
        for k, A in zip(ks, adv):
            ratio = p_new[k] / p_old[k]  # 1.0 on the first inner step
            clipped = (A > 0 and ratio > 1 + eps) or (A < 0 and ratio < 1 - eps)
            if not clipped:  # outside the trust region the gradient is zero
                onehot = np.eye(N_ANSWERS)[k]
                step += ratio * A * (onehot - p_new)
        step /= len(ks)  # average over the group
        # KL leash, kept simple: pull the logits straight back toward the reference.
        # (A stand-in for the exact KL gradient; same idea, easier to read.)
        step -= beta * (row - ref_row)
        row = row + lr * step
    return row


def evaluate(L):
    """Over all 100 prompts: chance of the TRUE sum, and entropy (spread)."""
    p = softmax(L)
    a, b = np.meshgrid(np.arange(10), np.arange(10), indexing="ij")
    accuracy = float(p[a, b, a + b].mean())  # judged by the true sum, not the grader
    entropy = float(-(p * np.log(np.maximum(p, 1e-12))).sum(axis=-1).mean())
    return accuracy, entropy


def train(G=8, lr=0.5, beta=0.0, eps=0.2, steps=200, batch=16, buggy=False, seed=0,
          ppo_epochs=1, log_every=0):
    """Run GRPO and return a list of per-step dicts: reward, accuracy, entropy."""
    rng = np.random.default_rng(seed)
    L = np.zeros((10, 10, N_ANSWERS))   # the policy
    L_ref = np.zeros_like(L)            # the frozen reference (uniform)
    history = []
    for step in range(1, steps + 1):
        step_rewards = []
        for _ in range(batch):
            a, b = rng.integers(0, 10, size=2)
            ks = rng.choice(N_ANSWERS, size=G, p=softmax(L[a, b]))  # the group
            rs = [reward(a, b, k, buggy) for k in ks]
            L[a, b] = grpo_update(L[a, b], L_ref[a, b], ks, advantages(rs),
                                  lr, beta, eps, ppo_epochs)
            step_rewards.extend(rs)
        accuracy, entropy = evaluate(L)
        history.append({"step": step, "reward": float(np.mean(step_rewards)),
                        "accuracy": accuracy, "entropy": entropy})
        if log_every and (step == 1 or step % log_every == 0):
            h = history[-1]
            print(f"step {step:4d}  reward {h['reward']:.3f}  "
                  f"accuracy {h['accuracy']:.2f}  entropy {h['entropy']:.3f}")
    return history


if __name__ == "__main__":
    print("== Honest reward (k == a + b) ==")
    train(log_every=25)
    print("\n== Buggy reward (any even number) ==")
    train(buggy=True, log_every=25)
