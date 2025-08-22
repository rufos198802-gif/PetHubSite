// frontend/modules/treatments.js
(function () {
  const KEY = "treatments";
  const CAL_KEY = "calendar_events";

  const read = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  const readCal = () => JSON.parse(localStorage.getItem(CAL_KEY) || "[]");
  const writeCal = (arr) => localStorage.setItem(CAL_KEY, JSON.stringify(arr));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const escapeHTML = s => (s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function render() {
    const list = document.getElementById("trt-list");
    if (!list) return;
    const items = read().sort((a,b)=> (a.date||"") < (b.date||"") ? 1 : -1); // новые выше

    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<p class="muted">Записей нет</p>`;
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach(x => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";
      card.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <span class="pill">${escapeHTML(x.kind)}</span>
          <strong>${escapeHTML(x.drug)}</strong>
          <span class="muted">${escapeHTML(x.date || "—")}</span>
        </div>
        ${x.dose ? `<p class="muted" style="margin:6px 0 0 0">Дозировка: ${escapeHTML(x.dose)}</p>` : ""}
        ${x.notes ? `<p style="margin:6px 0 0 0; white-space:pre-wrap">${escapeHTML(x.notes)}</p>` : ""}
        ${(x.nextDate || x.nextTime) ? `<p class="muted" style="margin:6px 0 0 0">Следующая: ${escapeHTML(x.nextDate || "—")} ${escapeHTML(x.nextTime || "")}</p>` : ""}
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap">
          <button class="btn secondary" data-edit="${x.id}">Редактировать</button>
          <button class="btn btn-danger" data-del="${x.id}">Удалить</button>
        </div>
      `;
      frag.appendChild(card);
    });
    list.appendChild(frag);
  }

  function openForm(id = null) {
    const wrap = document.getElementById("trt-form-wrap");
    const form = document.getElementById("trt-form");
    if (!wrap || !form) return;
    wrap.style.display = "block";
    form.reset();

    if (id) {
      const it = read().find(e => e.id === id);
      if (it) {
        form.id.value = it.id;
        form.kind.value = it.kind;
        form.date.value = it.date || "";
        form.drug.value = it.drug || "";
        form.dose.value = it.dose || "";
        form.nextDate.value = it.nextDate || "";
        form.nextTime.value = it.nextTime || "";
        form.notes.value = it.notes || "";
      }
    } else {
      form.id.value = "";
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function closeForm() {
    const wrap = document.getElementById("trt-form-wrap");
    if (wrap) wrap.style.display = "none";
  }

  function removeItem(id) {
    const arr = read().filter(e => e.id !== id);
    write(arr);
    render();
  }

  function upsertCalendarReminder(item) {
    if (!item.nextDate && !item.nextTime) return;
    const arr = readCal();
    const title = `Обработка: ${item.kind.toUpperCase()} — ${item.drug}`;
    const rec = {
      id: "trt-" + item.id, // стабильный id чтобы обновлять
      date: item.nextDate || item.date,
      time: item.nextTime || "",
      title,
      type: "обработка",
      remindDate: item.nextDate || "",
      remindTime: item.nextTime || "",
      notes: item.notes || "",
      done: false
    };
    const i = arr.findIndex(e => e.id === rec.id);
    if (i >= 0) arr[i] = { ...arr[i], ...rec };
    else arr.push(rec);
    writeCal(arr);
  }

  // === регистрация ===
  App.handlers["treatments"] = function initTreatmentsPage() {
    console.log("initTreatmentsPage()"); // видно в консоли, что модуль инициализировался

    // Кнопки сверху
    document.getElementById("trt-add")?.addEventListener("click", () => openForm());
    document.getElementById("trt-cancel")?.addEventListener("click", () => closeForm());

    // Сабмит формы
    const form = document.getElementById("trt-form");
    if (form && !form._bound) {
      form._bound = true;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get("id") || uid();

        const rec = {
          id,
          kind: fd.get("kind"),
          date: fd.get("date"),
          drug: (fd.get("drug") || "").trim(),
          dose: (fd.get("dose") || "").trim(),
          nextDate: fd.get("nextDate"),
          nextTime: fd.get("nextTime"),
          notes: (fd.get("notes") || "").trim()
        };

        if (!rec.kind || !rec.date || !rec.drug) return;

        const arr = read();
        const i = arr.findIndex(e => e.id === id);
        if (i >= 0) arr[i] = { ...arr[i], ...rec };
        else arr.unshift(rec);

        write(arr);
        upsertCalendarReminder(rec);
        closeForm();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Делегирование кликов по списку (редакт/удаление всегда работают)
    const list = document.getElementById("trt-list");
    if (list && !list._bound) {
      list._bound = true;
      list.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.edit) return openForm(btn.dataset.edit);
        if (btn.dataset.del) return removeItem(btn.dataset.del);
      });
    }

    render();
  };
})();