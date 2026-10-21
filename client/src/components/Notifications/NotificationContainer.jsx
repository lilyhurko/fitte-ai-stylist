import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import "./NotificationContainer.css";

const notificationIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const NotificationContainer = () => {
  const { notifications, dismissNotification } = useNotification();

  return (
    <div className="notification-container" aria-live="polite">
      {notifications.map((notification) => {
        const Icon = notificationIcons[notification.type] || Info;

        return (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            role={notification.type === "error" ? "alert" : "status"}
          >
            <Icon size={20} aria-hidden="true" />
            <p>{notification.message}</p>

            <button
              type="button"
              className="notification-close"
              onClick={() => dismissNotification(notification.id)}
              aria-label="Zamknij komunikat"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationContainer;
