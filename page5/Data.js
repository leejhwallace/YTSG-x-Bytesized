document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('dataSearch');
    const views = document.querySelectorAll('.data-view');

    const setView = () => {
        const value = searchInput.value.trim().toLowerCase();
        const activeView = value.includes('event') ? 'event' : 'project';

        views.forEach((view) => {
            view.classList.toggle('active', view.dataset.view === activeView);
        });
    };

    searchInput.addEventListener('input', setView);
    setView();
});
