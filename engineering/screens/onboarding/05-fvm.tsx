// Kin AI — Onboarding Screen 5: First Value Moment
// Generates preview briefing and creates account
// Author: Lead Engineer
// Date: 2026-04-02

import React, { useState, useEffect } from 'react'
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
  SlideInUp,
  SlideOutDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import Anthropic from '@anthropic-ai/sdk'
import * as Notification from 'expo-notifications'
import { signUp } from '../../lib/auth'
import { saveOnboardingData } from './save-onboarding'
import { useOnboardingStore } from './onboarding-state'

interface Screen5Props {
  onComplete: (userId: string, parentId: string, householdId: string) => void
  onError: (error: string) => void
}

type ScreenState = 'preview' | 'loading' | 'account'

const anthropic = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
})

export const FVMScreen: React.FC<Screen5Props> = ({ onComplete, onError }) => {
  const state = useOnboardingStore()
  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [briefing, setBriefing] = useState<string | null>(null)
  const [briefingError, setBriefingError] = useState<string | null>(null)

  // Account form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  // Animation values
  const cardOpacity = useSharedValue(0)
  const cardTranslate = useSharedValue(40)

  // Generate briefing on mount
  useEffect(() => {
    const generateBriefing = async () => {
      try {
        // Artificial delay so moment feels earned
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const scheduleContext = state.schedulePattern?.summary || 'A typical family schedule'
        const childrenContext = state.children
          .map((c) => `${c.name} (age ${c.age}${c.allergies.length > 0 ? `, allergies: ${c.allergies.join(', ')}` : ''})`)
          .join(', ') || 'No children added'
        const petsContext = state.pets.map((p) => `${p.name} the ${p.species}`).join(', ') || 'No pets'

        const prompt = `You are Kin, generating a preview morning briefing for a new user who just onboarded. They've provided the following information:

Family: ${state.familyName}
Location: ${state.homeLocation}
Schedule: ${scheduleContext}
Children: ${childrenContext}
Pets: ${petsContext}
Grocery Budget: $${state.groceryBudget}/month

Generate a warm, specific morning briefing (3-5 sentences) that shows what this family's daily Kin briefing will look like. Make it personal using their real data. Include:
1. Something about their schedule timing
2. A note about family coordination if they have kids
3. A meal/dinner suggestion respecting any allergies
4. A budget-aware note

Make it feel like a smart friend texting, not a generic app notification.`

        const message = await anthropic.messages.create({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        })

        const content = message.content[0]
        if (content.type !== 'text') {
          throw new Error('Unexpected API response type')
        }

        setBriefing(content.text)
        setScreenState('account')

        // Animate card in
        cardOpacity.value = withTiming(1, { duration: 600 })
        cardTranslate.value = withTiming(0, { duration: 600 })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate briefing'
        setBriefingError(errorMsg)
        onError(errorMsg)
      }
    }

    generateBriefing()
  }, [])

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }))

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setAuthError('Please fill in all fields')
      return
    }

    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters')
      return
    }

    setAuthError(null)
    setIsCreatingAccount(true)

    try {
      // Create auth user and household
      const signUpResult = await signUp({
        email,
        password,
        name,
        isPartner1: true,
        familyName: state.familyName,
      })

      const userId = signUpResult.household.id // Will be overridden by actual user ID from auth

      // Get the actual user ID from auth
      const { data: authData } = await supabase.auth.getUser()
      const actualUserId = authData.user?.id

      if (!actualUserId) {
        throw new Error('Failed to get user ID')
      }

      // Save all onboarded data
      const saveResult = await saveOnboardingData(
        state,
        actualUserId,
        name,
        email
      )

      if (!saveResult.success && saveResult.errors.length > 0) {
        console.warn('Some data failed to save:', saveResult.errors)
      }

      // Request push notification permission
      await requestPushNotificationPermission()

      // Complete flow
      onComplete(actualUserId, saveResult.parentId, saveResult.householdId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create account'
      setAuthError(errorMsg)
      setIsCreatingAccount(false)
    }
  }

  const handleSignIn = () => {
    // Navigate to sign-in flow
    // This would be handled by the parent navigator
    console.log('Sign in with existing account')
  }

  const handleGoogleSignUp = async () => {
    // Implement Google OAuth
    console.log('Sign up with Google')
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
        {screenState === 'loading' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.loadingContainer}
          >
            <Text style={styles.wordmark}>kin</Text>
            <Text style={styles.loadingText}>Building your first briefing...</Text>
          </Animated.View>
        )}

        {screenState === 'account' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.content}
            layout={Layout}
          >
            {/* Briefing Card */}
            {briefing && (
              <>
                <Animated.View
                  style={[styles.briefingCard, cardAnimatedStyle]}
                >
                  <Text style={styles.tomorrowLabel}>Tomorrow morning</Text>
                  <Text style={styles.briefingText}>{briefing}</Text>
                </Animated.View>

                <View style={styles.spacing} />

                <Text style={styles.briefingCaption}>
                  This is what every morning looks like.
                </Text>

                <View style={styles.spacing} />
              </>
            )}

            {briefingError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{briefingError}</Text>
              </View>
            )}

            {/* Account Creation Form */}
            <Text style={styles.formHeader}>Let's get you set up.</Text>

            <View style={styles.spacing} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Austin"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isCreatingAccount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isCreatingAccount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isCreatingAccount}
              />
            </View>

            {authError && (
              <Text style={styles.authErrorText}>{authError}</Text>
            )}

            <View style={styles.spacing} />

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.button, isCreatingAccount && styles.buttonDisabled]}
              onPress={handleCreateAccount}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? (
                <ActivityIndicator color="#0C0F0A" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
              disabled={isCreatingAccount}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Privacy Note */}
            <Text style={styles.note}>
              7-day free trial · Cancel anytime · No credit card
            </Text>

            <View style={styles.spacing} />

            {/* Sign In Link */}
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

async function requestPushNotificationPermission() {
  try {
    const { status } = await Notification.getPermissionsAsync()

    if (status !== 'granted') {
      const { status: newStatus } = await Notification.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })

      if (newStatus === 'granted') {
        console.log('Push notification permission granted')
      }
    }
  } catch (error) {
    console.warn('Error requesting push notification permission:', error)
  }
}

// Dummy Supabase import for the example (would be from actual lib)
const supabase = null as any

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0C0F0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  wordmark: {
    fontSize: 54,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
  },
  briefingCard: {
    backgroundColor: '#141810',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7CB87A',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  tomorrowLabel: {
    fontSize: 11,
    fontFamily: 'GeistMono-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  briefingText: {
    fontSize: 16,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
    lineHeight: 24,
  },
  briefingCaption: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    textAlign: 'center',
  },
  spacing: {
    height: 24,
  },
  formHeader: {
    fontSize: 20,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.2)',
  },
  button: {
    width: '100%',
    backgroundColor: '#7CB87A',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#0C0F0A',
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#141810',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.3)',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
  },
  note: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.5)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: '#7CB87A',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(224, 123, 90, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: '#E07B5A',
  },
  authErrorText: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: '#E07B5A',
    marginTop: -16,
    marginBottom: 16,
  },
}
