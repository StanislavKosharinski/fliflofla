"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationPreferencesOptions {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
}

interface UseNotificationPreferencesResult {
  supported: boolean;
  statusMessage: string | null;
  toggleNotifications: () => Promise<void>;
  notify: (payload: NotificationPayload) => void;
}

export function useNotificationPreferences({
  enabled,
  onEnabledChange,
}: NotificationPreferencesOptions): UseNotificationPreferencesResult {
  const [supported, setSupported] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const feedbackTimeout = useRef<number | null>(null);
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "Notification" in window);
    return () => {
      notificationRef.current?.close?.();
      if (feedbackTimeout.current) {
        window.clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = null;
      }
    };
  }, []);

  const setFeedback = useCallback((message: string | null) => {
    if (feedbackTimeout.current) {
      window.clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = null;
    }

    setStatusMessage(message);

    if (message) {
      feedbackTimeout.current = window.setTimeout(() => {
        setStatusMessage(null);
        feedbackTimeout.current = null;
      }, 4000);
    }
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!supported) {
      setFeedback("Notifications are not supported in this browser.");
      return;
    }

    if (enabled) {
      onEnabledChange(false);
      setFeedback("Notifications disabled.");
      return;
    }

    const permission = Notification.permission;

    if (permission === "granted") {
      onEnabledChange(true);
      setFeedback("Notifications enabled.");
      return;
    }

    if (permission === "denied") {
      setFeedback("Notifications are blocked. Enable them in browser settings.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        onEnabledChange(true);
        setFeedback("Notifications enabled.");
      } else {
        setFeedback("Notifications stay off until permission is granted.");
      }
    } catch (error) {
      console.warn("Notification permission request failed.", error);
      setFeedback("Unable to update notification permission.");
    }
  }, [enabled, onEnabledChange, setFeedback, supported]);

  const notify = useCallback(
    ({ title, body, tag }: NotificationPayload) => {
      if (!supported || !enabled) return;
      if (typeof window === "undefined") return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;

      try {
        notificationRef.current?.close?.();
        notificationRef.current = new Notification(title, {
          body,
          tag,
        });
      } catch (error) {
        console.warn("Unable to show notification.", error);
      }
    },
    [enabled, supported]
  );

  return {
    supported,
    statusMessage,
    toggleNotifications,
    notify,
  };
}
