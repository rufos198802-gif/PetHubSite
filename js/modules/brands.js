// frontend/modules/brands.js
(function () {
  const KEY = "brands";                 // список брендов
  const BANNER_KEY = "brands_banner";   // активный баннер {brandId, until}

  const now = () => Date.now();
  const hourMs = 60 * 60 * 1000;
  const read = (k, dflt) => JSON.parse(localStorage.getItem(k) || JSON.stringify(dflt));
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const getRole = () => localStorage.getItem("role") || ""; // "shelter" даст доступ к «спасибо» и баннеру

  // Инициализируем список брендов, если пусто
  function ensureSeed() {
    let items = read(KEY, []);
    if (!items.length) {
      items = [
        { id: "b1", name: "GoodFeed", contacts: { site: "https://example.com" }, logo: "", about: "Корм и лакомства.", thanks: 0 },
        { id: "b2", name: "VetCare", contacts: { site: "https://example.com" }, logo: "", about: "Вет. товары и расходники.", thanks: 0 },
        { id: "b3", name: "WarmHome", contacts: { site: "https://example.com" }, logo: "", about: "Амуниция и лежанки.", thanks: 0 }
      ];
      write(KEY, items);
    }
  }

  function getFilteredSorted(brands, q, sort) {
    let arr = brands;
    if (q) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(b => b.name.toLowerCase().includes(s) || (b.about||"").toLowerCase().includes(s));
    }
    switch (sort) {
      case "thanks_desc": arr = arr.slice().sort((a,b)=> (b.thanks||0)-(a.thanks||0)); break;
      case "thanks_asc":  arr = arr.slice().sort((a,b)=> (a.thanks||0)-(b.thanks||0)); break;
      case "name_desc":   arr = arr.slice().sort((a,b)=> b.name.localeCompare(a.name, "ru")); break;
      case "name_asc":
      default:            arr = arr.slice().sort((a,b)=> a.name.localeCompare(b.name, "ru"));
    }
    return arr;
  }

  function renderBanner() {
    const banner = read(BANNER_KEY, null);
    const wrap = document.getElementById("brand-banner");
    if (!wrap) return;
    if (!banner) { wrap.style.display = "none"; return; }

    // истёк?
    if (banner.until <= now()) {
      localStorage.removeItem(BANNER_KEY);
      wrap.style.display = "none";
      return;
    }

    const brands = read(KEY, []);
    const brand = brands.find(b => b.id === banner.brandId);
    if (!brand) { wrap.style.display = "none"; return; }

    wrap.style.display = "block";
    document.getElementById("banner-brand-name").textContent = brand.name;

    const left = Math.max(0, banner.until - now());
    const mins = Math.floor(left/60000);
    const secs = Math.floor((left%60000)/1000);
    document.getElementById("banner-timer").textContent = `ещё ${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;

    // тикаем раз в секунду
    if (!renderBanner._timer) {
      renderBanner._timer = setInterval(() => {
        if (!document.getElementById("brand-banner")) {
          clearInterval(renderBanner._timer);
          renderBanner._timer = null;
          return;
        }
        renderBanner();
      }, 1000);
    }
  }

  function activateBanner(brandId) {
    // Баннер может включить только роль «Приют»
    if (getRole() !== "shelter") return alert("Только приют может активировать баннер (после подтверждённой помощи).");
    const until = now() + hourMs;
    write(BANNER_KEY, { brandId, until });
    renderBanner();
    alert("Золотой баннер активирован на 1 час.");
  }

  function sayThanks(brandId) {
    // «Спасибо» может отправить только приют
    if (getRole() !== "shelter") return alert("Только приют может отправлять «спасибо» бренду.");
    const brands = read(KEY, []);
    const idx = brands.findIndex(b => b.id === brandId);
    if (idx < 0) return;

    brands[idx].thanks = (brands[idx].thanks || 0) + 1;
    write(KEY, brands);
    renderList(); // обновим список
  }

  function renderList() {
    const list = document.getElementById("brands-list");
    if (!list) return;

    const q = (document.getElementById("brand-search")?.value || "");
    const sort = (document.getElementById("brand-sort")?.value || "thanks_desc");

    const brands = read(KEY, []);
    const data = getFilteredSorted(brands, q, sort);

    list.innerHTML = "";
    if (!data.length) {
      list.innerHTML = `<p class="muted">Ничего не найдено</p>`;
      return;
    }

    const role = getRole();
    data.forEach(b => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";

      card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center">
          <div style="width:44px; height:44px; background:#f2f4ef; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700">${(b.name||"?").slice(0,1)}</div>
          <div>
            <h4 style="margin:0">${escapeHTML(b.name)}</h4>
            <p class="muted" style="margin:2px 0 0 0">${escapeHTML(b.about||"")}</p>
          </div>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
          ${b.contacts?.site ? `<a class="btn secondary" href="${escapeAttr(b.contacts.site)}" target="_blank" rel="noopener">Сайт</a>` : ""}
          <span class="pill">спасибо: ${b.thanks||0}</span>
          ${role === "shelter" ? `<button class="btn" data-thanks="${b.id}">Сказать «спасибо»</button>` : ""}
          ${role === "shelter" ? `<button class="btn secondary" data-banner="${b.id}">Золотой баннер (1ч)</button>` : ""}
        </div>
      `;
      list.appendChild(card);
    });

    // бинды
    list.querySelectorAll("[data-thanks]").forEach(btn => {
      btn.addEventListener("click", () => sayThanks(btn.dataset.thanks));
    });
    list.querySelectorAll("[data-banner]").forEach(btn => {
      btn.addEventListener("click", () => activateBanner(btn.dataset.banner));
    });
  }

  function bindUI() {
    document.getElementById("brand-search")?.addEventListener("input", renderList);
    document.getElementById("brand-sort")?.addEventListener("change", renderList);
  }

  function escapeHTML(s) {
    return (s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escapeAttr(s) {
    return String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  // === регистрация обработчика страницы ===
  App.handlers["brands"] = function initBrandsPage() {
    ensureSeed();
    bindUI();
    renderBanner();
    renderList();
  };
})();