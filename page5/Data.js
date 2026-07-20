document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'schedule-items-v1';
    const COLORS = ['#6c9aea', '#f3b342', '#df5128', '#4fae5e'];
    const searchInput = document.getElementById('dataSearch');
    const views = [...document.querySelectorAll('.data-view')];
    const status = document.getElementById('dataStatus');

    const escapeText = (value) => String(value ?? '').trim();
    const parseDate = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };
    const formatDate = (value) => {
        const date = parseDate(value);
        return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';
    };
    const toNumber = (value) => {
        const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const clear = (element) => { element.replaceChildren(); };
    const addCell = (row, value, className = '') => {
        const cell = document.createElement('td');
        if (className) cell.className = className;
        cell.textContent = value;
        row.append(cell);
        return cell;
    };
    const emptyRow = (target, message, columns) => {
        const row = document.createElement('tr');
        const cell = addCell(row, message, 'empty-cell');
        cell.colSpan = columns;
        target.append(row);
    };

    const loadItems = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((item) => item && (item.type === 'event' || item.type === 'project'))
                .map((item) => ({ ...item, name: escapeText(item.name) || 'Untitled item' }));
        } catch (error) {
            console.warn('Unable to load schedule data', error);
            return [];
        }
    };

    let items = loadItems();

    const renderLegend = (target, categories, noDataMessage) => {
        clear(target);
        if (!categories.length) {
            const message = document.createElement('p');
            message.textContent = noDataMessage;
            target.append(message);
            return;
        }
        categories.forEach((category, index) => {
            const line = document.createElement('p');
            line.style.color = COLORS[index % COLORS.length];
            line.textContent = `${category.name} ~ ${category.percent}%`;
            target.append(line);
        });
    };

    const renderOverview = () => {
        const events = items.filter((item) => item.type === 'event');
        const projects = items.filter((item) => item.type === 'project');
        const categoryCounts = new Map();

        events.forEach((event) => {
            const category = escapeText(event.category) || 'Not recorded';
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + toNumber(event.attendees));
        });

        const totalTurnout = [...categoryCounts.values()].reduce((sum, value) => sum + value, 0);
        const categories = [...categoryCounts.entries()]
            .map(([name, value]) => ({ name, value, percent: totalTurnout ? Math.round((value / totalTurnout) * 100) : 0 }))
            .sort((a, b) => b.value - a.value);
        const donut = document.getElementById('overviewDonut');
        const gradient = categories.length && totalTurnout
            ? `conic-gradient(${categories.map((category, index) => {
                const start = categories.slice(0, index).reduce((sum, current) => sum + current.percent, 0);
                const end = index === categories.length - 1 ? 100 : start + category.percent;
                return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
            }).join(', ')})`
            : 'conic-gradient(#aaa 0 100%)';
        donut.style.background = gradient;
        donut.setAttribute('aria-label', categories.length ? `Event turnout by category: ${categories.map((item) => `${item.name} ${item.percent}%`).join(', ')}` : 'No event turnout data yet');
        renderLegend(document.getElementById('overviewLegend'), categories, 'No event turnout recorded.');

        const latestEventDate = events.reduce((latest, event) => {
            const date = parseDate(event.startDate);
            return date && (!latest || date > latest) ? date : latest;
        }, null) || new Date();
        const months = Array.from({ length: 12 }, (_, index) => new Date(latestEventDate.getFullYear(), latestEventDate.getMonth() - 11 + index, 1));
        const monthlyCounts = months.map((month) => events.filter((event) => {
            const date = parseDate(event.startDate);
            return date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
        }).length);
        const maxCount = Math.max(...monthlyCounts, 0);
        const chart = document.getElementById('growthChart');
        clear(chart);
        monthlyCounts.forEach((count, index) => {
            const bar = document.createElement('span');
            bar.className = 'bar';
            bar.style.height = `${maxCount ? Math.max(5, (count / maxCount) * 100) : 5}%`;
            bar.title = `${months[index].toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${count} event${count === 1 ? '' : 's'}`;
            chart.append(bar);
        });
        chart.setAttribute('aria-label', maxCount ? `Events per month ending ${latestEventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'No events recorded in the last twelve months');

        const eventRows = document.getElementById('eventSummaryRows');
        clear(eventRows);
        const sortedEvents = [...events].sort((a, b) => (parseDate(b.startDate)?.getTime() || 0) - (parseDate(a.startDate)?.getTime() || 0));
        if (!sortedEvents.length) {
            emptyRow(eventRows, 'No events added in Schedule yet.', 3);
        } else {
            sortedEvents.slice(0, 5).forEach((event) => {
                const row = document.createElement('tr');
                const eventCell = addCell(row, event.name);
                if (event.description) {
                    const sub = document.createElement('span');
                    sub.className = 'sub';
                    sub.textContent = ` — ${escapeText(event.description)}`;
                    eventCell.append(document.createElement('br'), sub);
                }
                addCell(row, event.attendees === '' || event.attendees == null ? 'Not recorded' : String(toNumber(event.attendees)));
                addCell(row, escapeText(event.category) || 'Not recorded');
                eventRows.append(row);
            });
        }

        const contributions = new Map();
        projects.forEach((project) => {
            new Set([escapeText(project.lead), escapeText(project.assignee)].filter(Boolean)).forEach((person) => {
                contributions.set(person, (contributions.get(person) || 0) + 1);
            });
        });
        const volunteerRows = document.getElementById('volunteerSummaryRows');
        clear(volunteerRows);
        const activePeople = [...contributions.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        if (!activePeople.length) {
            emptyRow(volunteerRows, 'No project people recorded yet.', 2);
        } else {
            activePeople.slice(0, 5).forEach(([person, count]) => {
                const row = document.createElement('tr');
                addCell(row, person);
                addCell(row, String(count));
                volunteerRows.append(row);
            });
        }
    };

    const renderProject = (project) => {
        document.getElementById('projectTitle').textContent = project.name;
        document.getElementById('projectSubtitle').textContent = escapeText(project.status) || 'Project details';
        const rows = document.getElementById('projectDetailRows');
        clear(rows);
        const row = document.createElement('tr');
        addCell(row, escapeText(project.description) || 'No task description recorded');
        const start = formatDate(project.startDate);
        const end = formatDate(project.endDate);
        addCell(row, start === end ? start : `${start} – ${end}`);
        addCell(row, escapeText(project.assignee) || escapeText(project.lead) || 'Not recorded');
        addCell(row, formatDate(project.endDate));
        rows.append(row);
        document.getElementById('projectDelayReason').textContent = escapeText(project.notes) || 'No delay reason recorded.';
    };

    const renderEvent = (event) => {
        const feedback = document.getElementById('feedbackDonut');
        feedback.style.background = 'conic-gradient(#aaa 0 100%)';
        feedback.setAttribute('aria-label', `No feedback ratings recorded for ${event.name}`);
        renderLegend(document.getElementById('feedbackLegend'), [], 'No feedback ratings recorded.');

        const attendees = toNumber(event.attendees);
        const contributors = new Set(items.filter((item) => item.type === 'project').flatMap((project) => [escapeText(project.lead), escapeText(project.assignee)]).filter(Boolean));
        const total = attendees + contributors.size;
        const difference = attendees - contributors.size;
        const percentage = (value) => total ? `${Math.round((value / total) * 100)}%` : '—';
        const headcount = document.getElementById('headcountRows');
        clear(headcount);
        [
            ['Project volunteer records', contributors.size, percentage(contributors.size)],
            ['Attendee headcount', attendees, percentage(attendees)],
            ['Difference', difference, total ? percentage(Math.abs(difference)) : '—'],
        ].forEach(([label, value, percent]) => {
            const row = document.createElement('div');
            row.className = 'headcount-row';
            [['span', 'hc-label', label], ['strong', 'hc-num', String(value)], ['strong', 'hc-pct', percent]].forEach(([tag, className, text]) => {
                const element = document.createElement(tag);
                element.className = className;
                element.textContent = text;
                row.append(element);
            });
            headcount.append(row);
        });

        const reach = document.getElementById('reachMetrics');
        clear(reach);
        reach.classList.remove('has-data');
        const message = document.createElement('p');
        message.textContent = escapeText(event.location)
            ? `Reach-source metrics have not been recorded. Event location: ${escapeText(event.location)}.`
            : 'No reach-source metrics recorded for this event.';
        reach.append(message);
    };

    const showView = (name) => {
        views.forEach((view) => view.classList.toggle('active', view.dataset.view === name));
    };

    const updateSearch = () => {
        const query = escapeText(searchInput.value).toLocaleLowerCase();
        if (!query) {
            showView('overview');
            status.textContent = 'Showing all schedule data.';
            return;
        }
        const match = items.find((item) => `${item.name} ${item.description || ''} ${item.type}`.toLocaleLowerCase().includes(query));
        if (!match) {
            showView('none');
            status.textContent = 'No matching event or project found.';
            return;
        }
        if (match.type === 'project') {
            renderProject(match);
            showView('project');
        } else {
            renderEvent(match);
            showView('event');
        }
        status.textContent = `Showing data for ${match.name}.`;
    };

    const refresh = () => {
        items = loadItems();
        renderOverview();
        updateSearch();
    };

    searchInput.addEventListener('input', updateSearch);
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) refresh();
    });
    window.addEventListener('focus', refresh);
    refresh();
});
