import React, { useEffect, useState } from "react";
import { useCalendar } from "../../context/CalendarContext";
import {
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  Shirt,
  MapPin,
  Pencil,
} from "lucide-react";
import "./Calendar.css";

const BROWSER_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const Calendar = () => {
  const { events, loading, fetchEvents, addEvent, updateEvent, deleteEvent } =
    useCalendar();
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    occasion: "Casual",
    formality: "Casual",
    locationName: "",
    timezone: BROWSER_TIMEZONE,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  useEffect(() => {
    const refreshCurrentTime = () => {
      setCurrentTime(new Date());
    };

    const initialTimerId = window.setTimeout(refreshCurrentTime, 0);
    const intervalId = window.setInterval(refreshCurrentTime, 60_000);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
    };
  }, []);

  const currentTimeMs = currentTime?.getTime() ?? 0;

  const orderedEvents = [...events].sort((firstEvent, secondEvent) => {
    const firstIsPast = new Date(firstEvent.date).getTime() < currentTimeMs;

    const secondIsPast = new Date(secondEvent.date).getTime() < currentTimeMs;

    if (firstIsPast !== secondIsPast) {
      return firstIsPast ? 1 : -1;
    }

    return new Date(firstEvent.date) - new Date(secondEvent.date);
  });

  const currentWeekDays = React.useMemo(() => {
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Ustawienie na Poniedziałek

    const monday = new Date(startOfWeek.setDate(diff));
    const days = [];

    const weekdayNames = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push({
        name: weekdayNames[i],
        dateString: nextDay.toISOString().split("T")[0],
        dayNumber: nextDay.getDate(),
        fullDate: nextDay,
      });
    }
    return days;
  }, []);
  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      occasion: "Casual",
      formality: "Casual",
      locationName: "",
      timezone: BROWSER_TIMEZONE,
    });

    setEditingEventId(null);
  };

  const formatEventDateForInput = (event) => {
    const date = new Date(event.date);

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: event.timezone || BROWSER_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const value = (type) =>
      parts.find((part) => part.type === type)?.value || "";

    return `${value("year")}-${value("month")}-${value("day")}T${value(
      "hour",
    )}:${value("minute")}`;
  };

  const handleStartEdit = (event) => {
    setEditingEventId(event.id);

    setFormData({
      title: event.title,
      date: formatEventDateForInput(event),
      occasion: event.occasion,
      formality: event.formality,
      locationName: event.locationName || "",
      timezone: event.timezone || BROWSER_TIMEZONE,
      outfitIds: event.outfitIds || [],
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const success = editingEventId
      ? await updateEvent(editingEventId, formData)
      : await addEvent(formData);

    if (success) {
      resetForm();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="calendar-page page-shell bg-fitte-cream">
      <header className="page-header">
        <h2 className="page-title">
          Planer <span className="italic">Okazji i Stylizacji</span>
        </h2>
        <p className="page-subtitle">
          Zarządzaj harmonogramem i przeglądaj kreacje Fitte AI na przestrzeni
          tygodnia
        </p>
      </header>

      <section className="mb-12">
        <h3 className="font-playfair text-xl italic text-fitte-brown-dark mb-4">
          Twój Tydzień Mody (Podgląd AI)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {currentWeekDays.map((day) => {
            const daysEvents = events.filter(
              (e) =>
                new Date(e.date).toISOString().split("T")[0] === day.dateString,
            );

            const hasEvents = daysEvents.length > 0;

            return (
              <div
                key={day.dateString}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[220px] ${
                  hasEvents
                    ? "bg-fitte-brown-dark text-white border-fitte-brown-dark shadow-md"
                    : "bg-white text-fitte-brown-dark border-fitte-sand/30"
                }`}
              >
                <div className="flex justify-between items-start border-b border-current/10 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                    {day.name}
                  </span>
                  <span className="font-playfair text-xl font-bold">
                    {day.dayNumber}
                  </span>
                </div>

                <div className="my-3 flex-1 flex flex-col justify-center items-center">
                  {hasEvents &&
                  daysEvents[0].aiProposedOutfit &&
                  daysEvents[0].aiProposedOutfit.length > 0 ? (
                    <div className="flex gap-1 justify-center items-center bg-white/10 p-1.5 rounded-xl w-full max-h-[80px] overflow-hidden">
                      {daysEvents[0].aiProposedOutfit.map((cloth) => (
                        <img
                          key={cloth.id}
                          src={cloth.imageUrl}
                          alt={cloth.name}
                          className="w-10 h-14 object-contain bg-white/20 rounded-md p-0.5 hover:scale-110 transition-transform"
                          title={`${cloth.name} (${cloth.style})`}
                        />
                      ))}
                    </div>
                  ) : hasEvents ? (
                    <span className="text-[10px] opacity-40 italic">
                      Brak ubrań do zestawu
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">
                      Czysta karta
                    </span>
                  )}
                </div>

                <div className="mt-2 text-left">
                  {hasEvents ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold truncate">
                        {daysEvents[0].title}
                      </p>
                      <span className="inline-block text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                        {daysEvents[0].occasion}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-300 italic">
                      Brak planów
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="calendar-grid">
        <div className="apple-card add-event-card p-6 bg-white rounded-3xl border border-fitte-sand/30 shadow-sm">
          <h3 className="font-bold text-lg text-fitte-brown-dark mb-4">
            {editingEventId ? "Edytuj wydarzenie" : "Zaplanuj wydarzenie"}{" "}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label>Nazwa wydarzenia</label>
              <input
                type="text"
                placeholder="np. Obrona pracy magisterskiej"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Data i godzina</label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Lokalizacja wydarzenia</label>
              <input
                type="text"
                placeholder="np. Warszawa lub Kraków, Polska"
                autoComplete="address-level2"
                value={formData.locationName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    locationName: e.target.value,
                  })
                }
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Opcjonalnie — lokalizacja pozwala dopasować stylizację do
                miejscowej pogody.
              </p>
            </div>
            <div className="form-group">
              <label>Okazja</label>
              <select
                value={formData.occasion}
                onChange={(e) =>
                  setFormData({ ...formData, occasion: e.target.value })
                }
              >
                <option value="Casual">Codzienne (Casual)</option>
                <option value="Praca">Biznes / Uczelnia (Praca)</option>
                <option value="Randka">Randka / Wyjście</option>
                <option value="Impreza">Impreza / Wesele</option>
                <option value="Sport">Sport / Trening</option>
                <option value="Podróż">Podróż / Wyjazd</option>
              </select>
            </div>

            <div className="form-group">
              <label>Styl / Formalność</label>
              <select
                value={formData.formality}
                onChange={(e) =>
                  setFormData({ ...formData, formality: e.target.value })
                }
              >
                <option value="Casual">Luz (Casual)</option>
                <option value="Smart Casual">
                  Elegancki luz (Smart Casual)
                </option>
                <option value="Formal">Oficjalny (Formal)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-fitte btn-primary w-full bg-fitte-brown-dark text-white p-3 rounded-xl font-bold"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : editingEventId ? (
                  "Zapisz zmiany"
                ) : (
                  <>
                    <Plus size={18} /> Dodaj do planu
                  </>
                )}
              </button>

              {editingEventId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="text-sm font-semibold text-fitte-brown-dark hover:underline"
                >
                  Anuluj edycję
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="events-list-container">
          <h3 className="font-playfair text-2xl italic text-fitte-brown-dark mb-6">
            Twoje wydarzenia{" "}
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2
                className="animate-spin text-fitte-brown-dark"
                size={36}
              />
            </div>
          ) : events.length > 0 ? (
            <div className="flex flex-col gap-4">
              {orderedEvents.map((event) => {
                const isPastEvent =
                  new Date(event.date).getTime() < currentTimeMs;
                return (
                  <div
                    key={event.id}
                    className={`apple-card event-row flex justify-between items-center p-5 rounded-2xl group hover:translate-x-1 transition-all border border-fitte-sand/20 ${
                      isPastEvent ? "bg-gray-50 opacity-70" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="calendar-badge flex flex-col items-center justify-center rounded-xl p-3 bg-fitte-cream/40">
                        <CalendarIcon
                          size={20}
                          className="text-fitte-brown-dark"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-fitte-brown-dark">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleString("pl-PL", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: event.timezone || BROWSER_TIMEZONE,
                            timeZoneName: "short",
                          })}
                        </p>
                        {event.locationName && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {event.locationName}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="tag tag-occasion">
                            {event.occasion}
                          </span>
                          <span className="tag tag-formality">
                            {event.formality}
                          </span>

                          {isPastEvent && (
                            <span className="tag bg-gray-200 text-gray-500">
                              Zakończone
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(event)}
                        className="p-2 text-gray-300 hover:text-fitte-brown-dark rounded-xl hover:bg-fitte-cream"
                        aria-label={`Edytuj wydarzenie: ${event.title}`}
                        title="Edytuj wydarzenie"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Usunąć z kalendarza?")) {
                            deleteEvent(event.id);
                          }
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50"
                        aria-label={`Usuń wydarzenie: ${event.title}`}
                        title="Usuń wydarzenie"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 italic text-center py-10">
              Brak zaplanowanych wydarzeń. Czas coś zorganizować!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
