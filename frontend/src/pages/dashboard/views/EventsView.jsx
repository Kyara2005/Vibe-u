import { useEffect, useMemo, useState } from "react";
import {
  createUniversityEvent,
  deleteUniversityEvent,
  getUniversityEvents,
  toggleAttendEvent,
  updateUniversityEvent,
} from "../../../Services/events";
import { getTokenPayload } from "../../../utils/authToken";
import InterestChips from "../../../components/interests/InterestChips";
import { sanitizeInterests } from "../../../utils/interests";

const formatDate = (value) => {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return date.toLocaleString();
};

const isEventExpired = (value, now = Date.now()) => {
  if (!value) return true;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < now;
};

const emptyForm = {
  nombreEvento: "",
  portada: "",
  fechaHora: "",
  lugar: "",
  descripcionEvento: "",
  costo: "",
  tags: [],
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const EventsView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openMenuEventId, setOpenMenuEventId] = useState(null);
  const [editingEventId, setEditingEventId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [coverPreview, setCoverPreview] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const token = localStorage.getItem("token");
  const currentUserId = getTokenPayload(token)?.id || "";
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((event) => !isEventExpired(event.fechaHora, now))
        .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora)),
    [events, now]
  );

  const pastEvents = useMemo(
    () =>
      [...events]
        .filter((event) => isEventExpired(event.fechaHora, now))
        .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)),
    [events, now]
  );

  const loadEvents = async () => {
    setLoading(true);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setError("");
        const res = await getUniversityEvents();
        setEvents(Array.isArray(res?.data) ? res.data : []);
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 3) {
          setError(e?.response?.data?.msg || "No se pudieron cargar los eventos.");
          setLoading(false);
          return;
        }
        await wait(attempt * 450);
      }
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const selectedId = sessionStorage.getItem("vibeSelectedEventId");
    if (!selectedId || !events.length) return;
    const found = events.find((event) => event._id === selectedId);
    if (!found) return;
    setSelectedEvent(found);
    sessionStorage.removeItem("vibeSelectedEventId");
  }, [events]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      if (editingEventId) {
        await updateUniversityEvent(editingEventId, form);
      } else {
        await createUniversityEvent(form);
      }
      setForm(emptyForm);
      setCoverPreview("");
      setEditingEventId("");
      setShowCreateModal(false);
      await loadEvents();
    } catch (err) {
      setError(err?.response?.data?.msg || (editingEventId ? "No se pudo actualizar el evento." : "No se pudo crear el evento."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoverChange = async (file) => {
    if (!file) {
      setForm((prev) => ({ ...prev, portada: "" }));
      setCoverPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("La portada debe ser una imagen.");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setForm((prev) => ({ ...prev, portada: dataUrl }));
    setCoverPreview(typeof dataUrl === "string" ? dataUrl : "");
  };

  const handleAttend = async (eventId, e) => {
    e.stopPropagation();
    const target = events.find((item) => item._id === eventId);
    if (target && isEventExpired(target.fechaHora, now)) {
      setError("Este evento ya caducó y no admite asistencia.");
      return;
    }
    try {
      setError("");
      const res = await toggleAttendEvent(eventId);
      const updated = res?.data?.evento;
      if (!updated?._id) return;
      setEvents((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedEvent((prev) => (prev?._id === updated._id ? updated : prev));
    } catch (err) {
      setError(err?.response?.data?.msg || "No se pudo actualizar asistencia.");
    }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    try {
      setError("");
      await deleteUniversityEvent(eventId);
      setOpenMenuEventId(null);
      setEvents((prev) => prev.filter((item) => item._id !== eventId));
      setSelectedEvent((prev) => (prev?._id === eventId ? null : prev));
    } catch (err) {
      setError(err?.response?.data?.msg || "No se pudo eliminar el evento.");
    }
  };

  const handleEditEvent = (event, e) => {
    e.stopPropagation();
    setOpenMenuEventId(null);
    setSelectedEvent(null);
    setEditingEventId(event._id);
    setForm({
      nombreEvento: event.nombreEvento || "",
      portada: event.portada || "",
      fechaHora: toDateTimeLocalValue(event.fechaHora),
      lugar: event.lugar || "",
      descripcionEvento: event.descripcionEvento || "",
      costo: event.costo || "",
      tags: sanitizeInterests(event.tags),
    });
    setCoverPreview(event.portada || "");
    setShowCreateModal(true);
  };

  const renderEventCard = (event, expired) => (
    <article
      key={event._id}
      className={`event_card__dash event_card_clickable__dash${expired ? " event_card_expired__dash" : ""}`}
      onClick={() => {
        setOpenMenuEventId(null);
        setSelectedEvent(event);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setSelectedEvent(event);
      }}
    >
      <div className="event_card_body_custom__dash">
        <div className="event_card_main_custom__dash">
          {event?.creador?._id === currentUserId ? (
            <div
              className="event_menu_wrap__dash"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="event_menu_btn__dash"
                type="button"
                aria-label="Opciones del evento"
                title="Opciones"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuEventId((prev) => (prev === event._id ? null : event._id));
                }}
              >
                ⋮
              </button>
              {openMenuEventId === event._id ? (
                <div className="event_menu_panel__dash">
                  <button type="button" onClick={(e) => handleEditEvent(event, e)}>
                    Editar
                  </button>
                  <button type="button" onClick={(e) => handleDeleteEvent(event._id, e)}>
                    Eliminar
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {expired ? <span className="event_expired_badge__dash">Caducado</span> : null}
          <h4>{event.nombreEvento}</h4>
          <p>{formatDate(event.fechaHora)}</p>
          <p>{event.lugar}</p>
          <p>Asistentes: {event.asistentesCount || 0}</p>
          {expired ? (
            <p className="event_expired_text__dash">Este evento ya pasó. Ya no puedes asistir.</p>
          ) : (
            <button
              className="button__dash"
              type="button"
              onClick={(e) => handleAttend(event._id, e)}
            >
              {event.isAttending ? "Ya asistiré" : "Asistiré"}
            </button>
          )}
        </div>
        {event.portada ? (
          <img className="event_cover_custom__dash" src={event.portada} alt={`Portada de ${event.nombreEvento}`} />
        ) : null}
      </div>
    </article>
  );

  return (
    <section className="panel__dash">
      <div className="events_head_custom__dash">
        <h3>Eventos U</h3>
        <button className="button__dash" type="button" onClick={() => setShowCreateModal(true)}>
          Publicar evento
        </button>
      </div>

      {error ? <p className="chat_error__dash">{error}</p> : null}
      {error ? (
        <div className="friend_actions__dash" style={{ marginBottom: "8px" }}>
          <button className="button__dash" type="button" onClick={loadEvents}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="chat_hint__dash">Cargando eventos...</p>
      ) : (
        <>
          <div className="events_section_block__dash">
            <h4>Próximos eventos</h4>
            <div className="events_grid__dash events_custom_grid__dash">
              {upcomingEvents.map((event) => renderEventCard(event, false))}
              {!upcomingEvents.length ? (
                <p className="chat_hint__dash">No hay eventos próximos para tu universidad.</p>
              ) : null}
            </div>
          </div>

          <div className="events_section_block__dash">
            <h4>Eventos pasados</h4>
            <p className="events_section_hint__dash">Estos eventos ya caducaron y no admiten asistencia.</p>
            <div className="events_grid__dash events_custom_grid__dash">
              {pastEvents.map((event) => renderEventCard(event, true))}
              {!pastEvents.length ? (
                <p className="chat_hint__dash">Aún no hay eventos pasados.</p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {showCreateModal ? (
        <div className="events_modal_overlay__dash" role="dialog" aria-modal="true">
          <div className="events_modal__dash">
            <h4>{editingEventId ? "Editar evento" : "Publicar evento"}</h4>
            <form className="events_form__dash" onSubmit={handleCreateEvent}>
              <input
                className="input__dash"
                placeholder="Nombre del evento"
                value={form.nombreEvento}
                onChange={(e) => setForm((prev) => ({ ...prev, nombreEvento: e.target.value }))}
              />
              <input
                className="input__dash"
                type="file"
                accept="image/*"
                onChange={(e) => handleCoverChange(e.target.files?.[0])}
              />
              {coverPreview ? (
                <img className="event_cover_preview_custom__dash" src={coverPreview} alt="Vista previa portada" />
              ) : null}
              <input
                className="input__dash"
                type="datetime-local"
                value={form.fechaHora}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaHora: e.target.value }))}
              />
              <input
                className="input__dash"
                placeholder="Lugar"
                value={form.lugar}
                onChange={(e) => setForm((prev) => ({ ...prev, lugar: e.target.value }))}
              />
              <textarea
                className="textarea__dash"
                rows={4}
                placeholder="Descripcion del evento"
                value={form.descripcionEvento}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcionEvento: e.target.value }))}
              />
              <input
                className="input__dash"
                placeholder="Costo"
                value={form.costo}
                onChange={(e) => setForm((prev) => ({ ...prev, costo: e.target.value }))}
              />
              <InterestChips
                value={form.tags}
                onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
                label="Categorías"
                hint="Ayuda a recomendar este evento a quien coincida."
              />
              <div className="events_actions__dash">
                <button
                  className="button__dash"
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEventId("");
                    setForm(emptyForm);
                    setCoverPreview("");
                  }}
                >
                  Cancelar
                </button>
                <button className="button__dash" type="submit" disabled={submitting}>
                  {submitting ? (editingEventId ? "Guardando..." : "Publicando...") : (editingEventId ? "Guardar cambios" : "Guardar evento")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="events_modal_overlay__dash" role="dialog" aria-modal="true">
          <div className="events_modal__dash">
            <h4>{selectedEvent.nombreEvento}</h4>
            {isEventExpired(selectedEvent.fechaHora, now) ? (
              <p className="event_expired_text__dash">Este evento ya caducó y no admite asistencia.</p>
            ) : null}
            <p><strong>Fecha/Hora:</strong> {formatDate(selectedEvent.fechaHora)}</p>
            <p><strong>Lugar:</strong> {selectedEvent.lugar}</p>
            <p><strong>Descripcion:</strong> {selectedEvent.descripcionEvento}</p>
            <p><strong>Costo:</strong> {selectedEvent.costo}</p>
            <p><strong>Asistentes:</strong> {selectedEvent.asistentesCount || 0}</p>
            <div className="events_actions__dash">
              <button className="button__dash" type="button" onClick={() => setSelectedEvent(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default EventsView;
