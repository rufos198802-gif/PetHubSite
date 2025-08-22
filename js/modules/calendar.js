// frontend/modules/calendar.js
(function () {
  const KEY = "calendar_events";

  // ==== utils ====
  const read = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const todayStr = () => new Date().toISOString().slice(0,10);
  const toMinutes = (t) => {
    if (!t) return 0;
    const [h,m] = t.split(":").map(Number);
    return (h||0)*60 + (m||0);
  };
  const fmtTime = (t) => t ? t : "—";

  const typeColor = (type) => {
    switch (type) {
      case "витамины":  return "#e6f7e6";
      case "обработка": return "#e6eef9";
      case "процедура": return "#fff2cc";
      default:          return "#eeeeee";
    }
  };

  function byDateThenTime(a,b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return toMinutes(a.time) - toMinutes(b.time);
  }

  function inRange(ev, range) {
    const d = ev.date;
    const today = new Date();
    const day = today.toISOString().slice(0,10);

    if (range === "today") return d === day;

    if (range === "week") {
      const start = new Date(today); // today (00:00)
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      return d >= start.toISOString().slice(0,10) && d < end.toISOString().slice(0,10);
    }

    if (range === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth()+1, 1);
      return d >= start.toISOString().slice(0,10) && d < end.toISOString().slice(0,10);
    }

    if (range === "upcoming") {
      return d >= day;
    }

    return true; // all
  }

  // ==== render ====
  function render() {
    const grid = document.getElementById("cal-list");
    if (!grid) return;
    grid.innerHTML = "";

    const range = document.getElementById("cal-filter-range")?.value || "upcoming";
    const ftype = document.getElementById("cal-filter-type")?.value || "";

    let items = read();

    // фильтры
    items = items.filter(e => inRange(e, range));
    if (ftype) items = items.filter(e => e.type === ftype);

    // сортировка
    items.sort(byDateThenTime);

    if (!items.length) {
      grid.innerHTML = `<p class="muted">Событий нет</p>`;
      return;
    }

    // группировка по дате
    const byDate = items.reduce((acc, e) => {
      (acc[e.date] = acc[e.date] || []).push(e);
      return acc;
    }, {});

    Object.keys(byDate).sort().forEach(date => {
      const dayCard = document.createElement("div");
      dayCard.className = "card";
      dayCard.style.padding = "12px";

      const events = byDate[date].sort(byDateThenTime);

      dayCard.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px">
          <h3 style="margin:0">${dateLabel(date)}</h3>
          <span class="pill">${events.length} шт.</span>
        </div>
        <div id="day-${date}" style="margin-top:8px; display:grid; gap:8px"></div>
      `;
      grid.appendChild(dayCard);

      const cont = dayCard.querySelector(`#day-${cssId(date)}`);
      // если id не совпал из-за спецсимволов — найдём по селектору
      const listRoot = dayCard.querySelector(`#day-${date}`) || dayCard.querySelector(`[id^="day-"]`);

      events.forEach(ev => {
        const row = document.createElement("div");
        row.className = "card";
        row.style.padding = "10px";
        row.style.border = `1px solid ${typeColor(ev.type)}`;
        row.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
              <span class="pill" style="background:${typeColor(ev.type)}">${ev.type}</span>
              <strong>${escapeHTML(ev.title)}</strong>
              <span class="muted">${fmtTime(ev.time)}</span>
              ${ev.done ? `<span class="pill" style="background:#e6f7e6">выполнено</span>` : ""}
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap">
              <button class="btn secondary" data-edit="${ev.id}">Редактировать</button>
              <button class="btn btn-danger" data-del="${ev.id}">Удалить</button>
              <button class="btn" data-done="${ev.id}">${ev.done ? "Отметить как невыполненное" : "Отметить выполненным"}</button>
            </div>
          </div>
          ${ev.notes ? `<p class="muted" style="margin:8px 0 0 0; white-space:pre-wrap">${escapeHTML(ev.notes)}</p>` : ""}
          ${
            (ev.remindDate || ev.remindTime)
            ? `<p class="muted" style="margin:6px 0 0 0">Напоминание: ${ev.remindDate || "—"} ${ev.remindTime || ""}</p>`
            : ""
          }
        `;
        (listRoot || dayCard).appendChild(row);
      });
    });

    // бинды
    grid.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openForm(b.dataset.edit)));
    grid.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => removeEvent(b.dataset.del)));
    grid.querySelectorAll("[data-done]").forEach(b => b.addEventListener("click", () => toggleDone(b.dataset.done)));
  }

  // ==== CRUD ====
  function openForm(id = null) {
    const wrap = document.getElementById("cal-form-wrap");
    const form = document.getElementById("cal-form");
    if (!wrap || !form) return;
    wrap.style.display = "block";
    form.reset();

    if (id) {
      const ev = read().find(e => e.id === id);
      if (ev) {
        form.id.value = ev.id;
        form.date.value = ev.date || "";
        form.time.value = ev.time || "";
        form.title.value = ev.title || "";
        form.type.value = ev.type || "другое";
        form.remindDate.value = ev.remindDate || "";
        form.remindTime.value = ev.remindTime || "";
        form.notes.value = ev.notes || "";
      }
    } else {
      form.id.value = "";
      form.date.value = todayStr();
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function closeForm() {
    const wrap = document.getElementById("cal-form-wrap");
    if (wrap) wrap.style.display = "none";
  }

  function removeEvent(id) {
    const next = read().filter(e => e.id !== id);
    write(next);
    render();
  }

  function toggleDone(id) {
    const arr = read();
    const i = arr.findIndex(e => e.id === id);
    if (i >= 0) {
      arr[i].done = !arr[i].done;
      write(arr);
      render();
    }
  }

  // ==== helpers ====
  function dateLabel(iso) {
    const t = todayStr();
    if (iso === t) return "Сегодня";
    // простые подписи «Завтра/Вчера»
    const d = new Date(iso);
    const td = new Date(t);
    const diff = Math.round((d - td) / (24*60*60*1000));
    if (diff === 1) return "Завтра";
    if (diff === -1) return "Вчера";
    return iso;
  }
  function cssId(s) {
    return s.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  function escapeHTML(s) {
    return (s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // ==== register page ====
  App.handlers["calendar"] = function initCalendarPage() {
    // кнопки формы
    document.getElementById("cal-add")?.addEventListener("click", () => openForm());
    document.getElementById("cal-cancel")?.addEventListener("click", () => closeForm());

    // submit
    const form = document.getElementById("cal-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get("id") || uid();

        const rec = {
          id,
          date: fd.get("date"),
          time: fd.get("time"),
          title: (fd.get("title") || "").trim(),
          type: fd.get("type"),
          remindDate: fd.get("remindDate"),
          remindTime: fd.get("remindTime"),
          notes: (fd.get("notes") || "").trim(),
          done: false
        };

        // валидация минимума
        if (!rec.date || !rec.title) return;

        const arr = read();
        const i = arr.findIndex(e => e.id === id);
        if (i >= 0) arr[i] = { ...arr[i], ...rec };
        else arr.push(rec);

        write(arr);
        closeForm();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // фильтры
    document.getElementById("cal-filter-range")?.addEventListener("change", render);
    document.getElementById("cal-filter-type")?.addEventListener("change", render);

    render();
  };
})();