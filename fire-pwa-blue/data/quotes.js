// ─────────────────────────────────────────────────────────────
// FIRE PWA · Quote & Message Data
// Single source of truth for all Oracle text.
// RULE: 10 words max per entry. Ideal is 6. One line only.
// ─────────────────────────────────────────────────────────────

// ── First-reveal opening quotes (30) ─────────────────────────
export const QUOTES_OPENING = [
  'Let me show you what I see.',
  'I have been watching for you.',
  'The veil parts. Look.',
  'I know why you are here.',
  'Close your eyes. Now open them.',
  'The Oracle was waiting for this.',
  'The numbers are already chosen.',
  'Your fortune begins now.',
  'The veil has spoken.',
  'I felt you coming.',
  'The Oracle sees clearly tonight.',
  'Let the Oracle choose for you.',
  'These numbers were waiting for you.',
  'The alignment was set.',
  'These numbers carry your name.',
  'The Oracle does not guess. It knows.',
  'I found these in the dark.',
  'The veil offered these for you.',
  'Your numbers. Already chosen.',
  'Trust what the Oracle decided.',
  'The Oracle saw these first.',
  'Nothing to decide. Only receive.',
  'The Oracle did the hard part.',
  'These numbers are not random.',
  'The Oracle reached across for you.',
  'The patterns say this.',
  'Before the veil closes… look.',
  'The Oracle works before you arrive.',
  'Your numbers were ready. Were you?',
  'I held these until you came.',
];

// ── Reveal screen · opening whispers (10) ────────────────────
export const WHISPERS_OPENING = [
  'The veil lifts…',
  'Something stirs…',
  'The Oracle reaches…',
  'Silence before knowing…',
  'Numbers surface…',
  'The Oracle closes its eye…',
  'Possibility thickens…',
  'Fate is being drawn…',
  'The Oracle breathes…',
  'Something moves…',
];

// ── Reveal screen · ball drop whispers (10) ──────────────────
export const WHISPERS_BALL_DROP = [
  'The first falls…',
  'It descends…',
  'The first truth…',
  'A number lands…',
  'The veil parts…',
  'One emerges…',
  'Whispered into being…',
  'It lands. Chosen.',
  'The first speaks…',
  'From all possibilities · one.',
];

// ── Reveal screen · match count whispers ─────────────────────
export const WHISPERS_MATCH_1 = [
  'One. The current stirs.',
  'A bond. The Oracle feels it.',
  'One thread connects.',
  'The veil recognises you.',
  'One. The Oracle smiles.',
  'A resonance. More await.',
  'First connection made.',
  'One. The Oracle leans closer.',
];

export const WHISPERS_MATCH_2 = [
  'Two. Keep going.',
  'Two bonds. The pattern breathes.',
  'A shape forms…',
  'Two. Something wakes.',
  'Twin resonances…',
  'Two. The pulse quickens.',
  'Second bond. Continue.',
  'Two threads. Stronger.',
];

export const WHISPERS_MATCH_3 = [
  'Three. The Oracle blazes.',
  'Three. The Oracle trembles.',
  'Triple bond. Rare. Powerful.',
  'Three resonances. Extraordinary.',
  'The Oracle has not felt this…',
  'Three. Pull the final thread.',
  'Triple alignment. The veil tears.',
  'Three bonds forged in fire.',
];

export const WHISPERS_MATCH_4 = [
  'Four. Your fortune rises.',
  'Four bonds. The Oracle blazes.',
  'The numbers know your name.',
  'Four. Uncommon. Powerful.',
  'The Oracle burns brighter.',
  'Four. The stars align.',
  'Four. The Oracle chose you.',
  'Four. Something ancient stirs.',
  'Four. The veil did not hesitate.',
  'Four. The Oracle is alight.',
];

export const WHISPERS_MATCH_5 = [
  'Five. Extraordinary.',
  'Five. The Oracle is stunned.',
  'One stands between you and everything.',
  'Five. The veil is nearly gone.',
  'The Oracle has never seen this.',
  'Five. One breath left.',
  'Five. The Oracle cannot look away.',
  'Five. The veil is almost gone.',
  'Five. One number from everything.',
  'Five. The Oracle holds its breath.',
];

export const WHISPERS_FINAL_PAUSE = [
  'The Oracle is silent…',
  'A breath. Then everything.',
  'The last number waits…',
  'The Oracle holds the truth…',
  'Silence. Then fate.',
  'One moment. Then knowing.',
  'The Oracle closes its eye…',
  'The final number stirs…',
  'Everything rests on this.',
  'The veil drops.',
];

// ── Adaptive in-game whispers ────────────────────────────────
// Passive pools use urgency and stakes to pull disengaged players back.
// Active pools use affirmation and partnership for leaned-in players.
// Neutral pools above are the fallback.

