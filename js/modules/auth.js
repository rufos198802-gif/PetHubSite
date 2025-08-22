// frontend/js/modules/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");
  const role = localStorage.getItem("role");

  // Роли не скрывают вкладки. Всё доступно.
  // (Экран выбора роли остаётся опционально)
  if (!role && content && !location.hash) {
    content.insertAdjacentHTML("beforeend", `
      <div class="auth-screen" style="margin-top:16px">
        <h3>Выберите роль (необязательно)</h3>
        <div class="role-buttons">
          <button class="role-btn" data-role="owner">Владелец</button>
          <button class="role-btn" data-role="shelter">Приют</button>
          <button class="role-btn" data-role="brand">Бренд</button>
          <button class="role-btn" data-role="volunteer">Волонтёр</button>
          <button class="role-btn" data-role="community">Сообщество</button>
        </div>
      </div>
    `);
    content.querySelectorAll(".role-btn").forEach(b => {
      b.addEventListener("click", () => {
        localStorage.setItem("role", b.dataset.role);
        alert(`Роль установлена: ${b.dataset.role}`);
      });
    });
  }
});