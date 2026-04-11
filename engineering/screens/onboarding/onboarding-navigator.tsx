// Kin AI — Onboarding Navigator
// React Navigation stack for the 5-screen onboarding flow
// Author: Lead Engineer
// Date: 2026-04-02

import React, { useState } from 'react'
import { View, Text } from 'react-native'
import {
  NavigationContainer,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native'
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
import { WelcomeScreen } from './01-welcome'
import { ScheduleIntakeScreen } from './02-schedule-intake'
import { FamilyScreen } from './03-family'
import { BudgetScreen } from './04-budget'
import { FVMScreen } from './05-fvm'

export interface OnboardingParamList {
  Welcome: undefined
  ScheduleIntake: undefined
  Family: undefined
  Budget: undefined
  FVM: undefined
}

const Stack = createNativeStackNavigator<OnboardingParamList>()

interface OnboardingNavigatorProps {
  onComplete: (userId: string, parentId: string, householdId: string) => void
  onError?: (error: string) => void
}

export const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({
  onComplete,
  onError,
}) => {
  const [screenIndex, setScreenIndex] = useState(0)
  const totalScreens = 5

  const currentProgress = ((screenIndex + 1) / totalScreens) * 100

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <ProgressIndicator
              current={screenIndex + 1}
              total={totalScreens}
            />
          ),
          headerLeft: () => null,
          headerRight: () => null,
          animationEnabled: true,
          cardStyle: {
            backgroundColor: '#0C0F0A',
          },
        }}
      >
        <Stack.Screen
          name="Welcome"
          options={{
            headerShown: false,
          }}
          listeners={{
            focus: () => setScreenIndex(0),
          }}
        >
          {({ navigation }) => (
            <WelcomeScreen
              onContinue={() => {
                setScreenIndex(1)
                navigation.navigate('ScheduleIntake')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="ScheduleIntake"
          options={{
            headerTitle: () => (
              <ProgressIndicator current={2} total={totalScreens} />
            ),
          }}
          listeners={{
            focus: () => setScreenIndex(1),
          }}
        >
          {({ navigation }) => (
            <ScheduleIntakeScreen
              onContinue={() => {
                setScreenIndex(2)
                navigation.navigate('Family')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="Family"
          options={{
            headerTitle: () => (
              <ProgressIndicator current={3} total={totalScreens} />
            ),
          }}
          listeners={{
            focus: () => setScreenIndex(2),
          }}
        >
          {({ navigation }) => (
            <FamilyScreen
              onContinue={() => {
                setScreenIndex(3)
                navigation.navigate('Budget')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="Budget"
          options={{
            headerTitle: () => (
              <ProgressIndicator current={4} total={totalScreens} />
            ),
          }}
          listeners={{
            focus: () => setScreenIndex(3),
          }}
        >
          {({ navigation }) => (
            <BudgetScreen
              onContinue={() => {
                setScreenIndex(4)
                navigation.navigate('FVM')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="FVM"
          options={{
            headerTitle: () => (
              <ProgressIndicator current={5} total={totalScreens} />
            ),
          }}
          listeners={{
            focus: () => setScreenIndex(4),
          }}
        >
          {({ navigation }) => (
            <FVMScreen
              onComplete={(userId, parentId, householdId) => {
                onComplete(userId, parentId, householdId)
              }}
              onError={(error) => {
                if (onError) {
                  onError(error)
                }
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}

interface ProgressIndicatorProps {
  current: number
  total: number
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.progressDot,
            idx < current && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  )
}

const styles = {
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(124, 184, 122, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#7CB87A',
  },
}