export const WHISPERS_OPENING_PASSIVE = [
  'The veil opens only briefly. Look.',
  'Something waited for you tonight.',
  'Only this moment. Only now.',
  'The Oracle stirs. Witness it.',
  'The veil is thin tonight.',
  'The Oracle held this for you.',
  'One chance. The veil is open.',
  'The Oracle sees you at last.',
];

export const WHISPERS_OPENING_ACTIVE = [
  'You came back. The Oracle felt it.',
  'The veil recognises your return.',
  'The Oracle was waiting for you.',
  'You know how to arrive.',
  'Your presence is known.',
  'The Oracle leans in when you do.',
  'The veil lifts for the returning.',
  'Your rhythm is the Oracle\'s.',
];

export const WHISPERS_BALL_DROP_PASSIVE = [
  'Here it comes. Witness.',
  'The first falls. It carries weight.',
  'Watch. This one matters.',
  'The veil delivers. Now.',
  'A number breaks through.',
  'It lands. For you alone.',
  'The first truth. Stay with it.',
  'One falls. The Oracle watches you.',
];

export const WHISPERS_BALL_DROP_ACTIVE = [
  'Here it comes.',
  'The first. Called by you.',
  'It lands. As expected.',
  'The Oracle delivers on cue.',
  'One falls. You felt it coming.',
  'The first truth arrives.',
  'The veil answers you.',
  'One. You knew it would.',
];

export const WHISPERS_MATCH_1_PASSIVE = [
  'One. Stay. The Oracle gives more.',
  'One. The next could change it.',
  'One bond. Hold steady.',
  'One. The Oracle is just starting.',
  'One. The veil tests you.',
  'One. Hold on.',
  'First thread. More wait for you.',
  'One. The Oracle rewards presence.',
];

export const WHISPERS_MATCH_1_ACTIVE = [
  'One. The Oracle heard you.',
  'One. You called this.',
  'A bond. Your frequency.',
  'One. You and the Oracle agree.',
  'One thread. You pulled it.',
  'One. The Oracle recognises its own.',
  'First resonance. Yours.',
  'One. You were right to come.',
];

export const WHISPERS_MATCH_2_PASSIVE = [
  'Two. The veil favors those who stay.',
  'Two. The current is rising.',
  'Two bonds. The Oracle rewards patience.',
  'Two. Look what staying does.',
  'Two. The pattern wants your eyes.',
  'Two. The Oracle leans in harder.',
  'Two. Something is happening. Stay.',
  'Two. The veil is proving itself.',
];

export const WHISPERS_MATCH_2_ACTIVE = [
  'Two. You are reading the Oracle.',
  'Two. The rhythm is yours.',
  'Two bonds. You called both.',
  'Two. The Oracle follows you now.',
  'Two. Your instinct is alive.',
  'Two. The pattern bends toward you.',
  'Two. You and the Oracle.',
  'Two. You know what this is.',
];

export const WHISPERS_MATCH_3_PASSIVE = [
  'Three. The Oracle rewards the present.',
  'Three. Look what staying brought.',
  'Three. This is what the veil gives.',
  'Three. The Oracle waited for this moment.',
  'Three. The Oracle rewards the witness.',
  'Three. The pattern opens to the committed.',
  'Three. For the patient eye.',
  'Three. The Oracle chose now.',
];

export const WHISPERS_MATCH_3_ACTIVE = [
  'Three. You and the Oracle align.',
  'Three. The pattern you trusted.',
  'Three. You called the shape.',
  'Three. The Oracle meets you here.',
  'Three. Your reading was true.',
  'Three. You built this together.',
  'Three. The veil leans in with you.',
  'Three. Your bond runs deep.',
];

export const WHISPERS_MATCH_4_PASSIVE = [
  'Four. The Oracle chose this moment for you.',
  'Four. The veil reached for you.',
  'Four. The Oracle pulled you here.',
  'Four. The Oracle wanted you here.',
  'Four. This is what attention earns.',
  'Four. The pattern opens to presence.',
  'Four. Held back for you.',
  'Four. The veil held on.',
];

export const WHISPERS_MATCH_4_ACTIVE = [
  'Four. The Oracle recognises its equal.',
  'Four. You built this.',
  'Four. The veil answers you.',
  'Four. You read the Oracle perfectly.',
  'Four. Your pattern, made real.',
  'Four. You and the Oracle, in tune.',
  'Four. The bond is undeniable.',
  'Four. Your alignment is mastery.',
];

export const WHISPERS_MATCH_5_PASSIVE = [
  'Five. The Oracle reached all the way.',
  'Five. You were meant to be here now.',
  'Five. The veil kept you close.',
  'Five. This is what presence earns.',
  'Five. The Oracle pulled you back.',
  'Five. Alignment. You stayed.',
  'Five. The Oracle held this for you.',
  'Five. The veil is bright because of you.',
];

