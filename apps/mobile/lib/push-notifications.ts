import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
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
 * Maps a notification type to the correct Expo Router route.
 *
 * Route mapping (3-tab architecture):
 *   Today        /(tabs)/           — briefings, alerts, coordination issues
 *   Conversations /(tabs)/chat      — incoming chat notifications
 *   Settings     /(tabs)/settings   — (no push notifications)
 */
function routeForNotificationType(type: string): string {
  switch (type) {
    case "chat":
      return "/(tabs)/chat";
    case "morning_briefing":
    case "commute_departure":
    case "calendar_conflict":
    case "budget_alert":
    case "medication_reminder":
    case "vaccination_reminder":
    default:
      return "/(tabs)/";
  }
}

/**
 * Sets up foreground and background notification handlers
 * Routes notifications to appropriate screens based on type
 */
export function setupNotificationHandlers(): () => void {
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
      const data = notification.request.content.data as Record<string, string>;
      const type = data?.type ?? "";

      router.navigate(routeForNotificationType(type));
    });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
