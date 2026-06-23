# The Feel Review

### A self-check to run before telling Anand a motion/UX feature is "done"

*Built from the Active Play "Grab the Spin" build, June 2026. Every rule below is a scar from a real iteration on that feature.*

## Why this exists

I cannot see or feel the running app. I can prove code compiles and bundles; I cannot prove it *feels* right. On Active Play, I repeatedly said a change was done when all I'd verified was that it built. Then Anand opened it on a real phone and in two seconds caught a thing I never simulated: an abrupt stop, an imperceptible flare, a reel that looked like it spun backward. Every one of those was invisible to a compile check and obvious to an eyeball.

The fix is not "test more." Anand shouldn't have to playtest every change. The fix is that **I simulate the feel in my head, rigorously, and self-check against the rules below before I ever say "done."** When I actually did that rigor — the root-cause pass where I diagnosed the wagon-wheel illusion, the quintic front-loading, and the flare ordering — I got it right. The failures all came from shipping *without* that rigor. So the whole skill is: apply the diagnostic rigor *before* shipping, not after Anand catches it.

## Anand's taste (calibrate to this bar)

- **Feel beats spec.** A number in a spec ("150ms snap") is a hypothesis, not a target. If the felt result is abrupt, weird, or fake, the number was wrong — even if it's the number he gave me earlier. Don't cling to a spec value after it's failed the eye.
- **Motion must be natural.** Things slow down gradually, the way objects do under friction. Abrupt = unnatural = wrong. "Most human activities stop gradually" is a direct quote.
- **Mental models are sacred.** A roulette ball winds down. A real draw looks diverse. A thumb covers what it touches. Match the model the player already has, or it "feels weird."
- **Perceptibility is binary.** If the player can't perceive a signal, it does not exist. A "tell" must be seen. "Variety" must be seen. A subtle thing is a missing thing.
- **Emotional truth over mechanical correctness.** A near-miss has to *feel* like "I was one away," not "the machine showed me a random number." "I feel cheated" is a fatal signal, not a nitpick.
- **The audience is distracted, visual-first, near-zero-effort.** It must work at a glance and work even if the player never touches the screen.
- **Trust his gut on perception.** When he says "it feels too fast" or "it feels weird," there is a real mechanism (usually aliasing, occlusion, or timing). Find the mechanism; don't dismiss the instinct. He's usually right.
- **Reversible and honest.** Kill switches, flags, A/B variants. And say plainly what I've verified versus what only an eyeball can confirm.

## What went well (keep doing this)

- **A tight loop:** isolated module + one config kill switch + commit/push to a Vercel preview. It let Anand playtest freely without fear, and let us flip variants and revert in one line. Build every feel feature this way.
- **A/B behind a flag** (variant A foreshadow vs B identical). Build both, let the eye pick, delete the loser.
- **Honest verification reporting.** I flagged "compiles, not yet tested in a browser; the gestures need a real device." Keep drawing that line loudly.
- **Root-causing before fixing.** When asked to diagnose, I traced the actual code and named the real mechanism instead of guessing. That rigor is the asset — it just has to move earlier.

## The failure classes, and the self-check that catches each

**1. Trace the sequence — for any "X before Y" claim, write out the actual order.**
*Scar:* the "foreshadow" flare fired *after* the number was already revealed, because the reveal and the flare were in that order in the code. A foreshadow that trails the reveal is not a foreshadow.
*Check:* whenever the intent is "the tell leads the result," or "this happens during, not after," literally list the events in execution order and confirm they match the words. The reel landed *on* the number, so anything after the landing is too late by definition.

**2. Reason about the motion physics — never trust easing intuition.**
*Scar:* I changed the stop from cubic to *quintic* ease-out thinking "more ease-out = gentler." Quintic is *more* abrupt: it dumps 97% of the stopping distance in the first half and crawls the invisible last 3%. I made it worse while believing I fixed it.
*Check:* for any easing or velocity change, reason about the actual curve: where is the velocity high, where does it go to zero, how much distance is covered by the midpoint? Higher-order ease-out is more front-loaded, not softer. Constant deceleration (quadratic ease-out) is what the physical world does. Compute, don't vibe.

