import { OpenWhenMessage } from '../../core/models';

/** Shown when the API is unavailable so envelopes are never empty. */
export const OPEN_WHEN_FALLBACK: OpenWhenMessage[] = [
  {
    id: 1,
    envelopeLabel: "Open when you're smiling",
    message:
      "I love that smile. Keep it — the world needs more of it. And so do I.",
    displayOrder: 1
  },
  {
    id: 2,
    envelopeLabel: "Open when you're sad",
    message:
      "Hey. It's okay to not be okay. I'm here, always. This feeling will pass, but my love for you won't.",
    displayOrder: 2
  },
  {
    id: 3,
    envelopeLabel: 'Open when you miss me',
    message:
      "I miss you too. Right now. Close your eyes — I'm sending you the biggest hug across whatever distance is between us.",
    displayOrder: 3
  },
  {
    id: 4,
    envelopeLabel: "Open when you've had a difficult day",
    message:
      "You survived today. That's enough. Rest now. Tomorrow doesn't need your energy tonight — you do.",
    displayOrder: 4
  },
  {
    id: 5,
    envelopeLabel: "Open when you can't sleep",
    message:
      "Count stars, not worries. I'm probably awake too, thinking about how lucky I am. Sweet dreams, beautiful.",
    displayOrder: 5
  },
  {
    id: 6,
    envelopeLabel: 'Open when you need to remember how special you are',
    message:
      "You are rare. You are valued. You are loved beyond measure. Never forget that — especially on the days you doubt it.",
    displayOrder: 6
  }
];
