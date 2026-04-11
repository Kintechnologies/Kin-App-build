// Kin AI — Onboarding Screen 1: Welcome + Household Setup
// Collects family name and home location
// Author: Lead Engineer
// Date: 2026-04-02

import React, { useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useOnboardingStore } from './onboarding-state'

interface Screen1Props {
  onContinue: () => void
}

export const WelcomeScreen: React.FC<Screen1Props> = ({ onContinue }) => {
  const familyName = useOnboardingStore((s) => s.familyName)
  const homeLocation = useOnboardingStore((s) => s.homeLocation)
  const setFamilyName = useOnboardingStore((s) => s.setFamilyName)
  const setHomeLocation = useOnboardingStore((s) => s.setHomeLocation)

  const isValid = familyName.trim().length > 0 && homeLocation.trim().length > 0

  const handleContinue = () => {
    if (isValid) {
      onContinue()
    }
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
        <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
          {/* Wordmark */}
          <Text style={styles.wordmark}>kin</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>The Mental Load, Handled.</Text>

          {/* Spacing */}
          <View style={{ height: 48 }} />

          {/* Family Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's your family name?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ford"
              placeholderTextColor="rgba(240, 237, 230, 0.4)"
              value={familyName}
              onChangeText={setFamilyName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Home City/Zip Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your city or zip code?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Columbus, OH"
              placeholderTextColor="rgba(240, 237, 230, 0.4)"
              value={homeLocation}
              onChangeText={setHomeLocation}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          {/* Spacing */}
          <View style={{ height: 32 }} />

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={styles.buttonText}>Let's go →</Text>
          </TouchableOpacity>

          {/* Privacy Note */}
          <Text style={styles.note}>7-day free trial · No credit card needed</Text>
        </Animated.View>
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
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 54,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    marginBottom: 0,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0)',
  },
  button: {
    width: '100%',
    backgroundColor: '#7CB87A',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  },
}
