# Teach a Small AI to Think — course spec

Flagship course for unicodesnwrites.tech. Free for now, shipped as a **draft**.

**Promise:** take a small open model (Qwen2.5-0.5B/1.5B-Instruct) that answers maths word problems badly, and teach it to reason step by step with reinforcement learning (GRPO, the method behind DeepSeek-R1), on a free Colab GPU. Then shrink thinking with distillation, and ship your own reasoning model on a task you pick.

**Who it's for:** curious learners, students and developers who have heard "reasoning models" and want to actually build one. Non-technical readers can follow every idea through the videos, visualizations and articles. The labs need basic Python.

**Prerequisites (plain):** you can run a Python notebook and read a `for` loop; school-level maths (averages, percentages). No calculus required: every formula is drawn and explained in words first. A free Google account (Colab) and a free Hugging Face account.

**Voice:** plain, friendly, second person, short paragraphs, no hype, no jargon without a one-line explanation the first time. British/Indian-friendly spelling is fine but be consistent (use US spelling like the rest of the site: "optimize", "behavior"). Never say "masterclass". Credit papers by name and year. Mark anything illustrative (not measured) as "illustrative".

## Facts you may rely on (verify anything else with a web search)

- GRPO = Group Relative Policy Optimization, introduced in *DeepSeekMath* (Shao et al., Feb 2024). It drops PPO's value/critic model and uses the mean and standard deviation of rewards within a group of sampled answers to the same prompt as the baseline.
- *DeepSeek-R1* (DeepSeek-AI, Jan 2025): R1-Zero trained with pure RL (GRPO) from a base model using rule-based rewards (accuracy + format); reported an "aha moment" and growing response length; R1 added a cold-start SFT stage; distilled smaller Qwen/Llama models from R1 outputs and found distillation beat RL directly on small models.
- Follow-up fixes worth naming: *DAPO* (ByteDance Seed, 2025: clip-higher, dynamic sampling, token-level loss, overlong shaping), *Dr. GRPO* ("Understanding R1-Zero-Like Training", Liu et al., 2025: removes length and std normalization biases). Check TRL docs for the current `GRPOConfig` option names (e.g. `loss_type`, `scale_rewards`, `beta`, `num_generations`, `epsilon`, `epsilon_high`) before using them.
- Hugging Face TRL has `GRPOTrainer` / `GRPOConfig`; reward functions receive `prompts`, `completions` and dataset columns as kwargs and return a list of floats. Unsloth offers memory-efficient GRPO on free Colab T4s. Check current versions when writing code; pin versions in notebooks.
- GSM8K: ~8.5k grade-school maths word problems, answers after `####`.

## The toy used across modules (keep identical everywhere)

"**Tiny Adder**": the policy answers `a + b` for single digits `a, b ∈ 0..9`. It is a table of logits `L[a][b][k]` over answers `k ∈ 0..18`, starting at zero (uniform). One training step: sample a batch of prompts; for each prompt sample a **group** of `G` answers; reward `r = 1` if `k == a + b` else `0` (the "buggy reward" variant rewards `k % 2 == 0`, to show reward hacking); advantage `A_i = (r_i − mean(r)) / (std(r) + 1e-4)`; update `L[a][b] += lr * A_i * (onehot(k_i) − softmax(L[a][b]))` for each sample (REINFORCE with a group baseline), optional KL pull toward the reference `L_ref = 0` with strength `beta`; the clipped version uses ratio `π_new/π_old` clipped to `[1−ε, 1+ε]` over `ppo_epochs` inner steps. Defaults: `G=8`, `lr=0.5`, `beta=0.0`, `ε=0.2`, batch 16 prompts, 200 steps, seed 0. The numpy file is `grpo_tiny_adder.py`; the site's in-browser visualization ports it to JavaScript, so keep the maths exactly as above.

## Interactive visualizations available (built in the site; reference by key)

