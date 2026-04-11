// Kin AI — Push Notifications Module
// Handles registration, local testing, and notification routing
// Author: Lead Engineer
// Date: 2026-04-02

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { supabase } from './supabase'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure notification behavior
 * Run this once at app startup
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })

  // Set up notification channels for Android
  if (Device.osName === 'Android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })

    Notifications.setNotificationChannelAsync('briefings', {
      name: 'Morning Briefings',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register for push notifications and store token
 * Must be called during app initialization
 */
export async function registerForPushNotifications(parentId: string): Promise<string | null> {
  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices')
      return null
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permission')
      return null
    }

    // Get push token from Expo
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    if (!projectId) {
      console.error('Missing EAS project ID')
      return null
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    const pushToken = token.data

    // Get device ID
    const deviceId = await Device.getDeviceIdAsync()

    // Store token in database
    const { error } = await supabase.from('push_tokens').upsert(
      [
        {
          parent_id: parentId,
          expo_push_token: pushToken,
          device_id: deviceId,
        },
      ],
      { onConflict: 'parent_id' }
    )

    if (error) {
      console.error('Error storing push token:', error)
      return null
    }

    console.log('Push token registered:', pushToken)
    return pushToken
  } catch (error) {
    console.error('Error registering for push notifications:', error)
    return null
  }
}

/**
 * Update push token (call if token changes)
 */
export async function updatePushToken(parentId: string, newToken: string): Promise<void> {
  try {
    const deviceId = await Device.getDeviceIdAsync()

    const { error } = await supabase
      .from('push_tokens')
      .update({
        expo_push_token: newToken,
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      })
      .eq('parent_id', parentId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating push token:', error)
    throw error
  }
}

/**
 * Remove push token (call on sign-out)
 */
export async function removePushToken(parentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('parent_id', parentId)

    if (error) throw error
  } catch (error) {
    console.error('Error removing push token:', error)
    throw error
  }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

/**
 * Set up notification listeners
 * Call this once at app startup
 */
export function setupNotificationHandlers(onNotificationReceived: (notification: any) => void) {
  // Handle notification when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received (foreground):', notification)
    onNotificationReceived(notification)
  })

  // Handle notification when user taps on it
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { notification } = response

    console.log('Notification tapped:', notification)

    // Route based on notification data type
    const { data } = notification.request.content

    if (data?.type === 'morning_briefing') {
      // Open briefing in app
      // Navigate to home screen or briefing detail
    } else if (data?.type === 'calendar_event') {
      // Open calendar for event
    } else if (data?.type === 'budget_alert') {
      // Open budget tracker
    } else if (data?.type === 'family_reminder') {
      // Open family todo
    }

    onNotificationReceived(notification)
  })

  return () => {
    foregroundSubscription.remove()
    responseSubscription.remove()
  }
}

// ============================================================================
// LOCAL NOTIFICATIONS (FOR TESTING)
// ============================================================================

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data || {},
      },
      trigger: {
        seconds: 1,
      },
    })
  } catch (error) {
    console.error('Error sending local notification:', error)
    throw error
  }
}

/**
 * Schedule a notification for a specific time
 */
export async function scheduleNotificationAt(
  title: string,
  body: string,
  scheduledTime: Date,
  data?: Record<string, any>
): Promise<string> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data || {},
      },
      trigger: scheduledTime,
    })

    return id
  } catch (error) {
    console.error('Error scheduling notification:', error)
    throw error
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch (error) {
    console.error('Error canceling notification:', error)
    throw error
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (error) {
    console.error('Error canceling all notifications:', error)
    throw error
  }
}

// ============================================================================
// NOTIFICATION TYPES & ROUTING
// ============================================================================

export interface BriefingNotification {
  type: 'morning_briefing'
  title: 'Good morning'
  body: string
  timestamp: string
}

export interface CalendarNotification {
  type: 'calendar_event'
  title: string
  body: string
  eventId: string
  eventTime: string
}

export interface BudgetAlertNotification {
  type: 'budget_alert'
  title: string
  body: string
  category: string
  pctUsed: number
}

export interface FamilyReminderNotification {
  type: 'family_reminder'
  title: string
  body: string
  reminderId: string
}

export type KinNotification =
  | BriefingNotification
  | CalendarNotification
  | BudgetAlertNotification
  | FamilyReminderNotification

/**
 * Build a morning briefing notification
 */
export function createBriefingNotification(briefingBody: string): BriefingNotification {
  return {
    type: 'morning_briefing',
    title: 'Good morning',
    body: briefingBody,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Build a calendar reminder notification
 */
export function createCalendarNotification(
  eventTitle: string,
  eventTime: string,
  minutesUntil: number,
  eventId: string
): CalendarNotification {
  const minutesLabel = minutesUntil === 30 ? '30 minutes' : `${minutesUntil} minutes`

  return {
    type: 'calendar_event',
    title: eventTitle,
    body: `Starting in ${minutesLabel}`,
    eventId,
    eventTime,
  }
}

/**
 * Build a budget alert notification
 */
export function createBudgetAlertNotification(
  category: string,
  pctUsed: number,
  remaining: number
): BudgetAlertNotification {
  const status = pctUsed >= 100 ? 'exceeded' : 'approaching limit'

  return {
    type: 'budget_alert',
    title: `${category} budget ${status}`,
    body: `$${remaining.toFixed(2)} remaining this month`,
    category,
    pctUsed,
  }
}

/**
 * Build a family reminder notification
 */
export function createFamilyReminderNotification(title: string, body: string, reminderId: string): FamilyReminderNotification {
  return {
    type: 'family_reminder',
    title,
    body,
    reminderId,
  }
}

export default {
  configureNotifications,
  registerForPushNotifications,
  updatePushToken,
  removePushToken,
  setupNotificationHandlers,
  sendLocalNotification,
  scheduleNotificationAt,
  cancelNotification,
  cancelAllNotifications,
  createBriefingNotification,
  createCalendarNotification,
  createBudgetAlertNotification,
  createFamilyReminderNotification,
}