**3. Aliasing — check per-frame displacement on anything repeating.**
*Scar:* the reel looked like it reversed right before stopping (wagon-wheel illusion) and showed "no-number" strobe spots. A repeating pattern moving more than ~0.5 cell/frame aliases. My launch boost and a random deceleration distance pushed it over the line.
*Check:* for any spinning/scrolling/repeating motion, estimate cells-per-frame at peak speed (cruise *and* the start of decel). Keep it well under ~0.5 cell/frame. Bound the distance so speed never spikes. Anand's "we don't need the hyper speed" was the correct diagnosis before I'd done the math.

**4. Perceptibility budget — a signal needs lead time and contrast.**
*Scar:* the first flare had an 80ms lead and was white glow on top of a white win-flash. Invisible. Then the diversity was real in the data but hidden by a slow ease-in start, so the reel showed ~1 number before speeding up.
*Check:* a "before" tell needs real lead (rule of thumb: ~250ms+, not 80ms) and must be visually distinct from the cue it precedes (gold, not white-on-white). And content is only "shown" if the motion actually surfaces it — a slow start hides whatever's in the strip.

**5. Mind the body and the device.**
*Scar:* "press-and-hold to freeze the ball" — on a phone the thumb covers the ball, so holding it hid the very thing you were holding.
*Check:* simulate the actual hand. The thumb occludes a fingertip-sized patch; small targets get covered; there is no hover. Physical-machine affordances (a hold, a side view) often don't transfer to a 52px target under a thumb.

**6. Honor the mental model.**
*Scar:* abrupt stop violated "a roulette ball slows gradually"; a low-diversity reel violated "a real draw shows lots of numbers." Both read as "wrong" instantly.
*Check:* name the real-world thing the player is comparing this to, and match its behavior. If it deviates, that deviation needs a deliberate reason, not an accident of implementation.

**7. Land the emotional payload, not just the mechanic.**
*Scar:* an early reel cycled random numbers, so when it didn't land on a number the player recognized, it felt arbitrary and they "felt cheated." The near-miss only works if the number that *almost* hits is one of the player's own.
*Check:* for any moment meant to carry emotion (near-miss, win, loss), verify the specific content that creates the emotion is present — here, seeding the player's own numbers into the slot just before the landing, on every ball.

**8. Serve the distracted, do-nothing player.**
*Scar (avoided, keep avoiding):* the feature must work for someone who never touches the screen. Active Play auto-settles if ignored, so no gesture is ever required.
*Check:* every interactive feel feature needs a graceful do-nothing path and a reduced-motion path. Adding agency must never become adding a chore.

## The pre-ship gate (run this before saying "done")

Before I tell Anand a motion/feel feature is ready, I answer these in writing to myself:

1. **Sequence:** if I claimed "X leads/foreshadows Y," is X actually before Y in execution order?
2. **Curve:** can I describe the velocity profile, and is the stop gradual (not front-loaded)?
3. **Aliasing:** is peak cells-per-frame well under 0.5? Is the travel distance bounded?
4. **Perceptibility:** does every tell have ~250ms+ lead and clear contrast? Does the motion actually surface the content?
5. **Body:** does the thumb occlude the target? Does any gesture rely on hover or a side view?
6. **Model:** what real-world thing is this mimicking, and does it behave like it?
7. **Emotion:** is the specific content that carries the feeling actually there?
8. **Do-nothing + reduced-motion:** both paths graceful?
9. **Honesty:** have I said clearly what I verified (compiles/bundles) versus what only a real device can confirm? If I can't simulate a point confidently, I say so instead of implying it's fine.

If any answer is shaky, I fix it or flag it *before* handing over — that's the entire point. The bar is: Anand opens it and it just feels right, because I already ran his eyes for him.
