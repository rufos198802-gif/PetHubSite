// frontend/modules/docs.js
(function () {
  const STORAGE_KEY = "docs";

  let docs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));

  function render() {
    const list = document.getElementById("docs-list");
    if (!list) return;
    list.innerHTML = "";

    if (docs.length === 0) {
      list.innerHTML = `<p class="muted">Документы пока не добавлены.</p>`;
      return;
    }

    docs.forEach(doc => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";
      card.innerHTML = `
        <h3>${doc.title || "(без названия)"}</h3>
        <p><strong>Тип:</strong> ${doc.type}</p>
        ${doc.date ? `<p><strong>Дата:</strong> ${doc.date}</p>` : ""}
        ${doc.number ? `<p><strong>№:</strong> ${doc.number}</p>` : ""}
        ${doc.notes ? `<p>${doc.notes}</p>` : ""}
        ${doc.fileName ? `<p><em>Файл: ${doc.fileName}</em></p>` : ""}
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
          <button class="btn secondary" data-edit="${doc.id}">✏️ Редактировать</button>
          <button class="btn btn-danger" data-del="${doc.id}">🗑️ Удалить</button>
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll("[data-edit]").forEach(b =>
      b.addEventListener("click", () => openForm(b.dataset.edit))
    );
    list.querySelectorAll("[data-del]").forEach(b =>
      b.addEventListener("click", () => removeDoc(b.dataset.del))
    );
  }

  function openForm(id = null) {
    const wrap = document.getElementById("doc-form-wrap");
    const form = document.getElementById("form-doc");
    if (!wrap || !form) return;

    wrap.style.display = "block";
    form.reset();

    if (id) {
      const doc = docs.find(d => d.id === id);
      if (doc) {
        form.id.value = doc.id;
        form.type.value = doc.type;
        form.title.value = doc.title;
        form.date.value = doc.date || "";
        form.number.value = doc.number || "";
        form.notes.value = doc.notes || "";
      }
    } else {
      form.id.value = "";
    }
  }

  function closeForm() {
    const wrap = document.getElementById("doc-form-wrap");
    if (wrap) wrap.style.display = "none";
  }

  function removeDoc(id) {
    if (!confirm("Удалить документ?")) return;
    docs = docs.filter(d => d.id !== id);
    save();
    render();
  }

  // Регистрация инициализатора страницы
  App.handlers["docs"] = function initDocsPage() {
    const btnNew = document.getElementById("btn-new-doc");
    const form = document.getElementById("form-doc");
    const btnCancel = document.getElementById("btn-cancel-doc");

    if (btnNew) btnNew.addEventListener("click", () => openForm());
    if (btnCancel) btnCancel.addEventListener("click", closeForm);

    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(form);
        const id = data.get("id");

        const next = {
          id: id || Date.now().toString(),
          type: data.get("type"),
          title: data.get("title"),
          date: data.get("date"),
          number: data.get("number"),
          notes: data.get("notes"),
        };

        // сохраняем только имя файла, сам файл пока не храним
        const file = data.get("file");
        if (file && file.name) {
          next.fileName = file.name;
        } else if (id) {
          const old = docs.find(d => d.id === id);
          if (old && old.fileName) next.fileName = old.fileName;
        }

        if (id) {
          docs = docs.map(d => (d.id === id ? next : d));
        } else {
          docs.push(next);
        }

        save();
        render();
        closeForm();
      });
    }

    render();
  };
})();