| key | what it shows |
|---|---|
| `think-budget` | slider for "thinking tokens"; illustrative accuracy curve and a worked puzzle solved with/without steps |
| `reward-grader` | learner edits a model answer; live format reward (`<think>…</think><answer>…</answer>`) and correctness reward |
| `policy-nudge` | four candidate answers with probabilities; reward one, watch softmax shift; learning-rate slider |
| `group-advantage` | a group of 8 sampled answers, toggle each correct/incorrect, see mean, std and each advantage |
| `clip-explorer` | ratio slider, advantage sign, ε slider; plots the clipped objective and when the gradient stops |
| `training-run` | runs Tiny Adder GRPO live in the browser: reward curve, accuracy, entropy; knobs G, lr, β; "buggy reward" toggle; presets (healthy / collapse / hacking / stuck) |
| `length-aha` | illustrative R1-Zero-style chart: response length and accuracy over training with the "aha" moment marked |
| `distill-compare` | teacher vs student answer distributions with temperature slider; hard vs soft labels |

## Modules and lessons

Lesson `type` must be one of `concept`, `paper-walkthrough`, `case-study`. Every lesson gets: article, study guide, quiz (4–6 questions), at least one exercise with solution. ★ = premium video lesson.

| # | Module | Lesson slug | Title | Type | Interactive | Extras |
|---|---|---|---|---|---|---|
| 0 | Welcome | `welcome-and-setup` ★ | Welcome: what you'll build, and setting up | concept | — | setup checklist, Colab "hello GPU" notebook |
| 1 | What "thinking" means for an AI | `answer-now-or-think-first` ★ | Answer now, or think first? | concept | think-budget | |
| 1 | | `how-reasoning-models-were-trained` | How R1-style reasoning models were trained | paper-walkthrough | length-aha | R1 paper map cheat sheet |
| 2 | Rewards: grading without a teacher | `verifiable-rewards` ★ | Verifiable rewards: grading without a teacher | concept | reward-grader | |
| 2 | | `lab-write-reward-functions` | Lab: write your own reward functions | concept | — | code walkthrough `rewards.py`, notebook |
| 2 | | `when-rewards-go-wrong` | When rewards go wrong: reward hacking | case-study | training-run (buggy) | |
| 3 | Learning from a score | `the-nudge` ★ | The nudge: making good answers more likely | concept | policy-nudge | |
| 3 | | `lab-reinforce-from-scratch` | Lab: REINFORCE from scratch in numpy | concept | — | code walkthrough `reinforce_bandit.py` |
| 4 | GRPO step by step | `groups-and-advantages` ★ | Groups and advantages: the heart of GRPO | concept | group-advantage | |
| 4 | | `clipping-and-the-kl-leash` | Clipping and the KL leash | concept | clip-explorer | |
| 4 | | `lab-grpo-from-scratch` | Lab: GRPO from scratch on Tiny Adder | concept | training-run | code walkthrough `grpo_tiny_adder.py` |
| 4 | | `reading-the-grpo-equation` | Reading the GRPO equation, line by line | paper-walkthrough | — | GRPO cheat sheet |
| 5 | Your first real run | `setting-up-trl-on-colab` ★ | Setting up a real run on a free GPU | concept | — | code walkthrough `train_grpo.py`, notebook |
| 5 | | `lab-teach-qwen-arithmetic` | Lab: teach Qwen to solve maths word problems | case-study | — | notebook, eval script |
| 6 | Reading the training curves | `what-healthy-training-looks-like` ★ | What healthy training looks like | concept | training-run | curve-reading cheat sheet |
| 6 | | `debugging-a-bad-run` | Debugging a bad run: collapse, hacking, stuck at zero | case-study | training-run | |
| 7 | Format, length and the "aha" moment | `format-and-the-aha-moment` ★ | Format, length and the "aha" moment | concept | length-aha | |
| 7 | | `shorter-thinking` | Making thinking shorter (and cheaper) | concept | — | length-penalty reward code |
| 8 | Distillation | `distillation-vs-rl` ★ | Distillation vs RL: which one, when | concept | distill-compare | |
| 8 | | `lab-distill-reasoning-traces` | Lab: copy a big model's thinking into a small one | concept | — | code walkthrough `sft_distill.py`, notebook |
| 9 | Capstone | `capstone-brief` ★ | Capstone: train your own reasoning model | case-study | — | starter repo, rubric |
| 9 | | `capstone-walkthrough` | Capstone walkthrough: a worked example, start to finish | case-study | — | solution repo |

