// frontend/modules/vitamins.js
(function () {
  const KEY = "vitamins";
  const CAL_KEY = "calendar_events";

  const read = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  const readCal = () => JSON.parse(localStorage.getItem(CAL_KEY) || "[]");
  const writeCal = (arr) => localStorage.setItem(CAL_KEY, JSON.stringify(arr));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const escapeHTML = s => (s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function render() {
    const list = document.getElementById("vit-list");
    if (!list) return;
    const items = read().sort((a,b)=> (a.start||"") < (b.start||"") ? 1 : -1);

    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<p class="muted">Пока нет добавок</p>`;
      return;
    }

    items.forEach(v => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";
      card.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <strong>${escapeHTML(v.name)}</strong>
          <span class="pill">${escapeHTML(v.period)}</span>
          ${v.time ? `<span class="pill">${escapeHTML(v.time)}</span>` : ""}
          <span class="muted">${escapeHTML(v.start || "—")}${v.end ? " → " + escapeHTML(v.end) : ""}</span>
        </div>
        ${v.dose ? `<p class="muted" style="margin:6px 0 0 0">Дозировка: ${escapeHTML(v.dose)}</p>` : ""}
        ${v.notes ? `<p style="margin:6px 0 0 0; white-space:pre-wrap">${escapeHTML(v.notes)}</p>` : ""}
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap">
          <button class="btn secondary" data-edit="${v.id}">Редактировать</button>
          <button class="btn btn-danger" data-del="${v.id}">Удалить</button>
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openForm(b.dataset.edit)));
    list.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => removeItem(b.dataset.del)));
  }

  function openForm(id = null) {
    const wrap = document.getElementById("vit-form-wrap");
    const form = document.getElementById("vit-form");
    if (!wrap || !form) return;
    wrap.style.display = "block";
    form.reset();

    if (id) {
      const v = read().find(e => e.id === id);
      if (v) {
        form.id.value = v.id;
        form.name.value = v.name || "";
        form.dose.value = v.dose || "";
        form.period.value = v.period || "ежедневно";
        form.time.value = v.time || "";
        form.start.value = v.start || "";
        form.end.value = v.end || "";
        form.notes.value = v.notes || "";
      }
    } else {
      form.id.value = "";
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function closeForm() {
    const wrap = document.getElementById("vit-form-wrap");
    if (wrap) wrap.style.display = "none";
  }

  function removeItem(id) {
    const arr = read().filter(e => e.id !== id);
    write(arr);
    render();
  }

  // ——— календарная синхронизация (создаём «основное» напоминание на дату старта) ———
  function upsertCalendarEntry(v) {
    if (!v.start && !v.time) return;
    const arr = readCal();
    const id = "vit-" + v.id;
    const rec = {
      id,
      date: v.start || null,
      time: v.time || "",
      title: `Витамины: ${v.name}`,
      type: "витамины",
      remindDate: v.start || "",
      remindTime: v.time || "",
      notes: v.dose ? `Дозировка: ${v.dose}${v.notes ? " | " + v.notes : ""}` : (v.notes || ""),
      done: false
    };
    const i = arr.findIndex(e => e.id === id);
    if (i >= 0) arr[i] = { ...arr[i], ...rec };
    else arr.push(rec);
    writeCal(arr);
  }

  App.handlers["vitamins"] = function initVitaminsPage() {
    document.getElementById("vit-add")?.addEventListener("click", () => openForm());
    document.getElementById("vit-cancel")?.addEventListener("click", () => closeForm());

    const form = document.getElementById("vit-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get("id") || uid();

        const rec = {
          id,
          name: (fd.get("name") || "").trim(),
          dose: (fd.get("dose") || "").trim(),
          period: fd.get("period"),
          time: fd.get("time"),
          start: fd.get("start"),
          end: fd.get("end"),
          notes: (fd.get("notes") || "").trim()
        };

        if (!rec.name || !rec.period || !rec.start) return;

        const arr = read();
        const i = arr.findIndex(e => e.id === id);
        if (i >= 0) arr[i] = { ...arr[i], ...rec };
        else arr.unshift(rec);

        write(arr);
        upsertCalendarEntry(rec);
        closeForm();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    render();
  };
})();