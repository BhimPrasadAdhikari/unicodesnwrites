# Lesson videos on YouTube

The course has 19 episodes, each a two-host conversation: Ava explains, Emma asks the questions a newcomer would. They are uploaded to the unicodesnwrites channel as **unlisted**, so only people with the link (the course page) can watch them. They are marked not made for kids.

`youtube.json` next to this file maps each lesson slug to its video ID, and each lesson folder has a `transcript.json` with the episode's timed lines. After changing either, re-import:

```bash
npm run course:import:sandbox -- teach-a-small-ai-to-think
```

`youtube-episodes.json` holds each episode's title, module line and one-line summary. Each description is that summary, the module line, a note about the two hosts, the course link (https://unicodesnwrites.tech/courses/teach-a-small-ai-to-think) and the channel's standard footer.

The rendered files live in `public/course-media/teach-a-small-ai-to-think/` (git-ignored) as `<episode>.mp4`, with `.srt` subtitles and `.jpg` thumbnails alongside.

| # | Module | Title | Lesson | Video |
|---|---|---|---|---|
| 1 | Module 1 · Welcome | Teach a Small AI to Think | welcome-and-setup | [QHp9WQNtcKY](https://youtu.be/QHp9WQNtcKY) |
| 2 | Module 2 · Episode 1 | Answer Now, or Think First? | answer-now-or-think-first | [93VDS-AFKa4](https://youtu.be/93VDS-AFKa4) |
| 3 | Module 2 · Episode 2 | How R1 Learned to Think | how-reasoning-models-were-trained | [xqYG9HINiWY](https://youtu.be/xqYG9HINiWY) |
| 4 | Module 3 · Episode 1 | Verifiable Rewards | verifiable-rewards | [UojGYYvWuqU](https://youtu.be/UojGYYvWuqU) |
| 5 | Module 3 · Episode 2 | When Rewards Go Wrong | when-rewards-go-wrong | [M8_SkSEm2KQ](https://youtu.be/M8_SkSEm2KQ) |
| 6 | Module 4 · Episode 1 | The Nudge | the-nudge | [cwUTquKTpJU](https://youtu.be/cwUTquKTpJU) |
| 7 | Module 4 · Episode 2 | Learning From Mistakes | lab-reinforce-from-scratch | [HHgEEoA0ADc](https://youtu.be/HHgEEoA0ADc) |
| 8 | Module 5 · Episode 1 | Groups and Advantages | groups-and-advantages | [94216WQfp4w](https://youtu.be/94216WQfp4w) |
| 9 | Module 5 · Episode 2 | Clipping and the KL Leash | clipping-and-the-kl-leash | [qtvGUORUGGI](https://youtu.be/qtvGUORUGGI) |
| 10 | Module 6 · Episode 1 | Setting Up a Real Run | setting-up-trl-on-colab | [470P3tpvpbs](https://youtu.be/470P3tpvpbs) |
| 11 | Module 6 · Episode 2 | Teach Qwen Word Problems | lab-teach-qwen-arithmetic | [Z6fjoDdwdsY](https://youtu.be/Z6fjoDdwdsY) |
| 12 | Module 7 · Episode 1 | What Healthy Training Looks Like | what-healthy-training-looks-like | [6yuuK0QgVoI](https://youtu.be/6yuuK0QgVoI) |
| 13 | Module 7 · Episode 2 | Debugging a Bad Run | debugging-a-bad-run | [qo55B6Zz95A](https://youtu.be/qo55B6Zz95A) |
| 14 | Module 8 · Episode 1 | The Aha Moment | format-and-the-aha-moment | [O4JVJY0mT3I](https://youtu.be/O4JVJY0mT3I) |
| 15 | Module 8 · Episode 2 | Shorter Thinking | shorter-thinking | [OWucEmWieHE](https://youtu.be/OWucEmWieHE) |
| 16 | Module 9 · Episode 1 | Distillation vs RL | distillation-vs-rl | [E6RCOyhJEFQ](https://youtu.be/E6RCOyhJEFQ) |
| 17 | Module 9 · Episode 2 | Copy a Big Model's Thinking | lab-distill-reasoning-traces | [ZrgCmRyvchU](https://youtu.be/ZrgCmRyvchU) |
| 18 | Module 10 · Episode 1 | The Capstone | capstone-brief | [0VyTUyVC4Hs](https://youtu.be/0VyTUyVC4Hs) |
| 19 | Module 10 · Episode 2 | A Worked Example | capstone-walkthrough | [6D9gyoxnT18](https://youtu.be/6D9gyoxnT18) |