## File format (one folder per lesson)

```
content/courses/teach-a-small-ai-to-think/
  course.json                      # owned by the lead session
  lessons/<lesson-slug>/
    lesson.json                    # metadata, study guide, quiz, interactive, resources, exercise list
    article.md                     # the article (markdown; GFM tables, ```python fences, > callouts)
    exercises/<key>.prompt.md
    exercises/<key>.solution.md
    walkthrough.json               # optional code walkthrough steps
    code/<file>                    # real source files used by walkthrough.json (must run)
public/courses/teach-a-small-ai-to-think/   # downloadable materials (notebooks, PDFs, starter repo zip)
```

`lesson.json`:

```json
{
  "key": "verifiable-rewards",
  "slug": "verifiable-rewards",
  "title": "Verifiable rewards: grading without a teacher",
  "summary": "10–600 chars, one or two plain sentences.",
  "type": "concept",
  "durationMinutes": 18,
  "learningObjectives": ["3–240 chars each, 1–12 items"],
  "concepts": ["2–80 chars each, 1–20 items"],
  "studyGuide": {
    "mentalModel": "One paragraph picture to keep in your head.",
    "keyIdeas": ["..."],
    "misconceptions": ["..."],
    "recallPrompts": ["..."],
    "explainBackPrompt": "Explain to a friend..."
  },
  "quiz": [{ "key": "q1", "prompt": "...", "options": ["2–6 options"], "correctOption": 0, "explanation": "..." }],
  "interactive": { "component": "reward-grader", "title": "Grade an answer yourself", "caption": "What to try, one or two sentences." },
  "resources": [{ "key": "rewards-notebook", "title": "Rewards lab notebook", "description": "...", "kind": "notebook", "url": "/courses/teach-a-small-ai-to-think/notebooks/02-rewards-lab.ipynb" }],
  "exercises": [{ "key": "format-reward", "title": "Write a stricter format reward", "hints": ["..."] }]
}
```

- `kind` ∈ `notebook | cheatsheet | repo | slides | dataset | link`. Local URLs start with `/courses/teach-a-small-ai-to-think/`; external links must be stable official pages (arXiv, Hugging Face docs, GitHub).
- Quiz keys and exercise keys are lowercase-kebab, unique within the lesson. `correctOption` is 0-based. Vary the position of the right answer.
- `walkthrough.json`: `{ "title": "...", "files": ["rewards.py"], "steps": [{ "title": "...", "markdown": "...", "file": "rewards.py", "startLine": 1, "endLine": 12 }] }` with 5–10 steps, line numbers matching the real file.
- Articles: 1,200–2,500 words. Start with a hook and a one-paragraph "in this lesson". Explain every idea in words and a small picture/table before any formula or code. End with "Key takeaways" (3–5 bullets) and "Next up". Use `>` callouts sparingly. Code blocks must be real and runnable.
- Exercises: prompt says what to do and what "done" looks like; solution is complete and explains why.
- Notebooks: valid `.ipynb` (nbformat 4), first cell is a markdown title + "Open in Colab" instructions, pin library versions, keep cells short with plain-language markdown between them, and state the expected runtime on a free T4.
- Python code under `code/` must run on CPU with only `numpy` (and the standard library) unless it is a GPU training script; GPU scripts must at least pass `python -m py_compile`.
