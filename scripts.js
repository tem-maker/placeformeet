function openChat(id) {
  console.log("Открыт чат с пользователем ID:", id);
  // Логика для открытия чата
  // Например, window.location.href = `chat.html?id=${id}`;
}




// Получение переключателя темы!!!!!
const themeToggle = document.getElementById('theme-toggle');

// Проверка сохранённой темы
const savedTheme = localStorage.getItem('theme');

// Установка сохранённой темы при загрузке страницы
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
  themeToggle.checked = true;
} else {
  document.body.classList.remove('dark-theme');
}

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
  }
});
