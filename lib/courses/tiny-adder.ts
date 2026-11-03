// "Tiny Adder": the toy GRPO problem used throughout the "Teach a Small AI to
// Think" course. The policy answers a + b for single digits with a table of
// logits L[a][b][k] over answers k = 0..18. This mirrors grpo_tiny_adder.py in
// the course materials so the in-browser chart and the notebook agree.

export type TinyAdderConfig = {
  G: number; // answers sampled per prompt (the group)
  lr: number;
  beta: number; // strength of the pull back toward the reference policy
  eps: number; // clip range for the probability ratio
  ppoEpochs: number; // update passes over each group
  batch: number; // prompts per step
  buggy: boolean; // reward any even answer instead of the right one
  seed: number;
};

export type TinyAdderStep = {
  step: number;
  meanReward: number; // what the reward function says
  accuracy: number; // average probability of the true sum, over all 100 prompts
  entropy: number; // average entropy of the answer distribution, in nats
  zeroVarianceGroups: number; // share of groups where every answer got the same reward
};

export const DEFAULT_TINY_ADDER: TinyAdderConfig = {
  G: 8,
  lr: 0.5,
  beta: 0,
  eps: 0.2,
  ppoEpochs: 1,
  batch: 16,
  buggy: false,
  seed: 0,
};

export const ANSWERS = 19;
const PROMPTS = 100;

// Small, fast, seedable RNG so a run is repeatable.
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function softmax(logits: ArrayLike<number>, offset = 0, length = logits.length): number[] {
  let max = -Infinity;
  for (let k = 0; k < length; k += 1) max = Math.max(max, logits[offset + k]);
  const exps = new Array<number>(length);
  let total = 0;
  for (let k = 0; k < length; k += 1) {
    exps[k] = Math.exp(logits[offset + k] - max);
    total += exps[k];
  }
  return exps.map((value) => value / total);
}

/** Group-relative advantages: how much better each answer did than its group's average. */
export function groupAdvantages(rewards: number[]): number[] {
  const mean = rewards.reduce((sum, value) => sum + value, 0) / rewards.length;
  const variance = rewards.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rewards.length;
  const std = Math.sqrt(variance);
  return rewards.map((value) => (value - mean) / (std + 1e-4));
}

function sample(probs: number[], random: () => number) {
  let threshold = random();
  for (let k = 0; k < probs.length; k += 1) {
    threshold -= probs[k];
    if (threshold <= 0) return k;
  }
  return probs.length - 1;
}

export function reward(a: number, b: number, answer: number, buggy: boolean): number {
  return buggy ? (answer % 2 === 0 ? 1 : 0) : answer === a + b ? 1 : 0;
}

export function createTinyAdder(overrides: Partial<TinyAdderConfig> = {}) {
  const config = { ...DEFAULT_TINY_ADDER, ...overrides };
  const random = mulberry32(config.seed);
  const logits = new Float64Array(PROMPTS * ANSWERS); // reference policy is all zeros (uniform)
  let stepCount = 0;

  function measure() {
    let accuracy = 0;
    let entropy = 0;
    for (let prompt = 0; prompt < PROMPTS; prompt += 1) {
      const probs = softmax(logits, prompt * ANSWERS, ANSWERS);
      accuracy += probs[Math.floor(prompt / 10) + (prompt % 10)];
      entropy -= probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    }
    return { accuracy: accuracy / PROMPTS, entropy: entropy / PROMPTS };
  }

  function step(): TinyAdderStep {
    let rewardTotal = 0;
    let flatGroups = 0;

    for (let item = 0; item < config.batch; item += 1) {
      const a = Math.floor(random() * 10);
      const b = Math.floor(random() * 10);
      const offset = (a * 10 + b) * ANSWERS;
      const oldProbs = softmax(logits, offset, ANSWERS);

      const answers = Array.from({ length: config.G }, () => sample(oldProbs, random));
      const rewards = answers.map((answer) => reward(a, b, answer, config.buggy));
      const advantages = groupAdvantages(rewards);
      rewardTotal += rewards.reduce((sum, value) => sum + value, 0) / config.G;
      if (rewards.every((value) => value === rewards[0])) flatGroups += 1;

      for (let epoch = 0; epoch < config.ppoEpochs; epoch += 1) {
        const probs = softmax(logits, offset, ANSWERS);
        const gradient = new Array<number>(ANSWERS).fill(0);
        answers.forEach((answer, i) => {
          const advantage = advantages[i];
          const ratio = probs[answer] / oldProbs[answer];
          // Clipping: once an answer has moved far enough in the helpful
          // direction, stop pushing it further this round.
          const clipped = (advantage > 0 && ratio > 1 + config.eps) || (advantage < 0 && ratio < 1 - config.eps);
          if (clipped) return;
          for (let k = 0; k < ANSWERS; k += 1) {
            gradient[k] += advantage * ratio * ((k === answer ? 1 : 0) - probs[k]);
          }
        });
        for (let k = 0; k < ANSWERS; k += 1) {
          // KL leash: pull logits back toward the reference (all zeros).
          logits[offset + k] += (config.lr * gradient[k]) / config.G - config.lr * config.beta * logits[offset + k];
        }
      }
    }

    stepCount += 1;
    return {
      step: stepCount,
      meanReward: rewardTotal / config.batch,
      zeroVarianceGroups: flatGroups / config.batch,
      ...measure(),
    };
  }

  function answerDistribution(a: number, b: number) {
    return softmax(logits, (a * 10 + b) * ANSWERS, ANSWERS);
  }

  return { config, step, measure, answerDistribution };
}

export function trainTinyAdder(overrides: Partial<TinyAdderConfig> & { steps?: number } = {}) {
  const { steps = 200, ...rest } = overrides;
  const run = createTinyAdder(rest);
  return Array.from({ length: steps }, () => run.step());
}
