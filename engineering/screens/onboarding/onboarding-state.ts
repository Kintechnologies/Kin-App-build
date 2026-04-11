// Kin AI — Onboarding State Management
// Zustand store for collecting data across 5 screens
// Author: Lead Engineer
// Date: 2026-04-02

import { create } from 'zustand'

export interface ParsedSchedulePattern {
  wake_time: string | null
  gym_morning: boolean
  gym_time: string | null
  work_start_time: string | null
  first_meeting_time: string | null
  lunch_break: boolean
  school_pickup_time: string | null
  kids_activities_mentioned: string[]
  typical_dinner_time: string | null
  bedtime_routine_time: string | null
  other_patterns: string[]
  summary: string
}

export interface OnboardingChild {
  name: string
  age: number
  grade: string | null
  allergies: string[] // e.g., ['dairy', 'egg']
}

export interface OnboardingPet {
  name: string
  species: string // 'dog' | 'cat' | 'other'
  breed: string | null
  vetName: string | null
}

export interface OnboardingState {
  // Screen 1: Welcome + Household Setup
  familyName: string
  homeLocation: string

  // Screen 2: Conversational Schedule Intake
  weekdayDescription: string
  schedulePattern: ParsedSchedulePattern | null
  scheduleParsingInProgress: boolean

  // Screen 3: Family Members
  children: OnboardingChild[]
  pets: OnboardingPet[]

  // Screen 4: Budget
  groceryBudget: number

  // Screen 5 state
  briefingPreviewInProgress: boolean
  briefingPreview: string | null
  briefingError: string | null

  // Actions
  setFamilyName: (v: string) => void
  setHomeLocation: (v: string) => void
  setWeekdayDescription: (v: string) => void
  setSchedulePattern: (v: ParsedSchedulePattern | null) => void
  setScheduleParsingInProgress: (v: boolean) => void
  addChild: (child: OnboardingChild) => void
  removeChild: (index: number) => void
  addPet: (pet: OnboardingPet) => void
  removePet: (index: number) => void
  setGroceryBudget: (v: number) => void
  setBriefingPreviewInProgress: (v: boolean) => void
  setBriefingPreview: (v: string | null) => void
  setBriefingError: (v: string | null) => void
  reset: () => void
}

const initialState = {
  familyName: '',
  homeLocation: '',
  weekdayDescription: '',
  schedulePattern: null,
  scheduleParsingInProgress: false,
  children: [],
  pets: [],
  groceryBudget: 720,
  briefingPreviewInProgress: false,
  briefingPreview: null,
  briefingError: null,
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setFamilyName: (v) => set({ familyName: v }),
  setHomeLocation: (v) => set({ homeLocation: v }),
  setWeekdayDescription: (v) => set({ weekdayDescription: v }),
  setSchedulePattern: (v) => set({ schedulePattern: v }),
  setScheduleParsingInProgress: (v) => set({ scheduleParsingInProgress: v }),
  addChild: (child) =>
    set((state) => ({
      children: [...state.children, child],
    })),
  removeChild: (index) =>
    set((state) => ({
      children: state.children.filter((_, i) => i !== index),
    })),
  addPet: (pet) =>
    set((state) => ({
      pets: [...state.pets, pet],
    })),
  removePet: (index) =>
    set((state) => ({
      pets: state.pets.filter((_, i) => i !== index),
    })),
  setGroceryBudget: (v) => set({ groceryBudget: v }),
  setBriefingPreviewInProgress: (v) => set({ briefingPreviewInProgress: v }),
  setBriefingPreview: (v) => set({ briefingPreview: v }),
  setBriefingError: (v) => set({ briefingError: v }),
  reset: () => set(initialState),
}))
