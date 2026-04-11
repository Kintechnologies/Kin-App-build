// Kin AI — Onboarding Screen 2: Schedule Intake
// Conversational intake of typical weekday schedule
// Author: Lead Engineer
// Date: 2026-04-02

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  Layout,
} from 'react-native-reanimated'
import Anthropic from '@anthropic-ai/sdk'
import { useOnboardingStore, ParsedSchedulePattern } from './onboarding-state'

interface Screen2Props {
  onContinue: () => void
}

type ScreenState = 'input' | 'loading' | 'confirmation'

const anthropic = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
})

export const ScheduleIntakeScreen: React.FC<Screen2Props> = ({ onContinue }) => {
  const weekdayDescription = useOnboardingStore((s) => s.weekdayDescription)
  const schedulePattern = useOnboardingStore((s) => s.schedulePattern)
  const setWeekdayDescription = useOnboardingStore((s) => s.setWeekdayDescription)
  const setSchedulePattern = useOnboardingStore((s) => s.setSchedulePattern)

  const [screenState, setScreenState] = useState<ScreenState>('input')
  const [error, setError] = useState<string | null>(null)

  const isInputValid = weekdayDescription.trim().length > 20

  const handleParseSchedule = async () => {
    setError(null)
    setScreenState('loading')

    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a schedule intake parser for Kin, an AI family assistant. Extract the following fields from the user's description of their typical weekday. Return ONLY valid JSON with these fields (use null if not mentioned):

{
  "wake_time": "HH:MM" | null,
  "gym_morning": boolean,
  "gym_time": "HH:MM" | null,
  "work_start_time": "HH:MM" | null,
  "first_meeting_time": "HH:MM" | null,
  "lunch_break": boolean,
  "school_pickup_time": "HH:MM" | null,
  "kids_activities_mentioned": string[],
  "typical_dinner_time": "HH:MM" | null,
  "bedtime_routine_time": "HH:MM" | null,
  "other_patterns": string[],
  "summary": "1-2 sentence warm summary of their day, as if Kin were confirming what it heard"
}

User input: ${weekdayDescription}`,
          },
        ],
      })

      const content = message.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected API response type')
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse schedule data')
      }

      const parsed: ParsedSchedulePattern = JSON.parse(jsonMatch[0])
      setSchedulePattern(parsed)
      setScreenState('confirmation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse schedule')
      setScreenState('input')
    }
  }

  const handleConfirmSchedule = () => {
    if (schedulePattern) {
      onContinue()
    }
  }

  const handleEditSchedule = () => {
    setScreenState('input')
    setSchedulePattern(null)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {screenState === 'input' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.content}
          >
            <Text style={styles.header}>Tell me about a typical weekday.</Text>
            <Text style={styles.subtext}>
              Start with when you wake up. Include work, kids, gym — anything that happens
              regularly.
            </Text>

            <View style={styles.spacing} />

            <TextInput
              style={styles.textArea}
              placeholder="Wake up at 6, hit the gym before work, first meeting at 9:30, pick up the kids at 3:45..."
              placeholderTextColor="rgba(240, 237, 230, 0.4)"
              multiline
              value={weekdayDescription}
              onChangeText={setWeekdayDescription}
              textAlignVertical="top"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.spacing} />

            <TouchableOpacity
              style={[styles.button, !isInputValid && styles.buttonDisabled]}
              onPress={handleParseSchedule}
              disabled={!isInputValid || screenState === 'loading'}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Kin reads this once to understand your rhythm. You can change anything later.
            </Text>
          </Animated.View>
        )}

        {screenState === 'loading' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.loadingContainer}
          >
            <Animated.View
              style={[
                styles.wordmarkLoading,
                {
                  opacity: 0.6,
                },
              ]}
            >
              <Text style={styles.wordmark}>kin</Text>
            </Animated.View>
            <Text style={styles.loadingText}>Building your schedule profile...</Text>
          </Animated.View>
        )}

        {screenState === 'confirmation' && schedulePattern && (
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            layout={Layout}
            style={styles.content}
          >
            <Text style={styles.header}>Perfect. That's what I heard.</Text>

            <View style={styles.spacing} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{schedulePattern.summary}</Text>
            </View>

            <View style={styles.spacing} />

            <TouchableOpacity
              style={styles.button}
              onPress={handleConfirmSchedule}
            >
              <Text style={styles.buttonText}>That's right →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleEditSchedule}
            >
              <Text style={styles.linkText}>Let me fix that</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0C0F0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
  header: {
    fontSize: 28,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    lineHeight: 20,
  },
  spacing: {
    height: 24,
  },
  textArea: {
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.2)',
  },
  button: {
    width: '100%',
    backgroundColor: '#7CB87A',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#0C0F0A',
  },
  note: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.5)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  wordmarkLoading: {
    marginBottom: 24,
  },
  wordmark: {
    fontSize: 54,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    letterSpacing: -0.5,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
  },
  summaryCard: {
    backgroundColor: '#141810',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#7CB87A',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    lineHeight: 24,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#7CB87A',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: '#E07B5A',
    marginTop: 12,
  },
}
