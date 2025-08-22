// js/modules/profile.js
(function () {
  const KEY = "profile";

  const load = () => JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = (data) => localStorage.setItem(KEY, JSON.stringify(data));
  const esc  = (s) => (s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;","&gt;":">",'"':"&quot;","'":"&#39;" }[c]));

  function renderPets(listEl, pets) {
    if (!listEl) return;
    listEl.innerHTML = "";
    (pets || []).forEach((name, idx) => {
      const tag = document.createElement("span");
      tag.className = "pill";
      tag.style.cursor = "pointer";
      tag.title = "Нажмите, чтобы удалить";
      tag.innerHTML = `🐾 ${esc(name)}`;
      tag.addEventListener("click", () => {
        if (!confirm(`Удалить питомца «${name}»?`)) return;
        const p = load();
        p.pets = (p.pets || []).filter((_, i) => i !== idx);
        save(p);
        renderPets(listEl, p.pets);
      });
      listEl.appendChild(tag);
    });
  }

  function bindAvatarPreview(input, previewBox) {
    if (!input || !previewBox) return;
    input.addEventListener("change", () => {
      previewBox.innerHTML = "";
      const file = input.files && input.files[0];
      if (!file) return;
      const img = document.createElement("img");
      img.alt = "Превью";
      img.style.maxWidth = "140px";
      img.style.borderRadius = "10px";
      img.style.border = "1px solid var(--olive-ghost)";
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      reader.readAsDataURL(file);
      previewBox.appendChild(img);

      // сохраним превью (dataURL) в профиль
      const p = load();
      p.avatarDataUrl = ""; // очистим, потом сохраним при onload
      reader.onloadend = () => {
        p.avatarDataUrl = img.src || "";
        save(p);
      };
    });
  }

  App.handlers["profile"] = function initProfile() {
    const form   = document.getElementById("profile-form");
    if (!form) return;

    // корневые элементы из твоего HTML
    const nameEl   = form.querySelector('input[name="name"]');
    const emailEl  = form.querySelector('input[name="email"]');
    const phoneEl  = form.querySelector('input[name="phone"]');
    const socialEl = form.querySelector('input[name="social"]');
    const avatarEl = form.querySelector('input[name="avatar"]');
    const avatarBox= document.getElementById("avatar-preview");
    const petsList = document.getElementById("pets-list");
    const addPet   = document.getElementById("add-pet");
    const chatCb   = form.querySelector('input[name="chat_enabled"]');
    const visibleCb= form.querySelector('input[name="visible"]');

    // загрузка сохранённых данных
    const data = load();
    if (nameEl  && data.name)  nameEl.value  = data.name;
    if (emailEl && data.email) emailEl.value = data.email;
    if (phoneEl && data.phone) phoneEl.value = data.phone;
    if (socialEl && data.social) socialEl.value = data.social;

    if (chatCb)    chatCb.checked    = !!data.chat_enabled;
    if (visibleCb) visibleCb.checked = !!data.visible;

    // аватар из памяти
    if (avatarBox && data.avatarDataUrl) {
      const img = document.createElement("img");
      img.src = data.avatarDataUrl;
      img.alt = "Превью";
      img.style.maxWidth = "140px";
      img.style.borderRadius = "10px";
      img.style.border = "1px solid var(--olive-ghost)";
      avatarBox.appendChild(img);
    }

    // питомцы
    renderPets(petsList, data.pets || []);

    // авто‑сейв полей
    nameEl?.addEventListener("input", () => { const p = load(); p.name  = nameEl.value.trim();  save(p); });
    emailEl?.addEventListener("input", () => { const p = load(); p.email = emailEl.value.trim(); save(p); });
    phoneEl?.addEventListener("input", () => { const p = load(); p.phone = phoneEl.value.trim(); save(p); });
    socialEl?.addEventListener("input", () => { const p = load(); p.social= socialEl.value.trim(); save(p); });

    chatCb?.addEventListener("change", () => { const p = load(); p.chat_enabled = !!chatCb.checked; save(p); });
    visibleCb?.addEventListener("change", () => { const p = load(); p.visible      = !!visibleCb.checked; save(p); });

    // добавить питомца
    addPet?.addEventListener("click", () => {
      const name = prompt("Имя питомца:");
      if (!name) return;
      const p = load();
      p.pets = p.pets || [];
      p.pets.push(name.trim());
      save(p);
      renderPets(petsList, p.pets);
    });

    // превью аватара
    bindAvatarPreview(avatarEl, avatarBox);

    // сабмит «Сохранить» (дублирует авто‑сейв, но оставим для UX)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const p = load();
      p.name   = nameEl?.value.trim()   || "";
      p.email  = emailEl?.value.trim()  || "";
      p.phone  = phoneEl?.value.trim()  || "";
      p.social = socialEl?.value.trim() || "";
      p.chat_enabled = !!(chatCb?.checked);
      p.visible      = !!(visibleCb?.checked);
      save(p);
      alert("Профиль сохранён");
    });
  };
})();