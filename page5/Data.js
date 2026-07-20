document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('dataSearch');
    const views = document.querySelectorAll('.data-view');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const palette = ['#6c9aea', '#f3b342', '#df5128', '#4fae5e', '#9274c8'];
    const state = {
        data: null,
        selectedProject: null,
        selectedEvent: null,
    };

    const setView = (name) => views.forEach((view) => view.classList.toggle('active', view.dataset.view === name));
    const createElement = (tag, text, className) => {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    };
    const clear = (element) => element.replaceChildren();
    const percentage = (value, total) => total ? `${((value / total) * 100).toFixed(1).replace(/\.0$/, '')}%` : '0%';
    const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB') : '—';
    const formatMinutes = (minutes) => {
        const value = Number(minutes) || 0;
        const hours = Math.floor(value / 60);
        const remainder = value % 60;
        if (!hours) return `${remainder} min`;
        return `${hours} hour${hours === 1 ? '' : 's'}${remainder ? ` ${remainder} min` : ''}`;
    };
    const matching = (item, term) => `${item.name || ''} ${item.description || ''}`.toLowerCase().includes(term);

    const renderDonut = (element, values, colors) => {
        const total = values.reduce((sum, value) => sum + value, 0);
        if (!total) {
            element.style.background = '#8f8f8f';
            return;
        }
        let start = 0;
        element.style.background = `conic-gradient(${values.map((value, index) => {
            const end = start + (value / total) * 100;
            const segment = `${colors[index % colors.length]} ${start}% ${end}%`;
            start = end;
            return segment;
        }).join(', ')})`;
    };

    const renderOverview = () => {
        const { events, volunteerHours } = state.data;
        const typeTotals = new Map();
        events.forEach((event) => {
            const type = event.event_type || 'Other';
            typeTotals.set(type, (typeTotals.get(type) || 0) + Number(event.attendee_count || 0));
        });
        const types = [...typeTotals.entries()].sort((a, b) => b[1] - a[1]);
        renderDonut(document.getElementById('eventTypeDonut'), types.map(([, count]) => count), palette);
        const legend = document.getElementById('eventTypeLegend');
        clear(legend);
        const typeTotal = types.reduce((sum, [, count]) => sum + count, 0);
        if (!types.length) legend.append(createElement('p', 'No event data yet'));
        types.forEach(([type, count], index) => {
            const item = createElement('p', `${type} ~ ${percentage(count, typeTotal)}`);
            item.style.color = palette[index % palette.length];
            legend.append(item);
        });

        const monthly = new Map();
        events.forEach((event) => {
            if (!event.event_date) return;
            const month = event.event_date.slice(0, 7);
            monthly.set(month, (monthly.get(month) || 0) + 1);
        });
        const barValues = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
        const largest = Math.max(...barValues.map(([, value]) => value), 1);
        const bars = document.getElementById('eventGrowthBars');
        clear(bars);
        barValues.forEach(([month, value]) => {
            const bar = createElement('div', undefined, 'bar');
            bar.style.height = `${Math.max(4, (value / largest) * 100)}%`;
            bar.title = `${month}: ${value} event${value === 1 ? '' : 's'}`;
            bars.append(bar);
        });

        const eventRows = document.getElementById('overviewEvents');
        clear(eventRows);
        events.slice(0, 12).forEach((event) => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.append(createElement('span', event.name || 'Untitled event'));
            if (event.description) nameCell.append(document.createElement('br'), createElement('span', event.description, 'sub'));
            row.append(nameCell, createElement('td', String(event.attendee_count || 0)), createElement('td', event.event_type || 'Other'));
            eventRows.append(row);
        });
        if (!events.length) eventRows.append(emptyRow(3, 'No events have been added yet.'));

        const totalsByVolunteer = new Map();
        volunteerHours.forEach((entry) => {
            const key = `${entry.volunteer_name || 'Unknown'}\u0000${entry.department || ''}`;
            totalsByVolunteer.set(key, (totalsByVolunteer.get(key) || 0) + Number(entry.hours || 0));
        });
        const volunteers = [...totalsByVolunteer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
        const volunteerRows = document.getElementById('overviewVolunteers');
        clear(volunteerRows);
        volunteers.forEach(([key, hours]) => {
            const [name, department] = key.split('\u0000');
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.append(createElement('span', name));
            if (department) nameCell.append(document.createElement('br'), createElement('span', department, 'sub'));
            row.append(nameCell, createElement('td', `${hours.toFixed(2).replace(/\.00$/, '')} hrs`));
            volunteerRows.append(row);
        });
        if (!volunteers.length) volunteerRows.append(emptyRow(2, 'No volunteer hours have been logged yet.'));
    };

    const emptyRow = (columns, message) => {
        const row = document.createElement('tr');
        const cell = createElement('td', message, 'sub');
        cell.colSpan = columns;
        row.append(cell);
        return row;
    };

    const renderProject = (project) => {
        state.selectedProject = project;
        const tasks = state.data.projectTasks.filter((task) => task.project_id === project.id);
        const calculatedMinutes = tasks.reduce((total, task) => total + Number(task.duration_minutes || 0), 0);
        const totalMinutes = project.manual_total_minutes ?? calculatedMinutes;
        document.getElementById('projectTotalHours').textContent = formatMinutes(totalMinutes);
        document.getElementById('projectDelayReason').textContent = project.delay_reason || 'No delays recorded.';
        const rows = document.getElementById('projectTasks');
        clear(rows);
        tasks.forEach((task) => {
            const row = document.createElement('tr');
            row.append(
                createElement('td', task.task_name || 'Untitled task'),
                createElement('td', formatMinutes(task.duration_minutes)),
                createElement('td', task.completed_by || '—'),
                createElement('td', formatDate(task.completed_at)),
            );
            rows.append(row);
        });
        if (!tasks.length) rows.append(emptyRow(4, 'No tasks have been logged for this project.'));
    };

    const renderEvent = (event) => {
        state.selectedEvent = event;
        const feedback = state.data.feedback.filter((entry) => entry.event_id === event.id);
        const ratings = [5, 4, 3, 2, 1].map((rating) => feedback.filter((entry) => Number(entry.rating) === rating).length);
        renderDonut(document.getElementById('ratingDonut'), ratings, ['#f3b342', '#6c9aea', '#4fae5e', '#df5128', '#9274c8']);
        const ratingLabels = document.getElementById('ratingLabels');
        clear(ratingLabels);
        const feedbackTotal = ratings.reduce((sum, value) => sum + value, 0);
        ratings.forEach((count, index) => {
            const label = createElement('p', `${5 - index} Stars ~ ${percentage(count, feedbackTotal)}`);
            label.style.color = ['#f3b342', '#6c9aea', '#4fae5e', '#df5128', '#9274c8'][index];
            ratingLabels.append(label);
        });

        const demographics = state.data.demographics.filter((entry) => entry.event_id === event.id);
        const demographicsByGroup = new Map();
        demographics.forEach((entry) => {
            const current = demographicsByGroup.get(entry.age_group) || { first: 0, returning: 0 };
            current[entry.is_first_timer ? 'first' : 'returning'] += Number(entry.attendee_count || 0);
            demographicsByGroup.set(entry.age_group, current);
        });
        const barContainer = document.getElementById('demographicBars');
        clear(barContainer);
        const groupLabels = { children: 'children (3-12)', teenagers: 'teenagers (13-19)', adults: 'adults (20-39)' };
        Object.entries(groupLabels).forEach(([group, label]) => {
            const counts = demographicsByGroup.get(group) || { first: 0, returning: 0 };
            const total = counts.first + counts.returning;
            const col = createElement('div', undefined, 'demo-col');
            const stack = createElement('div', undefined, 'demo-group');
            stack.style.height = `${Math.max(12, Math.min(55, total * 2))}px`;
            const first = createElement('span', percentage(counts.first, total), 'demo-seg seg-orange');
            const returning = createElement('span', percentage(counts.returning, total), 'demo-seg seg-yellow');
            first.style.flex = String(counts.first || 0.001);
            returning.style.flex = String(counts.returning || 0.001);
            stack.append(first, returning);
            col.append(stack, createElement('span', label, 'demo-label'));
            barContainer.append(col);
        });
        const allDemographics = demographics.reduce((sum, entry) => sum + Number(entry.attendee_count || 0), 0);
        const firstTimers = demographics.filter((entry) => entry.is_first_timer).reduce((sum, entry) => sum + Number(entry.attendee_count || 0), 0);
        const key = document.getElementById('demographicKey');
        clear(key);
        key.append(createElement('p', `First timers ~ ${percentage(firstTimers, allDemographics)}`, 'demo-key first-timer'));
        key.append(createElement('p', `Returning ~ ${percentage(allDemographics - firstTimers, allDemographics)}`, 'demo-key returning'));

        const volunteers = Number(event.volunteer_count || 0);
        const attendees = Number(event.attendee_count || 0);
        const difference = volunteers - attendees;
        document.getElementById('volunteerHeadcount').textContent = volunteers;
        document.getElementById('volunteerHeadcountPct').textContent = volunteers ? '100%' : '0%';
        document.getElementById('attendeeHeadcount').textContent = attendees;
        document.getElementById('attendeeHeadcountPct').textContent = percentage(attendees, volunteers);
        document.getElementById('headcountDifference').textContent = difference;
        document.getElementById('headcountDifferencePct').textContent = percentage(Math.abs(difference), volunteers);

        const reach = state.data.reach.filter((entry) => entry.event_id === event.id);
        const sources = ['Word of Mouth', 'Website', 'Social Media'];
        const reaches = sources.map((source) => reach.filter((entry) => entry.source === source).reduce((sum, entry) => sum + Number(entry.reach_count || 0), 0));
        const reachTotal = reaches.reduce((sum, value) => sum + value, 0);
        ['reachWord', 'reachWebsite', 'reachSocial'].forEach((id, index) => { document.getElementById(id).style.flex = String(reaches[index] || 0.001); });
        ['reachWordLabel', 'reachWebsiteLabel', 'reachSocialLabel'].forEach((id, index) => { document.getElementById(id).textContent = `${sources[index]} ~ ${percentage(reaches[index], reachTotal)}`; });
    };

    const updateViewForSearch = () => {
        const term = searchInput.value.trim().toLowerCase();
        if (!term) return setView('overview');
        const project = state.data.projects.find((item) => matching(item, term));
        const event = state.data.events.find((item) => matching(item, term));
        if (project) {
            renderProject(project);
            return setView('project');
        }
        if (event) {
            renderEvent(event);
            return setView('event');
        }
        noResultsMessage.textContent = `No event or project matches “${searchInput.value.trim()}”.`;
        setView('none');
    };

    const saveProject = async (changes) => {
        if (!state.selectedProject) return;
        const response = await fetch(`/api/data/projects/${encodeURIComponent(state.selectedProject.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to save the project.');
        await loadData();
    };

    document.querySelector('.project-hours .edit-button').addEventListener('click', async () => {
        if (!state.selectedProject) return;
        const current = state.selectedProject.manual_total_minutes ?? state.data.projectTasks
            .filter((task) => task.project_id === state.selectedProject.id)
            .reduce((total, task) => total + Number(task.duration_minutes || 0), 0);
        const value = window.prompt('Total time spent (whole minutes):', current);
        if (value === null) return;
        try {
            await saveProject({ totalMinutes: value.trim() });
        } catch (error) {
            window.alert(error.message);
        }
    });
    document.querySelector('.project-reasons .edit-button').addEventListener('click', async () => {
        if (!state.selectedProject) return;
        const value = window.prompt('Reason for delays:', state.selectedProject.delay_reason || '');
        if (value === null) return;
        try {
            await saveProject({ delayReason: value });
        } catch (error) {
            window.alert(error.message);
        }
    });

    const loadData = async () => {
        searchInput.placeholder = 'Loading data…';
        searchInput.disabled = true;
        try {
            const response = await fetch('/api/data');
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || 'Unable to load Page 5 data.');
            state.data = body;
            renderOverview();
            updateViewForSearch();
        } catch (error) {
            noResultsMessage.textContent = error.message;
            setView('none');
        } finally {
            searchInput.placeholder = 'Search Event/Project';
            searchInput.disabled = false;
        }
    };

    searchInput.addEventListener('input', () => state.data && updateViewForSearch());
    loadData();
});
