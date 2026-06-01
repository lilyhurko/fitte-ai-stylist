import React, { createContext, useContext, useState } from "react";
import { API_BASE_URL } from "../config";

const CalendarContext = createContext();

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    const token = sessionStorage.getItem("fitte_token");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (eventData) => {
    const token = sessionStorage.getItem("fitte_token");
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });
      if (response.ok) {
        await fetchEvents();
        return true;
      }
    } catch (error) {
      console.error("Błąd dodawania wydarzenia:", error);
    }
    return false;
  };

  const deleteEvent = async (id) => {
    const token = sessionStorage.getItem("fitte_token");
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setEvents(events.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Błąd usuwania wydarzenia:", error);
    }
  };

  return (
    <CalendarContext.Provider value={{ events, loading, fetchEvents, addEvent, deleteEvent }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);