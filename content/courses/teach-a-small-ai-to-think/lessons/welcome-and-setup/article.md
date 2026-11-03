# Welcome: what you'll build, and setting up

Ask a small AI model this: *"Janet's ducks lay 16 eggs a day. She eats three for breakfast and bakes muffins with four. She sells the rest for $2 each. How much does she make?"* A child with a pencil gets $18. A half-billion-parameter model, answering in a hurry, often does not. By the end of this course, you will have taught that same small model to slow down, write out its working, and get answers like this right far more often. You will do it the way DeepSeek trained R1: not by showing it worked examples, but by letting it try, scoring its answers, and nudging it toward the ones that scored well.

**In this lesson** you will see the whole journey at a glance, meet the small model you will train, find out what you need (a free Google account, a free Hugging Face account and a bit of patience), and run your first notebook on a free GPU. That notebook ends with a score out of 20. Keep it. It is your "before" photo.

## What you will build

Here is the path, one module at a time. Each module has a short video lesson, articles you can read at your own pace, interactive visualizations you can play with in the browser, and (from Module 2) hands-on labs.

| Module | What you learn | What you make |
|---|---|---|
| 1. What "thinking" means | Why writing out steps helps, and how R1-style models were trained | A mental map of the DeepSeek-R1 paper |
| 2. Rewards | How to grade answers automatically, and how grading goes wrong | Your own format and correctness reward functions |
| 3. Learning from a score | How a score turns into a small change in the model | REINFORCE from scratch in numpy |
| 4. GRPO step by step | Groups, advantages, clipping, the KL leash | GRPO from scratch on a toy problem |
| 5. Your first real run | Training a real model on a free GPU with Hugging Face TRL | A Qwen model that reasons through maths word problems |
| 6. Reading the curves | What healthy and broken training look like | A debugging checklist |
| 7. Format, length and "aha" | Why answers get longer, and how to make thinking cheaper | A length-aware reward |
| 8. Distillation | Copying a big model's thinking into a small one | A distilled small reasoner |
| 9. Capstone | Putting it all together on a task you choose | Your own reasoning model |

You do not need to do every lab to follow the ideas. The videos, articles and visualizations explain everything in plain language. The labs are there for when you want to feel it in your hands.

## Meet the student: Qwen2.5-0.5B-Instruct

The model you will train is **Qwen2.5-0.5B-Instruct**, an open model from Alibaba's Qwen team. "0.5B" means about half a billion parameters (the adjustable numbers inside the model). That sounds like a lot, but the models behind popular chat assistants are hundreds of times bigger.

Why pick such a small one?

| Reason | What it means for you |
|---|---|
| It fits on a free GPU | You can train it on Google Colab's free T4, no credit card |
| It trains quickly | Experiments take minutes to hours, not days |
| It has room to improve | Its maths is shaky, so you will see real progress |
| It is open | You can download it, change it and share your version |

Later in the course you can step up to the 1.5B version if you want stronger results and have a little more patience.

## Meet the test: GSM8K

To know whether the model is getting better, you need questions with known answers. We use **GSM8K**, a public set of about 8,500 grade-school maths word problems. Each one comes with a worked solution, and the final number always appears after `####`, like this:

```
She has 16 - 3 - 4 = 9 eggs left. She makes 9 * 2 = $18.
#### 18
```

That `####` matters more than it looks. It means a computer can check an answer without a human in the loop: pull out the model's final number, compare it with the number after `####`, done. That simple fact is what makes the whole course possible, and Module 2 is all about it.

## Meet the toy: Tiny Adder

Real models are big and slow, which makes them a poor place to *see* an idea. So alongside Qwen, we use a toy called **Tiny Adder**. It answers sums like `3 + 4` for single digits, by picking an answer from 0 to 18. It starts out guessing at random. It learns using exactly the same method you will later use on Qwen, just small enough to run in your browser in a second. Whenever a new idea shows up, you will meet it on Tiny Adder first.

## What you need

