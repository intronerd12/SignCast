/**
 * fslLessons.js — Filipino Sign Language curriculum data
 *
 * 6 units, each with 5 exercises mixing four types:
 *   sign-to-text  – show sign description → pick the word
 *   text-to-sign  – show word → pick the gesture description
 *   match-pairs   – tap to match signs ↔ meanings
 *   fill-blank    – type the meaning
 */

// ── Sign Dictionary ────────────────────────────────────────────────────────

export const SIGNS = [
  // Greetings
  { id: 'kumusta',    word: 'Kumusta',    english: 'Hello / How are you', description: 'Open hand waves near the face, palm facing outward, slight forward arc.', emoji: '👋', category: 'greetings' },
  { id: 'magandang_umaga', word: 'Magandang Umaga', english: 'Good Morning', description: 'Right hand circles face (maganda) then rises like the sun for umaga.', emoji: '🌅', category: 'greetings' },
  { id: 'salamat',    word: 'Salamat',    english: 'Thank you',    description: 'Flat hand touches chin then moves forward and down, like offering thanks.', emoji: '🙏', category: 'greetings' },
  { id: 'paalam',     word: 'Paalam',     english: 'Goodbye',      description: 'Open palm faces outward, fingers together, hand waves side to side.', emoji: '✋', category: 'greetings' },
  { id: 'oo',         word: 'Oo',         english: 'Yes',          description: 'Closed fist nods up and down, mimicking a head nod.', emoji: '👊', category: 'greetings' },
  { id: 'hindi',      word: 'Hindi',      english: 'No',           description: 'First two fingers extended, tapping repeatedly against the thumb.', emoji: '✌️', category: 'greetings' },

  // Alphabet A–E & Dynamics
  { id: 'letter_a', word: 'A', english: 'Letter A', description: 'Closed fist with thumb resting alongside the fingers, palm facing forward.', emoji: '🅰️', category: 'alphabet', modelLabel: 'a' },
  { id: 'letter_b', word: 'B', english: 'Letter B', description: 'Four fingers extended upward, thumb tucked across the palm.', emoji: '🅱️', category: 'alphabet', modelLabel: 'b' },
  { id: 'letter_c', word: 'C', english: 'Letter C', description: 'Hand curves into a C shape, fingers together, thumb opposite, like holding a cup.', emoji: '©️', category: 'alphabet', modelLabel: 'c' },
  { id: 'letter_d', word: 'D', english: 'Letter D', description: 'Index finger points up, other fingers curve to touch thumb tip, forming a D.', emoji: '🇩', category: 'alphabet', modelLabel: 'd' },
  { id: 'letter_e', word: 'E', english: 'Letter E', description: 'All fingertips curl down to touch the thumb, making a compact fist-like shape.', emoji: '📧', category: 'alphabet', modelLabel: 'e' },
  { id: 'letter_j', word: 'J', english: 'Letter J (Dynamic)', description: 'Draw a J in the air with the pinky finger.', emoji: '🇯', category: 'alphabet', modelLabel: 'j' },
  { id: 'letter_z', word: 'Z', english: 'Letter Z (Dynamic)', description: 'Draw a Z in the air with the index finger.', emoji: '🇿', category: 'alphabet', modelLabel: 'z' },
  { id: 'letter_enye', word: 'Ñ', english: 'Letter Ñ (Dynamic)', description: 'Draw a wavy line (tilde) in the air.', emoji: 'Ñ', category: 'alphabet' },

  // Common Words
  { id: 'tubig',   word: 'Tubig',   english: 'Water',  description: 'W-shaped hand (three fingers extended) taps the chin twice.', emoji: '💧', category: 'common', modelLabel: 'water' },
  { id: 'pagkain', word: 'Pagkain', english: 'Food',   description: 'Bunched fingertips tap the lips repeatedly, like eating.', emoji: '🍽️', category: 'common' },
  { id: 'bahay',   word: 'Bahay',   english: 'House',  description: 'Both hands form a triangle roof shape above the head, fingertips touching.', emoji: '🏠', category: 'common' },
  { id: 'paaralan',word: 'Paaralan',english: 'School', description: 'One flat hand claps on the other twice, like a teacher clapping for attention.', emoji: '🏫', category: 'common' },
  { id: 'araw',    word: 'Araw',    english: 'Day / Sun', description: 'Index finger draws a circle in the air, then hand opens and rises upward.', emoji: '☀️', category: 'common' },

  // Family
  { id: 'nanay',  word: 'Nanay',  english: 'Mother', description: 'Open hand with thumb touching the chin, fingers spread, palm facing left.', emoji: '👩', category: 'family', modelLabel: 'mother' },
  { id: 'tatay',  word: 'Tatay',  english: 'Father', description: 'Open hand with thumb touching the forehead, fingers spread, palm facing left.', emoji: '👨', category: 'family', modelLabel: 'father' },
  { id: 'kapatid',word: 'Kapatid',english: 'Sibling',description: 'Both index fingers side by side, pointing forward, then separate sideways.', emoji: '👫', category: 'family' },
  { id: 'pamilya',word: 'Pamilya',english: 'Family', description: 'Both hands form F handshapes, circle forward and link together at the end.', emoji: '👪', category: 'family' },
  { id: 'anak',   word: 'Anak',   english: 'Child',  description: 'Flat hand lowers palm-down from chest level, indicating small height.', emoji: '🧒', category: 'family' },

  // Feelings
  { id: 'masaya',   word: 'Masaya',   english: 'Happy',   description: 'Both open palms brush upward on the chest repeatedly, face smiling.', emoji: '😊', category: 'feelings' },
  { id: 'malungkot',word: 'Malungkot',english: 'Sad',     description: 'Both open hands slide downward on the face, fingers spread, sad expression.', emoji: '😢', category: 'feelings' },
  { id: 'galit',    word: 'Galit',    english: 'Angry',   description: 'Claw-shaped hand pulls away from the face sharply, showing frustration.', emoji: '😠', category: 'feelings' },
  { id: 'mahal',    word: 'Mahal',    english: 'Love',    description: 'Both arms cross over the chest in a hugging motion, fists closed.', emoji: '❤️', category: 'feelings', modelLabel: 'i love you' },
  { id: 'takot',    word: 'Takot',    english: 'Scared',  description: 'Both flat palms face the body and shake/tremble rapidly, fearful expression.', emoji: '😨', category: 'feelings' },

  // Questions
  { id: 'ano',     word: 'Ano',     english: 'What',   description: 'Index finger waves side to side in front of the body, with a questioning face.', emoji: '❓', category: 'questions' },
  { id: 'sino',    word: 'Sino',    english: 'Who',    description: 'Index finger circles around near the chin, eyebrows raised questioningly.', emoji: '🤔', category: 'questions' },
  { id: 'saan',    word: 'Saan',    english: 'Where',  description: 'Index finger points outward and sweeps side to side, palms up.', emoji: '📍', category: 'questions' },
  { id: 'kailan',  word: 'Kailan',  english: 'When',   description: 'Index finger circles the wrist area (like pointing at a watch), questioning face.', emoji: '🕐', category: 'questions' },
  { id: 'bakit',   word: 'Bakit',   english: 'Why',    description: 'Fingertips touch the forehead then open outward, like a thought expanding.', emoji: '💭', category: 'questions' },
]

