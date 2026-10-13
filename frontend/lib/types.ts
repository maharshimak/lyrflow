export type LyrFlowLanguage =
  | "ko"
  | "ja"
  | "en"
  | "mixed_ko"
  | "mixed_ja"
  | "mixed_ko_ja";

export type Emotion =
  | "hype"
  | "sad"
  | "aggressive"
  | "soft"
  | "playful"
  | "longing"
  | "empowering"
  | "neutral";

export type PracticePriority = "low" | "medium" | "high";

export type PhonemeMapItem = {
  syllable_index: number;
  expected_phonemes: string[];
  expected_romaji: string;
};

export type LyricLine = {
  id?: number | string;
  index: number;
  line: string;
  language: LyrFlowLanguage;
  romanized: string;
  translation: string;
  syllables: string;
  confidence: "high" | "low";
  emotion: Emotion | string;
  difficulty_score: number;
  practice_priority: PracticePriority | string;
  phoneme_hints: string;
  phoneme_map: PhonemeMapItem[] | any[];
  is_repeated?: boolean;
  line_energy?: "low" | "medium" | "high" | string;
  vocal_arc?: "rising" | "falling" | "sustained" | "staccato" | string;
  breath_coach?: string;
};

export type EmotionArcPoint = {
  index: number;
  emotion: string;
  value: number;
};

export type PracticeSessionItem = {
  index: number;
  line: string;
  romanized: string;
  difficulty_score: number;
  practice_priority: string;
  emotion: string;
  vocal_arc: string;
  breath_coach: string;
};

export type ProcessSongResponse = {
  title?: string;
  artist?: string;
  language?: string;
  total_lines?: number;
  avg_difficulty?: number;
  singability_score?: number;
  dominant_emotion?: string;
  lyrics: LyricLine[];
  error?: string;
  emotion_arc?: EmotionArcPoint[];
  practice_session?: PracticeSessionItem[];
  hardest_line?: {
    line: string;
    romanized: string;
    difficulty_score: number;
    phoneme_hints: string;
    vocal_arc: string;
    breath_coach: string;
  };
  emotion_distribution?: Record<string, number>;
  vocal_arc_distribution?: Record<string, number>;
  high_priority_lines?: string[];
  high_priority_count?: number;
  language_distribution?: Record<string, number>;
  word_count?: number;
  avg_word_length?: number;
  repeated_lines_count?: number;
  translation_lang?: "en" | "fr";
};
