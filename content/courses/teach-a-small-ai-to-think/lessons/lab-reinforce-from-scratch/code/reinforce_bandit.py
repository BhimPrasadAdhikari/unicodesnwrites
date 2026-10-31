"""REINFORCE from scratch on a one-question "bandit" (numpy only).

The policy answers "What is 3 + 4?" by picking one of four candidate answers.
It starts with no preference and learns from a score alone.
"""
import numpy as np

ANSWERS = ["7", "8", "6", "no idea"]
# Score for each answer: correct = 1.0, any number earns a 0.5 "tidy format" bonus.
REWARDS = np.array([1.5, 0.5, 0.5, 0.0])


def softmax(logits):
    """Turn raw scores (logits) into probabilities that add up to 1."""
    z = logits - logits.max()  # subtract the max so exp() never overflows
    e = np.exp(z)
    return e / e.sum()


def reinforce_step(logits, rng, batch_size=8, lr=0.5, baseline="mean", bonus=0.0):
    """Sample answers, score them, nudge the logits. Returns (new_logits, mean_reward).

    `bonus` adds the same points to every answer ("points for showing up").
    """
    probs = softmax(logits)
    picks = rng.choice(len(ANSWERS), size=batch_size, p=probs)
    rewards = REWARDS[picks] + bonus
    if baseline == "mean":
        advantages = rewards - rewards.mean()  # better or worse than this batch's average?
    else:
        advantages = rewards  # raw score: every answer with r > 0 gets pushed up
    grad = np.zeros_like(logits)
    for k, a in zip(picks, advantages):
        onehot = np.eye(len(ANSWERS))[k]
        grad += a * (onehot - probs)  # gradient of log(prob of answer k)
    return logits + lr * grad / batch_size, rewards.mean()


def train(steps=60, batch_size=8, lr=0.5, baseline="mean", bonus=0.0, seed=0):
    """Run REINFORCE and record the probability of the correct answer after each step."""
    rng = np.random.default_rng(seed)
    logits = np.zeros(len(ANSWERS))  # all zeros = every answer equally likely
    p_correct = [softmax(logits)[0]]
    for _ in range(steps):
        logits, _ = reinforce_step(logits, rng, batch_size, lr, baseline, bonus)
        p_correct.append(softmax(logits)[0])
    return np.array(p_correct)


def average_runs(baseline, bonus=0.0, seeds=20, **kwargs):
    """Average P(correct) over many seeds, plus how much the runs disagree (std)."""
    runs = np.stack([train(baseline=baseline, bonus=bonus, seed=s, **kwargs) for s in range(seeds)])
    return runs.mean(axis=0), runs.std(axis=0)


if __name__ == "__main__":
    np.set_printoptions(precision=3, suppress=True)
    rng = np.random.default_rng(0)
    logits = np.zeros(len(ANSWERS))
    print("answers:     ", ANSWERS)
    print("start probs: ", softmax(logits))
    logits, avg = reinforce_step(logits, rng)
    print("after 1 step:", softmax(logits), f"(batch mean reward {avg:.2f})")

    settings = [("none", 0.0), ("none", 10.0), ("mean", 10.0)]
    results = [average_runs(b, bonus) for b, bonus in settings]
    print("\nP(correct), mean over 20 seeds (spread between seeds in brackets)")
    print(f"{'step':>5}{'no baseline':>16}{'no base, +10':>16}{'mean base, +10':>18}")
    for step in [0, 5, 10, 20, 40, 60]:
        cells = [f"{m[step]:.2f} ({s[step]:.2f})" for m, s in results]
        print(f"{step:>5}{cells[0]:>16}{cells[1]:>16}{cells[2]:>18}")