export const WHISPERS_MATCH_5_ACTIVE = [
  'Five. You and the Oracle, fully aligned.',
  'Five. You called this into being.',
  'Five. The veil sings with you.',
  'Five. Your reading is the truth.',
  'Five. The Oracle answers its own.',
  'Five. You built the pattern.',
  'Five. The bond is complete.',
  'Five. The veil bows to you.',
];

export const WHISPERS_FINAL_PAUSE_PASSIVE = [
  'The Oracle pauses for you. Stay.',
  'One breath. The veil will give.',
  'The Oracle holds the last truth…',
  'Stay. One more moment.',
  'The veil pauses. Stay with it.',
  'Silence. Then the veil answers you.',
  'The Oracle waits. You do too.',
  'One beat. Then everything.',
];

export const WHISPERS_FINAL_PAUSE_ACTIVE = [
  'The Oracle waits with you.',
  'Breathe with the Oracle.',
  'Silence between you and the Oracle.',
  'The Oracle holds. You hold.',
  'The veil rests between us.',
  'One breath, shared.',
  'The Oracle pauses. You know why.',
  'The last truth. You feel it coming.',
];

// ── Result screen · Oracle messages by tier (30 each) ────────
// RULE: 10 words max. Ideal 6. One line.
export const MSGS_BLAZES = [
  'You carried the gift.',
  'The Oracle has not felt this in ages.',
  'Your numbers resonate across the veil.',
  'The stars chose you.',
  'Four bonds. The Oracle trembles.',
  'Not luck. Alignment.',
  'The veil welcomed you.',
  'Your fortune runs toward you.',
  'Your number universe blazes.',
  'Something ancient recognises you.',
  'Four. The Oracle bows.',
  'The fire in you is real.',
  'You did not guess. You knew.',
  'The veil parts for you alone.',
  'The Oracle speaks your name.',
  'Your numbers carry old weight.',
  'The Oracle goes still for you.',
  'This draw will be remembered.',
  'Four threads pulled taut.',
  'Rare. Undeniable. Yours.',
  'The Oracle waited for this.',
  'Your alignment is no coincidence.',
  'The universe heard you first.',
  'The veil dissolved.',
  'The Oracle\'s eye blazes gold.',
  'Built to witness this.',
  'Your numbers carry old power.',
  'The pattern is now visible.',
  'The Oracle marks this forever.',
  'Four. Never more certain.',
];

export const MSGS_TRIPLE = [
  'The Oracle\'s sight sharpens.',
  'Three bonds. The pattern breathes.',
  'Something stirs within.',
  'Three. The Oracle leans forward.',
  'Triple alignment. Noted.',
  'Three connected. One more shifts everything.',
  'Your numbers converge.',
  'Three. Rare. Continue.',
  'The veil thins.',
  'Three. The Oracle remembers this.',
  'Your numbers find each other.',
  'The Oracle marks this draw.',
  'Three bonds. The fire grows.',
  'The pattern forms. Don\'t look away.',
  'Three is a beginning.',
  'A shape in your numbers.',
  'Something builds between us.',
  'Three. The Oracle grows certain.',
  'The veil recognises you.',
  'Three. The Oracle pulls tighter.',
  'Not accidental.',
  'Three. The Oracle is listening.',
  'Three bonds in one draw.',
  'Pull again. The pattern demands it.',
  'Closer than you know.',
  'The Oracle felt this before.',
  'Three. No longer passive.',
  'The numbers know your name.',
  'Something old pays attention.',
  'Three is not where this ends.',
];

export const MSGS_BUILDING = [
  'Two. The current still flows.',
  'The Oracle gathers strength.',
  'Two bonds. The veil thins.',
  'The pattern forms beneath.',
  'Two. Not small.',
  'Two threads. The Oracle feels it.',
  'Not discouraged. Neither should you.',
  'Two. Something stirs.',
  'The veil thins with every draw.',
  'Two. Building toward something.',
  'Momentum, not chance.',
  'Two. The Oracle leans closer.',
  'Two is a signal, not a result.',
  'Two. The draw is not done.',
  'The current moves your way.',
  'Two. The Oracle\'s confidence grows.',
  'Aligning. Slowly. Surely.',
  'Two becomes four.',
  'Numbers circling. Two have landed.',
  'Two bonds forged. Noted.',
  'The pattern is present.',
  'Two. The Oracle is watchful.',
  'The veil did not ignore you.',
  'Two. The Oracle is reading.',
  'More are coming.',
  'Two threads. Pull again.',
  'Not measured in single draws.',
  'Two. The Oracle understands you.',
  'The current does not stop.',
  'Two. The Oracle is patient.',
];

