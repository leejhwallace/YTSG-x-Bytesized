document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('dataSearch');
    const views = document.querySelectorAll('.data-view');

    /* ── Sample data for matching ── */
    const projects = ['project 1', 'project 2', 'project 3'];
    const events   = ['event 1', 'event 2', 'event 3',
                      'event one', 'event two', 'event three'];

    /**
     * Determine which view to show based on search input.
     *  - Empty  → overview
     *  - Matches a project name → project
     *  - Matches an event name  → event
     *  - No match → no-results
     */
    const setView = () => {
        const raw   = searchInput.value.trim();
        const value = raw.toLowerCase();

        let target = 'overview';                       // default

        if (value.length > 0) {
            const isProject = projects.some(p => p.includes(value) || value.includes(p));
            const isEvent   = events.some(e => e.includes(value) || value.includes(e));

            if (isProject) {
                target = 'project';
            } else if (isEvent) {
                target = 'event';
            } else {
                // If the search contains "project" keyword, assume project
                if (value.includes('project')) {
                    target = 'project';
                } else if (value.includes('event')) {
                    target = 'event';
                } else {
                    target = 'none';                   // no results
                }
            }
        }

        views.forEach(view => {
            view.classList.toggle('active', view.dataset.view === target);
        });
    };

    searchInput.addEventListener('input', setView);

    /* Run once on load — empty search shows overview */
    setView();
});
