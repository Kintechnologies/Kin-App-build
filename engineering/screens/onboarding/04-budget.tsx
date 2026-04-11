// Kin AI — Onboarding Screen 4: Budget Baseline
// Single question: monthly grocery budget
// Author: Lead Engineer
// Date: 2026-04-02

import React from 'react'
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

interface Screen4Props {
  onContinue: () => void
}

export const BudgetScreen: React.FC<Screen4Props> = ({ onContinue }) => {
  const groceryBudget = useOnboardingStore((s) => s.groceryBudget)
  const setGroceryBudget = useOnboardingStore((s) => s.setGroceryBudget)

  const budgetString = groceryBudget > 0 ? groceryBudget.toString() : ''

  const handleBudgetChange = (text: string) => {
    const num = parseInt(text, 10) || 0
    if (num >= 0) {
      setGroceryBudget(num)
    }
  }

  const handleContinue = () => {
    const finalBudget = groceryBudget > 0 ? groceryBudget : 720
    setGroceryBudget(finalBudget)
    onContinue()
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
          <Text style={styles.header}>One quick money question.</Text>

          <Text style={styles.subtext}>
            Kin uses this to plan meals within your budget and flag when you're getting
            close.
          </Text>

          <View style={styles.spacing} />

          {/* Budget Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="720"
              placeholderTextColor="rgba(240, 237, 230, 0.4)"
              value={budgetString}
              onChangeText={handleBudgetChange}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <Text style={styles.budgetSuffix}>/month on groceries</Text>
          </View>

          <Text style={styles.note}>
            You can set budgets for other categories later.
          </Text>

          <View style={styles.spacing} />

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>I'm ready →</Text>
          </TouchableOpacity>

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>
            Your budget data is private. Your partner sees category totals, not individual
            purchases.
          </Text>
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
    width: '100%',
    alignItems: 'center',
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
    marginBottom: 0,
  },
  spacing: {
    height: 32,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 40,
    fontFamily: 'Geist-SemiBold',
    color: '#D4A843',
    marginRight: 4,
  },
  budgetInput: {
    fontSize: 40,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    minWidth: 100,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#7CB87A',
    paddingBottom: 4,
  },
  budgetSuffix: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    marginLeft: 8,
  },
  note: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.5)',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#7CB87A',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#0C0F0A',
  },
  privacyNote: {
    fontSize: 11,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.4)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
  },
}
