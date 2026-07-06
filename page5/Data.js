document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('dataSearch');
    const views = document.querySelectorAll('.data-view');

    // Valid search keywords mapped to the views based on the mockup
    const projects = ['project', 'project 1'];
    const events   = ['event', 'event 1'];

    const setView = () => {
        const raw = searchInput.value.trim();
        const value = raw.toLowerCase();
        
        let target = 'overview';

        if (value.length > 0) {
            // Evaluates instantly if the user starts typing exactly what's expected
            const isProject = projects.some(p => p.startsWith(value));
            const isEvent = events.some(e => e.startsWith(value));

            if (isProject) {
                target = 'project';
            } else if (isEvent) {
                target = 'event';
            } else {
                target = 'none'; // Fallback for invalid searches
            }
        } else {
            target = 'overview'; // Default home state
        }

        views.forEach(view => {
            view.classList.toggle('active', view.dataset.view === target);
        });
    };

    searchInput.addEventListener('input', setView);

    // Initial check on load
    setView(); 
});