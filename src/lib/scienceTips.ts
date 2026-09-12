/**
 * Habit template library (seed data from project-brief.md).
 * Each template carries a `scienceTag` naming the evidence/framework it comes
 * from, stored on the habit row so the UI can show "why this works".
 */
import type { Difficulty } from './points'

export type HabitType = 'habit' | 'daily' | 'todo'
export type Schedule = 'daily' | 'weekdays' | 'weekly'

export interface HabitTemplate {
  name: string
  type: HabitType
  difficulty: Difficulty
  schedule: Schedule
  scienceTag: string
  tip: string
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    name: 'Meditation',
    type: 'daily',
    difficulty: 'easy',
    schedule: 'daily',
    scienceTag: 'Fogg tiny habit',
    tip: 'Fallback on busy days: three slow breaths still counts. Consistency beats duration.',
  },
  {
    name: 'Metta (loving-kindness) meditation',
    type: 'daily',
    difficulty: 'easy',
    schedule: 'daily',
    scienceTag: 'Metta meditation studies',
    tip: 'Short loving-kindness sessions are associated with increased positive affect.',
  },
  {
    name: 'Gratitude journal — 3 items',
    type: 'daily',
    difficulty: 'trivial',
    schedule: 'daily',
    scienceTag: 'gratitude RCT meta-analysis',
    tip: 'Meta-analyses of gratitude interventions show a small-to-moderate positive effect on wellbeing.',
  },
  {
    name: 'Sleep consistency (same bedtime)',
    type: 'daily',
    difficulty: 'medium',
    schedule: 'daily',
    scienceTag: 'sleep regularity research',
    tip: 'Regular sleep timing matters as much as total hours for daytime energy.',
  },
  {
    name: 'Movement / exercise',
    type: 'daily',
    difficulty: 'medium',
    schedule: 'daily',
    scienceTag: 'physical activity guidelines',
    tip: 'Any movement counts; a 10-minute walk is a valid completion.',
  },
  {
    name: 'Screen-time limit',
    type: 'daily',
    difficulty: 'hard',
    schedule: 'daily',
    scienceTag: 'digital wellbeing studies',
    tip: 'Set a concrete cutoff (e.g. no phone after 22:00) rather than a vague "less".',
  },
]