// ── Utility ────────────────────────────────────────────────────────────────

export const getSignById = (id) => SIGNS.find((s) => s.id === id)

const pickRandom = (arr, count, exclude = []) => {
  const pool = arr.filter((item) => !exclude.includes(item))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── Units ──────────────────────────────────────────────────────────────────

export const UNITS = [
  {
    id: 'greetings',
    title: 'Greetings',
    description: 'Learn basic Filipino Sign Language greetings',
    icon: '👋',
    color: '#58cc02',
    signs: ['kumusta', 'magandang_umaga', 'salamat', 'paalam', 'oo', 'hindi'],
  },
  {
    id: 'alphabet',
    title: 'Alphabet & Dynamic Signs',
    description: 'Master basic FSL letters and dynamic moving signs (J, Z, Ñ)',
    icon: '🔤',
    color: '#1cb0f6',
    signs: ['letter_a', 'letter_b', 'letter_c', 'letter_d', 'letter_e', 'letter_j', 'letter_z', 'letter_enye'],
  },
  {
    id: 'common',
    title: 'Common Words',
    description: 'Essential everyday words in FSL',
    icon: '💬',
    color: '#ff9600',
    signs: ['tubig', 'pagkain', 'bahay', 'paaralan', 'araw'],
  },
  {
    id: 'family',
    title: 'Family',
    description: 'Signs for family members and relationships',
    icon: '👨‍👩‍👧‍👦',
    color: '#ce82ff',
    signs: ['nanay', 'tatay', 'kapatid', 'pamilya', 'anak'],
  },
  {
    id: 'feelings',
    title: 'Feelings',
    description: 'Express emotions with Filipino Sign Language',
    icon: '❤️',
    color: '#ff4b4b',
    signs: ['masaya', 'malungkot', 'galit', 'mahal', 'takot'],
  },
  {
    id: 'questions',
    title: 'Questions',
    description: 'Ask questions in FSL',
    icon: '❓',
    color: '#ffc800',
    signs: ['ano', 'sino', 'saan', 'kailan', 'bakit'],
  },
]

// ── Exercise Generator ─────────────────────────────────────────────────────

/**
 * Generate exercises for a given unit.
 * Returns an array of exercise objects, each with:
 *   { type, question, correctAnswer, options, signData }
 */
export function generateExercises(unitId) {
  const unit = UNITS.find((u) => u.id === unitId)
  if (!unit) return []

  const unitSigns = unit.signs.map(getSignById).filter(Boolean)
  const otherSigns = SIGNS.filter((s) => !unit.signs.includes(s.id))
  const exercises = []

  // 1. Sign-to-text exercises (show description → pick the word)
  const signsForS2T = pickRandom(unitSigns, 2)
  for (const sign of signsForS2T) {
    const wrongOptions = pickRandom(otherSigns, 3).map((s) => s.word)
    const allOptions = [sign.word, ...wrongOptions].sort(() => Math.random() - 0.5)
    exercises.push({
      type: 'sign-to-text',
      question: `What sign is this?`,
      prompt: sign.description,
      emoji: sign.emoji,
      correctAnswer: sign.word,
      options: allOptions,
      signData: sign,
    })
  }

  // 2. Text-to-sign (show word → pick the description)
  const signsForT2S = pickRandom(unitSigns, 1, signsForS2T)
  for (const sign of signsForT2S) {
    const wrongOptions = pickRandom(otherSigns, 3).map((s) => s.description)
    const allOptions = [sign.description, ...wrongOptions].sort(() => Math.random() - 0.5)
    exercises.push({
      type: 'text-to-sign',
      question: `How do you sign "${sign.word}" (${sign.english})?`,
      correctAnswer: sign.description,
      options: allOptions,
      signData: sign,
    })
  }

  // 3. Match pairs (2 signs ↔ meanings)
  const signsForMatch = pickRandom(unitSigns, 4)
  exercises.push({
    type: 'match-pairs',
    question: 'Match each sign to its meaning',
    pairs: signsForMatch.map((s) => ({ sign: s.emoji + ' ' + s.word, meaning: s.english })),
    signData: signsForMatch,
  })

  // 4. Fill-blank (type the meaning)
  const signsForFill = pickRandom(unitSigns, 1, [...signsForS2T, ...signsForT2S])
  for (const sign of signsForFill) {
    exercises.push({
      type: 'fill-blank',
      question: `Type the English meaning of "${sign.word}"`,
      emoji: sign.emoji,
      prompt: sign.description,
      correctAnswer: sign.english,
      acceptableAnswers: [
        sign.english.toLowerCase(),
        ...sign.english.toLowerCase().split(' / '),
        sign.word.toLowerCase(),
      ],
      signData: sign,
    })
  }

  // 5. Camera practice (if the model supports it)
  const signsWithModel = unitSigns.filter((s) => s.modelLabel)
  if (signsWithModel.length > 0) {
    const signForPractice = pickRandom(signsWithModel, 1)[0]
    exercises.push({
      type: 'practice-sign',
      question: `Show the sign for "${signForPractice.word}" to the camera`,
      emoji: signForPractice.emoji,
      prompt: signForPractice.description,
      correctAnswer: signForPractice.modelLabel,
      signData: signForPractice,
    })
  }

  return exercises.sort(() => Math.random() - 0.5)
}
