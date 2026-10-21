import React, { createContext, useCallback, useContext, useState } from "react";
import { API_BASE_URL } from "../config";
import { useNotification } from "./NotificationContext";

const CalendarContext = createContext();

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const { showError, showSuccess } = useNotification();

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się pobrać wydarzeń.");
      }

      setEvents(data.events || []);
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const addEvent = async (eventData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się dodać wydarzenia.");
      }

      await fetchEvents();
      showSuccess("Wydarzenie zostało dodane do planera.");

      return true;
    } catch (error) {
      console.error("Błąd dodawania wydarzenia:", error);
      showError(error.message);

      return false;
    }
  };

  const deleteEvent = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się usunąć wydarzenia.");
      }

      setEvents((current) => current.filter((event) => event.id !== id));
      showSuccess("Wydarzenie zostało usunięte.");
    } catch (error) {
      console.error("Błąd usuwania wydarzenia:", error);
      showError(error.message);
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        loading,
        fetchEvents,
        addEvent,
        deleteEvent,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
