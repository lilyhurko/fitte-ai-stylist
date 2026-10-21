import React, { createContext, useCallback, useContext, useState } from "react";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const dismissNotification = useCallback((id) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const showNotification = useCallback(
    (type, message) => {
      const id = crypto.randomUUID();

      setNotifications((current) => [...current, { id, type, message }]);

      window.setTimeout(() => {
        dismissNotification(id);
      }, 4500);
    },
    [dismissNotification],
  );

  const showSuccess = useCallback(
    (message) => showNotification("success", message),
    [showNotification],
  );

  const showError = useCallback(
    (message) => showNotification("error", message),
    [showNotification],
  );

  const showInfo = useCallback(
    (message) => showNotification("info", message),
    [showNotification],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        dismissNotification,
        showSuccess,
        showError,
        showInfo,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification musi być użyte wewnątrz NotificationProvider",
    );
  }

  return context;
};