Here is the setup checklist. Tick each one before the next lesson.

| ✓ | Item | Why | Cost |
|---|---|---|---|
| ☐ | A Google account | To use Google Colab, which gives you a free GPU in the browser | Free |
| ☐ | A Hugging Face account | To download models and, later, share yours | Free |
| ☐ | A recent browser (Chrome, Edge, Firefox or Safari) | Colab and the visualizations run there | Free |
| ☐ | About 1 GB of free Google Drive space (optional) | To save checkpoints in later modules | Free |
| ☐ | The "hello GPU" notebook run once | Proves everything works | Free |

You do not need a powerful computer. All the heavy work happens on Google's machines. For the labs, it helps if you can read a short Python `for` loop. For the maths, school-level averages and percentages are enough. Every formula in this course is drawn and explained in words before it appears.

> A note on free GPUs: Colab's free tier gives you a GPU for a limited time, and availability can vary during busy hours. If you cannot get a T4, wait a little and try again, or run the CPU-only labs (Modules 2–4) in the meantime. None of them need a GPU.

## Your first notebook: hello, GPU

Download the **Hello GPU notebook** from this lesson's resources. Then:

1. Open [Google Colab](https://colab.research.google.com) and choose **File → Upload notebook**.
2. Choose **Runtime → Change runtime type**, pick **T4 GPU** and save.
3. Run the cells from top to bottom with **Shift + Enter**.

Here is what each part does, in plain words:

| Step | What happens | What you should see |
|---|---|---|
| Check the GPU | `nvidia-smi` lists the graphics card | "Tesla T4" and about 15 GB of memory |
| Install libraries | Installs pinned versions of `transformers`, `accelerate`, `datasets` and `trl` | A short pause, maybe a "restart session" button |
| Load the model | Downloads Qwen2.5-0.5B-Instruct (about 1 GB) | "Loaded … with 494M parameters" or similar |
| Ask one question | The model answers the first GSM8K test question | A worked answer, right or wrong |
| Ask twenty | Grades 20 answers by comparing the last number with the gold answer | A list of ✓ and ✗ and a score out of 20 |

The whole thing takes about five to eight minutes on a free T4, mostly downloading. The grading at the end is deliberately simple: it takes the last number in the reply. It is rough, but it is the same idea you will build properly in Module 2.

Expect a mixed score. Independent measurements of this model on GSM8K land somewhere between a third and a half right, depending on the exact prompt and grading rules. That is a lot of wrong answers, and a lot of room to grow.

## Why it gets things wrong

When you read the wrong answers, you will see a few repeating patterns: it skips a step, copies a number wrongly, answers a slightly different question, or wanders off and never states a final number. It is not that the model "can't do maths". Often it can do every single step. What it lacks is the habit of laying the steps out carefully and checking them. That habit is what we will train.

## How to get the most from the course

- **Watch, then play.** After each video, open the visualization and try to break it. Moving a slider teaches you more than reading about it.
- **Do the quiz straight away.** It takes two minutes and tells you which idea to revisit.
- **Use the study guide.** Each lesson has recall prompts and an "explain it back" prompt. Explaining an idea to someone else, even an imaginary friend, is the fastest way to find the gaps.
- **Keep a lab notebook.** Write down your settings and results. Training runs are experiments, and experiments are only useful if you remember what you tried.

## Key takeaways

- You will teach a small open model, Qwen2.5-0.5B-Instruct, to reason through maths word problems using reinforcement learning, the same family of methods used for DeepSeek-R1 (DeepSeek-AI, 2025).
- GSM8K's answers can be checked by a computer, which is what lets the model learn without a human teacher.
- Tiny Adder, a toy that learns single-digit sums, lets you see every idea before you use it on a real model.
- All you need is a free Google account, a free Hugging Face account and a browser. Your "before" score out of 20 is your starting line.

## Next up

In **Answer now, or think first?** you will see why writing out steps helps a model at all, play with a "thinking budget" slider, and meet the idea that a model can be trained to choose to think.
