# FIRE — Vision and Core Concepts

A working note. Meant to be shared so others can react and add their own ideas.

---

## Vision

In Inception, an elderly man in a Mombasa dream-sharing den challenges Cobb:

> "No. They come to be woken up. The dream has become their reality. Who are you to say otherwise, son?"

That is the vision for FIRE.

Players come to FIRE to unlock their simulations. Buying in is not the purchase
of a chance to win money. It is the purchase of permission to imagine — to
explore, in a structured way, the counterfactual life: what they would do, who
they would become, what they would build.

The lottery is the doorway. The simulation is the room.

The product is not the jackpot. The product is the quality of the simulation
the ticket enables, and the residue it leaves behind across many runs.

### Why the simulation matters

A lottery ticket tells you something — but the information flows in the
opposite direction from a prediction market. When you hold a ticket and let
yourself imagine winning, you suddenly find out what you actually want.
Would you quit your job? Which job? Would you buy your mother a house? Would
you leave your marriage? Would you start the company you keep talking about?

The fantasy is a probe into your own preferences that you don't normally let
yourself run, because it's too painful to want things you can't have.

The lottery resolves a drawing and tells you... almost nothing, because you
almost certainly lose. But the holding period — those few days between
purchase and drawing — is when the real product is consumed. During that
window, you run a high-fidelity simulation of your own desires. *That
simulation is the thing being purchased.* The moment after the number is
submitted is just the excuse to start the simulation. Even losing should
leave you with something: a clearer map of your own desires.

### What traditional lotteries get wrong

Traditional lotteries are terrible at all of this:

- The **jackpot is abstract** ("$800 million") — too large to imagine concretely.
- The **timeline is short** — a few days, then the fantasy is forced to end.
- The **social layer is absent** — you fantasize alone.
- The **resolution is brutal** — you lose, the fantasy ends, no residue.

FIRE has to be better at every one of these.

### The metric

The north-star metric is **quality of the simulation the ticket enables.**

Not jackpot size. Not session length. Not match rate. The thing we are
optimizing is how vividly, personally, and durably the player gets to imagine
their own wishful future inside the app.

### Scope for now

**Single-player only.** Multiplayer and community modes are deferred. The
first job is to prove that one player, alone, can have a simulation richer
than what a traditional lottery offers. Social layers come after the
single-player simulation is excellent.

---

## The core question

> **Where do we invite the player to participate so that we can unlock their
> simulations, so that they can see their own wishful future?**

Every surface in the app is a candidate answer. The concepts below are how we
think about that question. The ideas under each concept are what we've already
considered. Most of the surface area is still unbuilt.

---

## Core concepts

### 1. Numbers are the only artifact the player both chooses and carries

Numbers are not just lottery digits. They are the one thing the player picks
and brings with them across games. That makes them the natural anchor for
personal meaning.

The simulation can move from *"I might win money"* to *"the universe is naming
things I love."*

**Ideas already on the table:**
- When a number first surfaces, it briefly admits what it "is" in this
  player's life — not via LLM copy, but via a player-supplied tag entered once
  ("7 = my sister"). Future appearances of that number become loaded.

### 2. Buy-in is the threshold of commitment to the simulation

The tap on `REVEAL MY FATE` is the moment the player crosses from idle into
imagining. Right now it is just a button. It could be the smallest possible
prompt that asks the player to name what they are crossing for.

**Ideas already on the table:**
- A one-line declaration at buy-in: "tonight I want ___". One tap, one line.
  The run then echoes against it. Equivalent to "what's your jackpot fantasy"
  but tiny enough not to break flow.

### 3. The holding period is the actual product

The 20–28s reveal animation is FIRE's analog of the days between ticket
purchase and drawing. It is the highest-leverage real estate we have for
letting the player's imagination run. Right now it is filled with Oracle
whispers spoken AT the player.

The moment after the number is submitted is just the excuse to start the
simulation. Everything that follows — the drop, the matches, the result —
is scaffolding for the player's own imagination to do its work.

Inverting the dynamic — less narration, more silence for the player's own
mind to fill — may matter more than improving the copy.

**Ideas already on the table:**
- Leave deliberate space inside the reveal where nothing is said, so the
  player's imagination has room to run.

### 4. Loss must leave residue

"Even losing leaves you with something: a clearer map of your own desires."
Right now FIRE leaves nothing on a 0–2 match — a static message, then onward.
Losing should compound the simulation across runs, not flush it. Each loss
should sharpen the player's understanding of what they actually want.

**Ideas already on the table:**
- A kept line, a tagged near-miss number, or a small artifact added to the
  soul profile after a loss — anything the player carries forward.

### 5. Soul-profile is accretion, not stats

Today the soul profile is zodiac + top-12 weighted numbers — legible,
knowable, and anti-VRR. It could instead be the accreted residue of every
simulation the player has ever run: what they have named, declared, and
almost-touched.

The player visits the soul profile not to see stats but to see *who they have
been imagining themselves into*.

### 6. Mystic externally, legible internally

The Oracle stays mystic. The player's own self-knowledge is allowed to
accrete legibly. This resolves the apparent tension between simulation
(which wants concreteness) and our VRR doctrine (which forbids legibility).

The Oracle never explains. The player gradually understands themselves.

### 7. Near-misses are the most vivid simulation moments

4/6 and 5/6 are the moments where the simulation gets close enough to taste.
Currently this is expressed as a whisper plus a ball wobble. The player is
not yet invited to *register* what they almost had.

**Ideas already on the table:**
- A single tap (no typing) at near-miss that captures the moment as something
  the player will see again later in their soul profile.

### 8. Pacing must draw out maximum tension

Traditional lotteries get the timeline wrong in one direction (a few days,
then forced ending). It is also possible to get the timeline wrong in the
other direction (too short, no time for the simulation to ignite at all).

There must be a way to pace the game such that it draws out the maximum
tension from the player — long enough that imagination has room to run,
short enough that it never goes slack. Tension is what makes the simulation
vivid; without it, the player is just watching balls drop.

This is the open design problem under the holding period (concept 3): how
fast or slow should each beat be, where should silence sit, when should the
Oracle interrupt and when should it disappear? The answer is whatever
maximizes felt tension per second.

### 9. Carry-forward between games

The between-game countdown is currently dead time. It is the natural slot to
touch the prior run's declaration once before inviting the next one — so each
run is connected to the one before it rather than starting from zero.

---

## How to use this note

When proposing a feature, ask: which concept does this serve, and does it
*invite the player to participate* or does it *speak at the player*? Surfaces
that pull the player's own imagination in are the high-value ones. Surfaces
that narrate are decoration.

The goal of every new idea is to make the simulation richer, more personal,
and more durable across runs — so that over time, the app becomes a place the
player goes to meet a version of themselves they cannot meet anywhere else.
