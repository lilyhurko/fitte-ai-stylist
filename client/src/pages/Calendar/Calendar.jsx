import React, { useEffect, useState } from "react";
import { useCalendar } from "../../context/CalendarContext";
import { Calendar as CalendarIcon, MapPin, Trash2, Plus, Loader2 } from "lucide-react";
import "./Calendar.css";

const Calendar = () => {
  const { events, loading, fetchEvents, addEvent, deleteEvent } = useCalendar();
  const [formData, setFormData] = useState({ title: "", date: "", occasion: "Casual", formality: "Casual" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await addEvent(formData);
    if (success) {
      setFormData({ title: "", date: "", occasion: "Casual", formality: "Casual" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="calendar-page p-10">
      <header className="mb-12">
        <h2 className="font-playfair text-4xl mb-2">
          Planer <span className="italic">Okazji</span>
        </h2>
        <p className="text-gray-400 text-sm">Zarządzaj wydarzeniami i dopasowuj idealne zestawy ubrań</p>
      </header>

      <div className="calendar-grid">
        <div className="apple-card add-event-card p-6">
          <h3 className="font-bold text-lg text-fitte-brown-dark mb-4">Zaplanuj Wydarzenie</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label>Nazwa wydarzenia</label>
              <input
                type="text"
                placeholder="np. Obrona pracy magisterskiej"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Data i godzina</label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Okazja</label>
              <select value={formData.occasion} onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}>
                <option value="Casual">Codzienne (Casual)</option>
                <option value="Biznes">Biznes / Uczelnia</option>
                <option value="Randka">Randka / Wyjście</option>
                <option value="Impreza">Impreza / Wesele</option>
              </select>
            </div>

            <div className="form-group">
              <label>Styl / Formalność</label>
              <select value={formData.formality} onChange={(e) => setFormData({ ...formData, formality: e.target.value })}>
                <option value="Casual">Luz (Casual)</option>
                <option value="Smart Casual">Elegancki luz (Smart Casual)</option>
                <option value="Formal">Oficjalny (Formal)</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-fitte btn-primary w-full mt-2">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Dodaj do planu</>}
            </button>
          </form>
        </div>

        {/* Lista wydarzeń */}
        <div className="events-list-container">
          <h3 className="font-playfair text-2xl italic text-fitte-brown-dark mb-6">Nadchodzące dni</h3>
          
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-fitte-brown-dark" size={36} /></div>
          ) : events.length > 0 ? (
            <div className="flex flex-col gap-4">
              {events.map((event) => (
                <div key={event.id} className="apple-card event-row flex justify-between items-center p-5 group hover:translate-x-1 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="calendar-badge flex flex-col items-center justify-center">
                      <CalendarIcon size={20} className="text-fitte-brown-dark mb-1" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-fitte-brown-dark">{event.title}</h4>
                      <p className="text-xs text-gray-400">
                        {new Date(event.date).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="tag tag-occasion">{event.occasion}</span>
                        <span className="tag tag-formality">{event.formality}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { if(window.confirm("Usunąć z kalendarza?")) deleteEvent(event.id); }}
                    className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-center py-10">Brak zaplanowanych wydarzeń. Czas coś zorganizować!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;