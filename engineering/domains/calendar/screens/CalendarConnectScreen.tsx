// Kin AI — Calendar Connect Screen (Track C1.5)
// UI where parents connect their calendars
// Shown after FVM during onboarding AND accessible from Settings
// Brand Guide v2 compliant
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getCurrentParent } from '../../../lib/auth'
import {
  initiateGoogleCalendarOAuth,
  handleGoogleOAuthCallback,
  importGoogleEvents,
} from '../google-calendar'
import {
  initiateAppleCalendarSetup,
  storeAppleCalendarConnection,
} from '../apple-calendar'
import { connectWorkCalendar, syncWorkCalendar } from '../work-calendar'

// ============================================================================
// TYPES
// ============================================================================

interface CalendarConnectionState {
  provider: 'google' | 'apple' | 'work'
  connected: boolean
  loading: boolean
  error?: string
}

// ============================================================================
// BRAND COLORS
// ============================================================================

const BRAND = {
  background: '#0C0F0A',
  surface: '#141810',
  calendar: '#A07EC8',
  primary: '#7CB87A',
  text: '#F0EDE6',
  textDim: '#9E9B94',
  error: '#E07B5A',
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '200',
    fontStyle: 'italic',
    color: BRAND.text,
    marginBottom: 8,
    fontFamily: 'InstrumentSerif-Italic',
  },
  subtitle: {
    fontSize: 14,
    color: BRAND.textDim,
    lineHeight: 20,
  },
  cardsContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardConnected: {
    borderColor: BRAND.primary,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  cardProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.text,
    marginBottom: 4,
    fontFamily: 'Geist-SemiBold',
  },
  cardDescription: {
    fontSize: 13,
    color: BRAND.textDim,
    marginBottom: 16,
    lineHeight: 18,
  },
  cardStatus: {
    fontSize: 12,
    color: BRAND.primary,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Geist-SemiBold',
  },
  cardStatusError: {
    color: BRAND.error,
  },
  connectButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: BRAND.background,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  disconnectButton: {
    paddingVertical: 8,
  },
  disconnectButtonText: {
    color: BRAND.textDim,
    fontSize: 12,
    fontFamily: 'Geist-Regular',
  },
  readOnlyBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: `${BRAND.calendar}20`,
    borderRadius: 6,
    marginBottom: 12,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    color: BRAND.calendar,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  spinner: {
    marginRight: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: `${BRAND.text}10`,
  },
  skipButton: {
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: BRAND.textDim,
    fontFamily: 'Geist-Regular',
  },
  skipButtonTextUnderline: {
    textDecorationLine: 'underline',
  },
  appleSetupModal: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: `${BRAND.text}20`,
  },
  appleSetupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BRAND.text,
    marginBottom: 16,
    fontFamily: 'Geist-SemiBold',
  },
  appleSetupStep: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: BRAND.calendar,
    paddingVertical: 8,
  },
  appleSetupStepNumber: {
    fontSize: 12,
    color: BRAND.calendar,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Geist-SemiBold',
  },
  appleSetupStepText: {
    fontSize: 13,
    color: BRAND.text,
    lineHeight: 18,
    fontFamily: 'Geist-Regular',
  },
  appleSetupCode: {
    backgroundColor: BRAND.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    fontFamily: 'Courier New',
    fontSize: 12,
    color: BRAND.primary,
  },
  credentialsInput: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: BRAND.textDim,
    marginBottom: 6,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  textInput: {
    backgroundColor: BRAND.background,
    borderWidth: 1,
    borderColor: `${BRAND.text}20`,
    borderRadius: 12,
    padding: 12,
    color: BRAND.text,
    marginBottom: 12,
    fontFamily: 'Geist-Regular',
    fontSize: 13,
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: BRAND.primary,
  },
  actionButtonSecondary: {
    backgroundColor: `${BRAND.text}10`,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  actionButtonTextPrimary: {
    color: BRAND.background,
  },
  actionButtonTextSecondary: {
    color: BRAND.text,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

export default function CalendarConnectScreen({ onComplete }: { onComplete?: () => void }) {
  const [parent, setParent] = useState(null)
  const [connections, setConnections] = useState<Record<string, CalendarConnectionState>>({
    google: { provider: 'google', connected: false, loading: false },
    apple: { provider: 'apple', connected: false, loading: false },
    work: { provider: 'work', connected: false, loading: false },
  })
  const [showAppleSetup, setShowAppleSetup] = useState(false)
  const [appleEmail, setAppleEmail] = useState('')
  const [applePassword, setApplePassword] = useState('')

  React.useEffect(() => {
    loadParent()
  }, [])

  const loadParent = async () => {
    const currentParent = await getCurrentParent()
    setParent(currentParent)
  }

  // ========== GOOGLE CALENDAR ==========

  const handleGoogleConnect = async () => {
    if (!parent) return

    setConnections((prev) => ({
      ...prev,
      google: { ...prev.google, loading: true, error: undefined },
    }))

    try {
      const result = await initiateGoogleCalendarOAuth(parent.id, false)

      if (result.success && result.connectionId) {
        // Import events
        const importResult = await importGoogleEvents(result.connectionId)

        if (importResult.success) {
          setConnections((prev) => ({
            ...prev,
            google: {
              ...prev.google,
              connected: true,
              loading: false,
            },
          }))
        } else {
          throw new Error(importResult.error || 'Failed to import events')
        }
      } else {
        throw new Error(result.error || 'OAuth failed')
      }
    } catch (error) {
      setConnections((prev) => ({
        ...prev,
        google: {
          ...prev.google,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }))

      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Could not connect Google Calendar'
      )
    }
  }

  // ========== APPLE CALENDAR ==========

  const handleAppleSetup = () => {
    setShowAppleSetup(true)
  }

  const handleAppleConnect = async () => {
    if (!parent || !appleEmail || !applePassword) {
      Alert.alert('Missing Info', 'Please enter your iCloud email and app-specific password')
      return
    }

    setConnections((prev) => ({
      ...prev,
      apple: { ...prev.apple, loading: true, error: undefined },
    }))

    try {
      const result = await storeAppleCalendarConnection(parent.id, appleEmail, applePassword)

      if (result.success && result.connectionId) {
        setConnections((prev) => ({
          ...prev,
          apple: {
            ...prev.apple,
            connected: true,
            loading: false,
          },
        }))

        setShowAppleSetup(false)
        setAppleEmail('')
        setApplePassword('')
      } else {
        throw new Error(result.error || 'Failed to connect')
      }
    } catch (error) {
      setConnections((prev) => ({
        ...prev,
        apple: {
          ...prev.apple,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }))

      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Could not connect Apple Calendar'
      )
    }
  }

  // ========== WORK CALENDAR ==========

  const handleWorkConnect = async () => {
    if (!parent) return

    setConnections((prev) => ({
      ...prev,
      work: { ...prev.work, loading: true, error: undefined },
    }))

    try {
      const result = await connectWorkCalendar(parent.id)

      if (result.success && result.connectionId) {
        const syncResult = await syncWorkCalendar(result.connectionId)

        if (syncResult.success) {
          setConnections((prev) => ({
            ...prev,
            work: {
              ...prev.work,
              connected: true,
              loading: false,
            },
          }))
        } else {
          throw new Error(syncResult.error || 'Failed to sync work calendar')
        }
      } else {
        throw new Error(result.error || 'OAuth failed')
      }
    } catch (error) {
      setConnections((prev) => ({
        ...prev,
        work: {
          ...prev.work,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }))

      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Could not connect work calendar'
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect your calendar</Text>
          <Text style={styles.subtitle}>
            So tomorrow's briefing includes your real schedule.
          </Text>
        </View>

        {/* Calendar Connection Cards */}
        <View style={styles.cardsContainer}>
          {/* Personal Google Calendar */}
          <View
            style={[styles.card, connections.google.connected && styles.cardConnected]}
          >
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={styles.cardProvider}>Personal Google Calendar</Text>
            <Text style={styles.cardDescription}>Your personal schedule</Text>

            {connections.google.connected ? (
              <>
                <Text style={styles.cardStatus}>✓ Connected</Text>
                <TouchableOpacity style={styles.disconnectButton}>
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleGoogleConnect}
                disabled={connections.google.loading}
              >
                {connections.google.loading ? (
                  <ActivityIndicator color={BRAND.background} />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}

            {connections.google.error && (
              <Text style={[styles.cardStatus, styles.cardStatusError]}>
                Error: {connections.google.error}
              </Text>
            )}
          </View>

          {/* Apple Calendar */}
          <View style={[styles.card, connections.apple.connected && styles.cardConnected]}>
            <Text style={styles.cardIcon}>🍎</Text>
            <Text style={styles.cardProvider}>Apple Calendar</Text>
            <Text style={styles.cardDescription}>iCloud events</Text>

            {connections.apple.connected ? (
              <>
                <Text style={styles.cardStatus}>✓ Connected</Text>
                <TouchableOpacity style={styles.disconnectButton}>
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleAppleSetup}
                disabled={connections.apple.loading}
              >
                {connections.apple.loading ? (
                  <ActivityIndicator color={BRAND.background} />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}

            {connections.apple.error && (
              <Text style={[styles.cardStatus, styles.cardStatusError]}>
                Error: {connections.apple.error}
              </Text>
            )}
          </View>

          {/* Work Calendar */}
          <View style={[styles.card, connections.work.connected && styles.cardConnected]}>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyBadgeText}>READ-ONLY</Text>
            </View>
            <Text style={styles.cardIcon}>💼</Text>
            <Text style={styles.cardProvider}>Work Calendar</Text>
            <Text style={styles.cardDescription}>
              Kin reads your work schedule but never touches it
            </Text>

            {connections.work.connected ? (
              <>
                <Text style={styles.cardStatus}>✓ Connected</Text>
                <TouchableOpacity style={styles.disconnectButton}>
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleWorkConnect}
                disabled={connections.work.loading}
              >
                {connections.work.loading ? (
                  <ActivityIndicator color={BRAND.background} />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}

            {connections.work.error && (
              <Text style={[styles.cardStatus, styles.cardStatusError]}>
                Error: {connections.work.error}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer - Skip Option */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
          <Text style={styles.skipButtonText}>
            <Text style={styles.skipButtonTextUnderline}>Skip for now</Text> — connect calendars
            later in Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Apple Setup Modal */}
      {showAppleSetup && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#00000099' }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
            <View style={styles.appleSetupModal}>
              <Text style={styles.appleSetupTitle}>Connect Apple Calendar</Text>

              <View style={styles.appleSetupStep}>
                <Text style={styles.appleSetupStepNumber}>Step 1</Text>
                <Text style={styles.appleSetupStepText}>
                  Go to Apple ID Settings on your iPhone
                </Text>
              </View>

              <View style={styles.appleSetupStep}>
                <Text style={styles.appleSetupStepNumber}>Step 2</Text>
                <Text style={styles.appleSetupStepText}>
                  Tap "Password & Security" → "App-Specific Passwords"
                </Text>
              </View>

              <View style={styles.appleSetupStep}>
                <Text style={styles.appleSetupStepNumber}>Step 3</Text>
                <Text style={styles.appleSetupStepText}>
                  Generate a password for "Kin Calendar"
                </Text>
                <Text style={styles.appleSetupCode}>16-char-pass-code</Text>
              </View>

              <View style={styles.credentialsInput}>
                <Text style={styles.inputLabel}>iCloud Email</Text>
                <Text
                  style={styles.textInput}
                  onChangeText={setAppleEmail}
                  value={appleEmail}
                  placeholder="your-email@icloud.com"
                  placeholderTextColor={BRAND.textDim}
                />

                <Text style={styles.inputLabel}>App-Specific Password</Text>
                <Text
                  style={styles.textInput}
                  onChangeText={setApplePassword}
                  value={applePassword}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  placeholderTextColor={BRAND.textDim}
                  secureTextEntry
                />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => setShowAppleSetup(false)}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleAppleConnect}
                  disabled={connections.apple.loading}
                >
                  {connections.apple.loading ? (
                    <ActivityIndicator color={BRAND.background} />
                  ) : (
                    <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                      Connect
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
