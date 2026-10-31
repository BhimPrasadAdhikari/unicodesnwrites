# Solution: distill, RL, or both?

1. **Distill** (optionally followed by RL). Good teacher traces already exist for exactly this task, and DeepSeek's results show that small models gain far more from copying a strong teacher than from discovering reasoning through RL. RL alone would spend a lot of compute searching for chains of reasoning the traces simply hand over.

2. **RL (GRPO)**. There's no teacher to copy, but answers are trivial to check and the model already gets some right, so most groups will contain a mix of right and wrong answers, and that mix is what GRPO's advantages need. Distillation isn't an option without traces (unless you generate them with a bigger model first, which is also a valid plan).

3. **Distill then RL** (or make the task easier first). With 0% accuracy, every answer in every group gets the same reward, every advantage is zero, and GRPO learns nothing. You need to get the model off zero first: distill from a stronger model's solutions, add easier puzzles (for example three numbers instead of four), or both. Then switch to RL.

4. **RL**. Imitation tops out around the teacher's level, because the student is trained to reproduce the teacher. To go beyond the best existing model you need a learning signal that doesn't come from a teacher, which is exactly what a reward function provides. The DeepSeek paper makes the same point: going past current limits likely needs stronger base models and larger-scale RL.

5. **Distill then RL, with a length reward.** The student copied the teacher's habits, including its long thinking. Keep the distilled model as your starting point (it's accurate), then run GRPO with a correctness reward plus a gentle length penalty or budget from the "shorter thinking" lesson, with a lower `max_completion_length`. Alternatively, re-distill on only the shortest traces. Either way, check accuracy on held-out problems after shortening.

**The pattern:** distillation is the fast way to *get* a skill, RL is the way to *sharpen and steer* it with a reward you control.
