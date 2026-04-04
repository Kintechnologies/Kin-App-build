import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "./api";

// Set default notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers device for push notifications with Expo
 * Saves the token to Supabase push_tokens table
 * Returns the Expo push token or null if registration fails
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if device is physical (not simulator)
    if (!Device.isDevice) {
      return null;
    }

    // Get current permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // Get the Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Save token to database via API
    try {
      await api.registerPushToken(
        token.data,
        Device.osName || "unknown",
        Device.modelName || "unknown"
      );
    } catch (dbError) {
      console.error("Failed to save push token to database:", dbError);
      // Continue even if database save fails - token is still valid locally
    }

    return token.data;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Sets up foreground and background notification handlers
 * Routes notifications to appropriate screens based on type
 */
export function setupNotificationHandlers(): void {
  // Handle notifications received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (_notification) => {
      // Notification is shown automatically via setNotificationHandler above
    }
  );

  // Handle user tapping on notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { notification } = response;
      const data = notification.request.content.data;

      // Route based on notification type
      if (data.type === "coordination_issue") {
        // Deep-link to Today screen — Realtime subscription surfaces the alert
        navigateToScreen("today");
      } else if (data.type === "morning_briefing") {
        // Navigate to home tab
        navigateToScreen("home");
      } else if (data.type === "medication_reminder") {
        // Navigate to pet care
        navigateToScreen("pets");
      } else if (data.type === "vaccination_reminder") {
        // Navigate to pet care
        navigateToScreen("pets");
      } else if (data.type === "calendar_conflict") {
        // Navigate to calendar
        navigateToScreen("calendar");
      } else if (data.type === "budget_alert") {
        // Navigate to budget
        navigateToScreen("budget");
      } else if (data.type === "commute_departure") {
        // Navigate to home — leave-by time is shown in the briefing card
        navigateToScreen("home");
      }
    });

  // Cleanup subscriptions on unmount would happen in component
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Helper to navigate to specific screens
 * In a real app, this would use React Navigation
 */
function navigateToScreen(_screen: string): void {
  // TODO: implement with Expo Router once notification routing is wired up
}
