# Ziki Guard: the kit

**What:** an improvement to how humans and agents interact in Ziki, built into a fork of the real Ziki.
**In one line:** agents promise what they'll do, Ziki checks the change against that promise and your rules, and you only
see the gaps. Your answers become rules the agent must follow.

| File | What it holds | Who reads it |
| --- | --- | --- |
| `BRIEF.md` | The problem, the lens (scared founder), the evidence, the interaction loop, the boundary | Everyone |
| `DESIGN.md` | Design rules from our research, every screen, the exact words, states, keyboard | Claude Code |
| `ENGINE.md` | The guard pipeline: detectors, data structures, algorithms, fixtures, tests | Codex (builds it), Claude Code (wires it) |
| `PLAN.md` | The steps, who does each, status | Everyone |
| `steps/STEP-NN.md` | One brief per Claude Code step | Claude Code |
| `steps/CODEX-NN.md` | One brief per Codex task | Codex |

Names: "Ziki Guard" is the internal name for the mechanism. People never see the word "guard"; they see **Inbox**,
**Security**, **Paused for you**, **Promised / Ziki found**.