export const MSGS_GATHERING = [
  'The Oracle gathers strength.',
  'Your numbers circle closer.',
  'Every draw feeds the bond.',
  'The Oracle is patient.',
  'The veil is listening.',
  'The Oracle does not call this loss.',
  'Nothing wasted. Every draw teaches.',
  'The veil remembers your numbers.',
  'The Oracle sees what\'s coming.',
  'More certain with each exchange.',
  'Your numbers carry unspent weight.',
  'Absence is information.',
  'The veil did not part. Yet.',
  'Not uncertain. Patient.',
  'Every miss is a draw closer.',
  'Not measured by one draw.',
  'The veil listens. Always.',
  'The Oracle notes this.',
  'Not wrong. Not yet time.',
  'The Oracle has seen this turn.',
  'The veil works on longer time.',
  'A question, not an answer.',
  'Patience is the veil\'s currency.',
  'One brushstroke in the picture.',
  'Slow to open. Not closed.',
  'The Oracle has not looked away.',
  'Your numbers echo in the veil.',
  'The Oracle grows stronger.',
  'The draw did not give. The bond did.',
  'The Oracle is here. Pull again.',
];

// ── Bridge screen · Oracle declarations (5 per strategy, 25 total) ─
// RULE: 8 words max. Cryptic, mystical, never specific about numbers.

export const DECLARATIONS_LUCKY = [
  'The Oracle plays the winners again.',
  'What found you once. Let it find you twice.',
  'Your winning threads. The Oracle pulls them back.',
  'The veil remembers what blazed.',
  'Playing what the veil already favored.',
];

export const DECLARATIONS_HOT = [
  'The Oracle plays the fire.',
  'What burns brightest. The Oracle chooses.',
  'Numbers the veil keeps returning to.',
  'The Oracle follows the heat.',
  'Playing where the current runs.',
];

export const DECLARATIONS_COLD = [
  'The Oracle turns to the forgotten.',
  'Playing the numbers waiting in shadow.',
  'What was silent. The Oracle calls forward.',
  'The unchosen. Their turn arrives.',
  'The veil reaches into the cold.',
];

export const DECLARATIONS_HOROSCOPE = [
  'The stars whisper their own picks.',
  'Your soul speaks. The Oracle listens.',
  'Numbers born from your sign.',
  'The alignment chooses for you.',
  'Playing what the heavens drew for you.',
];

export const DECLARATIONS_REPEAT = [
  'The Oracle returns your chosen.',
  'Your touch left a mark. The veil honors it.',
  'What you warmed. The Oracle plays again.',
  'Your numbers. Kept close.',
  'The veil lifts what you named yours.',
];

export const DECLARATIONS_FRESH = [
  'The Oracle plays fresh.',
  'New numbers. New veil.',
  'The Oracle begins unmarked.',
  'The slate clears. Draw anew.',
  'The veil resets.',
];

// ── Post-result toast whispers · passive players (10) ────────
export const WHISPERS_AGAIN_PASSIVE = [
  'The veil opens for the swift.',
  'Something shifts next draw.',
  'The veil is open. Now.',
  'Pull again. This is the one.',
  'The Oracle held something back.',
  'Your numbers are aligned. Now.',
  'Next draw is different.',
  'One more. The Oracle insists.',
  'The pattern breaks open next.',
  'Step through while the veil is wide.',
];

// ── Post-result toast whispers · active players (10) ─────────
export const WHISPERS_AGAIN_ACTIVE = [
  'The Oracle feels your energy.',
  'You are in alignment.',
  'The current is with you.',
  'The Oracle respects your instincts.',
  'This is what chosen feels like.',
  'Your numbers are singing.',
  'The veil leans toward the bold.',
  'Building toward something.',
  'You are learning the Oracle.',
  'The bond deepens every draw.',
];

// ── Post-result toast whispers (30) ──────────────────────────
export const WHISPERS_AGAIN = [
  'The Oracle is not finished.',
  'Shall we pull again?',
  'The veil stirs. One more.',
  'The Oracle waits.',
  'Pull again. Something is close.',
  'The current still flows.',
  'The Oracle is ready.',
  'One more. The Oracle insists.',
  'The veil has not closed.',
  'Something builds. Pull.',
  'The Oracle has more to show.',
  'Again. Pattern not complete.',
  'The veil leans toward you.',
  'The Oracle\'s eye is open.',
  'Pull again. The Oracle watches.',
  'The current does not stop.',
  'The Oracle sees more.',
  'Again. The Oracle is certain.',
  'The numbers still speak.',
  'One more draw. Something shifts.',
  'The Oracle has more to say.',
  'Pull again. The veil is thin.',
  'The Oracle waits for you.',
  'Again. The Oracle does not tire.',
  'The veil is open. Step through.',
  'The Oracle feels the next draw.',
  'Pull. The pattern demands it.',
  'The Oracle is restless.',
  'This is not where it ends.',
  'The veil rewards the persistent.',
];
