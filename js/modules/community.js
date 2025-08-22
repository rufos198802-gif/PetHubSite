// frontend/modules/community.js
(function () {
  // Хранилище
  const K = {
    articles: "community_articles",
    ads: "community_ads",
    shame: "community_shame"
  };

  // Утилиты
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const get = (k) => JSON.parse(localStorage.getItem(k) || "[]");
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const role = () => localStorage.getItem("role") || ""; // "" если не авторизован
  const norm = (s) => (s || "").trim();
  const parseCSV = (s) => norm(s) ? s.split(",").map(x=>x.trim()).filter(Boolean) : [];
  const escapeHTML = (s) => (s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  // ==== Рендер: Статьи ====
  function renderArticles() {
    const box = document.getElementById("articles-list");
    if (!box) return;

    let items = get(K.articles);

    // До входа — показываем только category === "общее"
    if (!role()) {
      items = items.filter(a => (a.category || "общее") === "общее");
    }

    box.innerHTML = "";
    if (!items.length) {
      box.innerHTML = `<p class="muted">Пока нет статей</p>`;
      return;
    }

    items.forEach(a => {
      const el = document.createElement("div");
      el.className = "card";
      el.style.padding = "12px";

      el.innerHTML = `
        <h4 style="margin:0 0 6px 0">${escapeHTML(a.title)}</h4>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px 0">
          <span class="pill">${escapeHTML(a.category || "общее")}</span>
          ${a.tags?.length ? a.tags.map(t => `<span class="pill">#${escapeHTML(t)}</span>`).join("") : ""}
        </div>
        <p style="white-space:pre-wrap; margin:6px 0">${escapeHTML(a.content)}</p>
        ${a.previewName ? `<p class="muted" style="margin:8px 0 0 0">Файл: ${escapeHTML(a.previewName)}</p>` : ""}

        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px">
          <button class="btn secondary" data-like="${a.id}">❤️ Нравится</button>
          <span class="pill" id="likes-${a.id}">${a.likes || 0}</span>
          ${role() ? `<button class="btn secondary" data-del="${a.id}">Удалить</button>` : ""}
        </div>

        <div style="margin-top:10px">
          <h5 style="margin:0 0 6px 0">Комментарии</h5>
          <ul class="comment-list" id="clist-${a.id}">
            ${(a.comments || []).map(c => `<li>💬 ${escapeHTML(c)}</li>`).join("")}
          </ul>
          ${
            role()
              ? `<form class="comment-form" data-aid="${a.id}">
                   <input type="text" placeholder="Добавьте комментарий..." required>
                   <button class="btn secondary" type="submit">Отправить</button>
                 </form>`
              : `<p class="muted">Чтобы комментировать, войдите</p>`
          }
        </div>
      `;

      box.appendChild(el);
    });

    // Лайки
    box.querySelectorAll("[data-like]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!role()) { alert("Войдите, чтобы ставить лайки"); return; }
        const id = btn.dataset.like;
        const arr = get(K.articles);
        const i = arr.findIndex(x => x.id === id);
        if (i >= 0) {
          arr[i].likes = (arr[i].likes || 0) + 1;
          set(K.articles, arr);
          const pill = document.getElementById(`likes-${id}`);
          if (pill) pill.textContent = arr[i].likes;
        }
      });
    });

    // Удаление статьи (разрешим для упрощения всем авторизованным)
    box.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.del;
        const arr = get(K.articles).filter(x => x.id !== id);
        set(K.articles, arr);
        renderArticles();
      });
    });

    // Комментарии
    box.querySelectorAll(".comment-form").forEach(f => {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!role()) { alert("Войдите, чтобы комментировать"); return; }
        const id = f.dataset.aid;
        const input = f.querySelector("input");
        const text = norm(input.value);
        if (!text) return;

        const arr = get(K.articles);
        const i = arr.findIndex(x => x.id === id);
        if (i >= 0) {
          arr[i].comments = arr[i].comments || [];
          arr[i].comments.push(text);
          set(K.articles, arr);
          const ul = document.getElementById(`clist-${id}`);
          if (ul) {
            const li = document.createElement("li");
            li.textContent = `💬 ${text}`;
            ul.appendChild(li);
          }
          f.reset();
        }
      });
    });
  }

  // ==== Рендер: Объявления ====
  function renderAds() {
    const box = document.getElementById("ads-list");
    if (!box) return;

    let items = get(K.ads);
    // До входа — показываем только общее? Для объявлений оставим все, но без форм.
    box.innerHTML = "";
    if (!items.length) {
      box.innerHTML = `<p class="muted">Пока нет объявлений</p>`;
      return;
    }

    const today = new Date().toISOString().slice(0,10);

    items.forEach(ad => {
      const expired = ad.expires && ad.expires < today;
      const el = document.createElement("div");
      el.className = "card";
      el.style.padding = "12px";
      el.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <h4 style="margin:0">${escapeHTML(ad.title)}</h4>
          <span class="pill">${escapeHTML(ad.type)}</span>
          <span class="pill">${escapeHTML(ad.city || "—")}</span>
          ${expired ? `<span class="pill" style="background:#fde2e2">истекло</span>` : ""}
        </div>
        <p style="white-space:pre-wrap; margin:8px 0">${escapeHTML(ad.description)}</p>
        <p class="muted" style="margin:6px 0">Контакты: ${escapeHTML(ad.contact || "—")}</p>
        ${ad.expires ? `<p class="muted" style="margin:0">Актуально до: ${escapeHTML(ad.expires)}</p>` : ""}
        ${role() ? `<div style="display:flex; gap:8px; margin-top:10px">
          <button class="btn secondary" data-ad-del="${ad.id}">Удалить</button>
        </div>` : ""}
      `;
      box.appendChild(el);
    });

    box.querySelectorAll("[data-ad-del]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.dataset.adDel;
        const next = get(K.ads).filter(x => x.id !== id);
        set(K.ads, next);
        renderAds();
      });
    });
  }

  // ==== Рендер: Доска позора ====
  function renderShame() {
    const box = document.getElementById("shame-list");
    if (!box) return;

    const items = get(K.shame);
    box.innerHTML = "";
    if (!items.length) {
      box.innerHTML = `<p class="muted">Пока нет публикаций</p>`;
      return;
    }

    items.forEach(s => {
      const el = document.createElement("div");
      el.className = "card";
      el.style.padding = "12px";

      const moderatedBadge = s.moderated
        ? `<span class="pill" style="background:#e6f7e6">проверено</span>`
        : `<span class="pill">на модерации</span>`;

      el.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <h4 style="margin:0">${escapeHTML(s.subject_type)}</h4>
          ${moderatedBadge}
          ${s.place ? `<span class="pill">${escapeHTML(s.place)}</span>` : ""}
          ${s.date ? `<span class="pill">${escapeHTML(s.date)}</span>` : ""}
        </div>
        <div style="margin-top:8px">
          ${
            s.moderated
              ? `<p style="white-space:pre-wrap; margin:0">${escapeHTML(s.description)}</p>`
              : `<p class="muted" style="margin:0">Содержимое скрыто до модерации.</p>`
          }
        </div>
        ${s.links && s.links.length ? `<p class="muted" style="margin:8px 0 0 0">Ссылки: ${s.links.map(l => `<span class="pill">${escapeHTML(l)}</span>`).join(" ")}</p>` : ""}
        ${s.files && s.files.length ? `<p class="muted" style="margin:6px 0 0 0">Файлы: ${s.files.map(f => `<span class="pill">${escapeHTML(f)}</span>`).join(" ")}</p>` : ""}
        ${
          role()
            ? `<div style="display:flex; gap:8px; margin-top:10px">
                 <button class="btn secondary" data-sdel="${s.id}">Удалить</button>
                 ${!s.moderated ? `<button class="btn" data-sok="${s.id}">Отметить как проверено</button>` : ""}
               </div>`
            : ""
        }
      `;
      box.appendChild(el);
    });

    box.querySelectorAll("[data-sdel]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.dataset.sdel;
        const next = get(K.shame).filter(x => x.id !== id);
        set(K.shame, next);
        renderShame();
      });
    });

    box.querySelectorAll("[data-sok]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.dataset.sok;
        const arr = get(K.shame);
        const i = arr.findIndex(x => x.id === id);
        if (i >= 0) {
          arr[i].moderated = true;
          set(K.shame, arr);
          renderShame();
        }
      });
    });
  }

  // ==== Привязка форм (работают только при авторизации) ====
  function bindArticleForm() {
    const f = document.getElementById("form-article");
    if (!f) return;

    // Если не авторизован — блокируем сабмит
    if (!role()) {
      f.addEventListener("submit", (e) => { e.preventDefault(); alert("Войдите, чтобы публиковать статьи"); });
      return;
    }

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);

      const rec = {
        id: uid(),
        title: norm(fd.get("article_title")),
        category: norm(fd.get("category")) || "общее",
        content: norm(fd.get("content")),
        tags: parseCSV(fd.get("tags")),
        previewName: fd.get("preview")?.name || "",
        likes: 0,
        comments: []
      };
      if (!rec.title || !rec.content) return;

      const arr = get(K.articles);
      arr.unshift(rec);
      set(K.articles, arr);

      f.reset();
      renderArticles();
      scrollToList("articles-list");
    });
  }

  function bindAdsForm() {
    const f = document.getElementById("form-ad");
    if (!f) return;

    if (!role()) {
      f.addEventListener("submit", (e) => { e.preventDefault(); alert("Войдите, чтобы публиковать объявления"); });
      return;
    }

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);

      const rec = {
        id: uid(),
        type: norm(fd.get("ad_type")),
        city: norm(fd.get("city")),
        title: norm(fd.get("title")),
        description: norm(fd.get("description")),
        contact: norm(fd.get("contact")),
        expires: norm(fd.get("expires"))
      };
      if (!rec.type || !rec.city || !rec.title || !rec.description || !rec.contact) return;

      const arr = get(K.ads);
      arr.unshift(rec);
      set(K.ads, arr);

      f.reset();
      renderAds();
      scrollToList("ads-list");
    });
  }

  function bindShameForm() {
    const f = document.getElementById("form-shame");
    if (!f) return;

    if (!role()) {
      f.addEventListener("submit", (e) => { e.preventDefault(); alert("Войдите, чтобы отправить публикацию"); });
      return;
    }

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);

      if (!fd.get("confirm")) return;

      const files = Array.from(fd.getAll("evidence_files") || []).map(f => f?.name).filter(Boolean);

      const rec = {
        id: uid(),
        subject_type: norm(fd.get("subject_type")),
        place: norm(fd.get("place")),
        date: norm(fd.get("date")),
        description: norm(fd.get("description")),
        links: parseCSV(fd.get("evidence_links")),
        files,
        moderated: false
      };
      if (!rec.subject_type || !rec.place || !rec.description) return;

      const arr = get(K.shame);
      arr.unshift(rec);
      set(K.shame, arr);

      f.reset();
      renderShame();
      scrollToList("shame-list");
    });
  }

  function scrollToList(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // === регистрация страницы ===
  App.handlers["community"] = function initCommunityPage() {
    bindArticleForm();
    bindAdsForm();
    bindShameForm();
    renderArticles();
    renderAds();
    renderShame();
  };
})();