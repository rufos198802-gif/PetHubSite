// frontend/script.js
(function () {
  // Глобальный объект и реестр инициализаторов
  window.App = window.App || { handlers: {} };

  function setActive(nav, page) {
    nav.querySelectorAll(".tab-button").forEach(b => {
      b.classList.toggle("is-active", b.dataset.page === page);
    });
  }

  async function loadPage(page) {
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = `<div class="notice">Загрузка…</div>`;
    try {
      const res = await fetch(`pages/${page}.html`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      content.innerHTML = html;

      const init = App.handlers?.[page];
      if (typeof init === "function") init();
    } catch (e) {
      console.error(e);
      content.innerHTML = `<p class="error">Ошибка загрузки: ${page}.html</p>`;
    }
  }

  // делаем доступным глобально (для других модулей)
  App.loadPage = loadPage;

  document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    if (!nav) return;

    // клики по вкладкам
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-button");
      if (!btn) return;
      const page = btn.dataset.page;
      setActive(nav, page);
      const newHash = `#page=${encodeURIComponent(page)}`;
      if (location.hash !== newHash) history.replaceState(null, "", newHash);
      loadPage(page);
    });

    // стартовая вкладка — из хэша или первая кнопка
    function startPage() {
      const m = location.hash.match(/page=([^&]+)/);
      const fromHash = m ? decodeURIComponent(m[1]) : null;
      const firstBtn = nav.querySelector(".tab-button");
      const page = fromHash || (firstBtn ? firstBtn.dataset.page : "docs");
      setActive(nav, page);
      loadPage(page);
    }
    startPage();

    // если вручную поменяли #page
    window.addEventListener("hashchange", () => {
      const m = location.hash.match(/page=([^&]+)/);
      if (!m) return;
      const page = decodeURIComponent(m[1]);
      setActive(nav, page);
      loadPage(page);
    });
  });
})();