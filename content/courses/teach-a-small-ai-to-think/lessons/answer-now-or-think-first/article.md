# Answer now, or think first?

Try this in your head, without writing anything down: *a bat and a ball cost $1.10 together, and the bat costs $1.00 more than the ball. How much is the ball?* Most people's first answer is 10 cents. It is wrong (the ball costs 5 cents). Now grab a pencil, write "ball = x, bat = x + 1.00, together 2x + 1.00 = 1.10" and the answer falls out. Nothing about your brain changed between the two attempts. You just gave yourself room to think. Language models have the same problem, and the same fix.

**In this lesson** you will see why a model that writes out its steps often gets harder questions right, why that is not magic but a matter of giving the model more room to compute, what it costs, and the key difference between *asking* a model to think step by step and *training* it to. That difference is what this whole course is about.

## Two ways to answer

Picture two students answering the same question.

| | **Student A: answers now** | **Student B: thinks first** |
|---|---|---|
| What they write | "$26" | "16 eggs − 3 − 4 = 9 left. 9 × $2 = $18. Answer: $18" |
| Time taken | Instant | A few seconds longer |
| When they are right | Easy questions | Easy and multi-step questions |
| When they are wrong | You cannot tell why | You can see which step went wrong |

Student B is not cleverer. They break the problem into small steps, each easy on its own, and write down each result so they do not have to hold it in their head.

## Why writing steps helps a model

A language model writes one token at a time (a token is a word or part of a word). For each token, it does roughly the same, fixed amount of computation. That has a surprising consequence: **if the model must give the answer as its very first token, it gets one token's worth of thinking.** For "what is 2 + 2?", that is plenty. For a problem with four steps, it is not.

When the model writes its steps out, two things change:

1. **More computation.** Every token of working is another round of computation the model gets to spend on the problem.
2. **A scratchpad.** Whatever the model writes, it can read back. "9 eggs left" sits on the page, so the next step can build on it instead of recalculating it.

Researchers noticed this early. *Show Your Work: Scratchpads for Intermediate Computation with Language Models* (Nye et al., 2021) trained models to write intermediate results and saw big gains on multi-step tasks. *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (Wei et al., 2022) showed that simply including worked examples in the prompt made large models much better at word problems. And *Large Language Models are Zero-Shot Reasoners* (Kojima et al., 2022) found that adding one sentence, "Let's think step by step", helped a lot on its own.

> An analogy: doing long multiplication in your head versus on paper. The paper does not know any maths. It just stops you from dropping digits.

## The thinking budget

If more steps help, why not always think for ages? Because thinking is not free. Every extra token takes time to generate and, if you pay for an AI service, money. And on easy questions it adds nothing.

Open the **thinking budget** visualization in this lesson. Drag the slider to give the model more or fewer "thinking tokens" and watch two things: an accuracy curve, and a worked puzzle solved with and without steps.

The curve is **illustrative**, not measured, but its shape matches what researchers report:

| Thinking budget | What tends to happen |
|---|---|
| Zero (answer immediately) | Fine on one-step questions, poor on multi-step ones |
| A little | Big jump in accuracy: the model can lay out the key steps |
| A lot | Smaller gains; the model double-checks and catches slips |
| Far too much | Little or no extra gain; sometimes the model talks itself out of a right answer |

Things to try in the visualization:

- Find the point where extra budget stops helping much. That is the sweet spot.
- Compare the "with steps" and "without steps" versions of the puzzle. Which step does the rushed version skip?

## Asking versus training

Here is the turning point of the lesson. There are two very different ways to get a model to think first.

**Asking (prompting).** You add "think step by step" to your question. The model has seen lots of step-by-step writing in its training data, so it imitates that style. This works surprisingly well on big models, but it has limits:

- The model writes steps that *look* like reasoning, whether or not they help.
- It does not learn *how much* to think. It writes similar-length working for easy and hard questions.
- It does not learn to *check* its own work, because nothing ever rewarded checking.
- On small models, the gains are often modest. Small models imitate the style without always getting the substance.

**Training.** You let the model try many problems, check each final answer automatically, and strengthen whatever habits led to right answers. Over time, the model is not imitating step-by-step writing; it is keeping the thinking habits that *work*. In September 2024, OpenAI's o1 announcement ("Learning to reason with LLMs") described a model trained with reinforcement learning to think before answering, and reported that its performance kept improving both with more training and with more thinking time at answer time. In January 2025, the *DeepSeek-R1* paper (DeepSeek-AI, 2025) described an open recipe for the same idea, and showed something striking: when trained this way, the model's answers grew longer on its own, and it started re-checking its work without being told to.

| | **Asking** ("think step by step") | **Training** (reinforcement learning) |
|---|---|---|
| What changes | The prompt | The model itself |
| Effort | One sentence | Hours of GPU time |
| Learns how much to think? | No | Yes, gradually |
| Learns to check its work? | Rarely | Often, if checking leads to more right answers |
| Works on small models? | Somewhat | Yes, with care (that is this course) |

## Why "thinking" is in quotes

It is worth being honest about the word. When we say a model "thinks", we mean it writes intermediate text before its final answer, and that text helps it get the answer right. Whether that resembles human thought is a deeper question we will not settle here. Two practical warnings follow:

- **The working is not always the real reason.** A model can write a neat chain of steps and then give an answer that does not follow from them. Treat the working as useful evidence, not as a guaranteed explanation.
- **More words are not more intelligence.** Long thinking that goes in circles is just expensive. Module 7 is about making thinking shorter without losing accuracy.

## Thinking budget at answer time: a tiny taste

There is one more trick worth knowing, because you will see it in papers: you can also spend more compute at answer time by sampling **several** answers and taking a majority vote. *Self-Consistency Improves Chain of Thought Reasoning in Language Models* (Wang et al., 2022) showed this helps a lot. The R1 paper reports both a single-answer score and a majority-vote score for exactly this reason. It is another way of "thinking more", just spread across several attempts. Keep it in mind: sampling several answers to one question is also the first step of GRPO, the training method you will build in Module 4.

## What this means for our small model

When you ran the hello GPU notebook, the prompt already asked Qwen to "show your working". It did write steps, and it still got many questions wrong. That is the limit of asking. In this course you will move from asking to training:

1. Ask the model to put its working in `<think>…</think>` and its final answer in `<answer>…</answer>`.
2. Score each answer automatically: is the format right, is the number right?
3. Nudge the model toward the answers that scored well, many thousands of times.

By the end, the step-by-step habit will not be a style the model imitates because you asked. It will be a habit it keeps because it works.

## Key takeaways

- A model does a fixed amount of computation per token, so answering in one token gives it very little room to work; writing steps gives it more computation and a scratchpad.
- Chain-of-thought prompting (Wei et al., 2022) and "Let's think step by step" (Kojima et al., 2022) showed that asking for steps helps, especially on big models.
- Thinking costs time and money, and the gains level off; the thinking budget visualization's curve is illustrative of that shape.
- Training a model with reinforcement learning to think, as in o1 (OpenAI, 2024) and DeepSeek-R1 (DeepSeek-AI, 2025), changes the model itself so it learns how much to think and to check its work.

## Next up

In **How R1-style reasoning models were trained** you will walk through the DeepSeek-R1 paper section by section: R1-Zero, the rewards it used, the "aha moment", and why its authors ended up distilling smaller models.
