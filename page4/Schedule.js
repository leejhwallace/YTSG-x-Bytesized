document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('.add-button');
    const editorSheet = document.querySelector('.editor-sheet');
    const closeButton = document.querySelector('.editor-close');
    const saveButton = document.querySelector('.editor-save');
    const tabs = document.querySelectorAll('.editor-tab');
    const columns = document.querySelectorAll('.editor-column');
    const searchInput = document.querySelector('.search-box input');

    if (!editorSheet || !addButton) return;

    const STORAGE_KEY = 'schedule-items-v1';
    const monthLabel = document.getElementById('monthLabel');
    const prevButton = document.querySelector('.month-prev');
    const nextButton = document.querySelector('.month-next');
    const dayStrip = document.querySelector('.day-strip');
    const calendarSection = document.querySelector('.calendar');

    const cssDayWidth = getComputedStyle(document.documentElement).getPropertyValue('--day-width');
    const DAY_WIDTH = parseInt(cssDayWidth, 10) || 100;
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();

    const items = [];

    const formatMonthYear = (year, month) => {
        return new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

    const loadItems = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return;
            parsed.forEach((item) => {
                items.push({
                    ...item,
                    startDate: new Date(item.startDate),
                    endDate: new Date(item.endDate),
                });
            });
        } catch (error) {
            console.warn('Unable to load schedule items', error);
        }
    };

    const saveItems = () => {
        try {
            const serializable = items.map((item) => ({
                ...item,
                startDate: item.startDate.toISOString(),
                endDate: item.endDate.toISOString(),
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
        } catch (error) {
            console.warn('Unable to save schedule items', error);
        }
    };

    let activeItem = null;

    const resetForm = () => {
        activeItem = null;
        editorSheet.querySelectorAll('input').forEach((input) => {
            input.value = '';
        });
    };

    const getActiveType = () => document.querySelector('.editor-tab.active')?.getAttribute('data-type') || 'event';

    const parseDateValue = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
        return null;
    };

    const fillEditorForItem = (item) => {
        activeItem = item;

        tabs.forEach((tab) => {
            const selected = tab.getAttribute('data-type') === item.type;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-selected', selected.toString());
        });

        columns.forEach((column) => {
            if (column.classList.contains(`editor-${item.type}`)) {
                column.style.display = 'grid';
            } else {
                column.style.display = 'none';
            }
        });

        const column = document.querySelector(`.editor-${item.type}`);
        const setField = (field, value) => {
            const input = column?.querySelector(`[data-field="${field}"]`);
            if (input) {
                input.value = value || '';
            }
        };

        setField('name', item.name);
        setField('description', item.description);
        setField('notes', item.notes);

        if (item.type === 'event') {
            setField('location', item.location);
            setField('category', item.category);
            setField('attendees', item.attendees);
            setField('date', item.startDate ? item.startDate.toISOString().slice(0, 10) : '');
        } else if (item.type === 'project') {
            setField('lead', item.lead);
            setField('status', item.status);
            setField('priority', item.priority);
            setField('assignee', item.assignee);
            setField('startDate', item.startDate ? item.startDate.toISOString().slice(0, 10) : '');
            setField('endDate', item.endDate ? item.endDate.toISOString().slice(0, 10) : '');
        }
    };

    const closeEditor = () => {
        editorSheet.classList.remove('open');
        editorSheet.setAttribute('aria-hidden', 'true');
        resetForm();
    };

    const openEditor = () => {
        editorSheet.classList.add('open');
        editorSheet.setAttribute('aria-hidden', 'false');
    };

    addButton.addEventListener('click', () => {
        resetForm();
        openEditor();
    });

    closeButton.addEventListener('click', closeEditor);
    saveButton.addEventListener('click', () => {
        const activeType = getActiveType();
        const column = activeType === 'project' ? document.querySelector('.editor-project') : document.querySelector('.editor-event');
        const nameInput = column?.querySelector('[data-field="name"]');
        const name = nameInput?.value?.trim();

        if (!name) {
            return;
        }

        const updatedItem = {
            id: activeItem?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: activeType,
            name,
            description: column?.querySelector('[data-field="description"]')?.value?.trim() || '',
            location: column?.querySelector('[data-field="location"]')?.value?.trim() || '',
            category: column?.querySelector('[data-field="category"]')?.value?.trim() || '',
            notes: column?.querySelector('[data-field="notes"]')?.value?.trim() || '',
            attendees: column?.querySelector('[data-field="attendees"]')?.value?.trim() || '',
            lead: column?.querySelector('[data-field="lead"]')?.value?.trim() || '',
            status: column?.querySelector('[data-field="status"]')?.value?.trim() || '',
            priority: column?.querySelector('[data-field="priority"]')?.value?.trim() || '',
            assignee: column?.querySelector('[data-field="assignee"]')?.value?.trim() || '',
            startDate: parseDateValue(column?.querySelector('[data-field="startDate"]')?.value || column?.querySelector('[data-field="date"]')?.value) || new Date(currentYear, currentMonth, 1),
            endDate: parseDateValue(column?.querySelector('[data-field="endDate"]')?.value || column?.querySelector('[data-field="date"]')?.value) || parseDateValue(column?.querySelector('[data-field="startDate"]')?.value || column?.querySelector('[data-field="date"]')?.value) || new Date(currentYear, currentMonth, 1),
        };

        if (activeItem) {
            const index = items.findIndex((item) => item.id === activeItem.id);
            if (index !== -1) {
                items[index] = updatedItem;
            }
        } else {
            items.push(updatedItem);
        }

        saveItems();
        closeEditor();
        renderCalendarItems(currentYear, currentMonth);
    });

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-type');

            tabs.forEach((otherTab) => {
                const selected = otherTab === tab;
                otherTab.classList.toggle('active', selected);
                otherTab.setAttribute('aria-selected', selected.toString());
            });

            columns.forEach((column) => {
                if (column.classList.contains(`editor-${tabType}`)) {
                    column.style.display = 'grid';
                } else {
                    column.style.display = 'none';
                }
            });

            resetForm();
        });
    });

    const eventColumn = document.querySelector('.editor-event');
    const projectColumn = document.querySelector('.editor-project');
    if (eventColumn) eventColumn.style.display = 'grid';
    if (projectColumn) projectColumn.style.display = 'none';

    const renderDayStrip = (year, month) => {
        dayStrip.innerHTML = '';
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
            const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
            const dayBox = document.createElement('div');
            dayBox.className = 'day';

            if (date.toDateString() === today.toDateString()) {
                dayBox.classList.add('today-day');
            }

            dayBox.innerHTML = `<strong>${String(day).padStart(2, '0')} ${monthShort}</strong><span>${weekday}</span>`;
            dayStrip.appendChild(dayBox);
        }

        const calendarContent = document.querySelector('.calendar-content');
        const calendarGrid = document.querySelector('.calendar-grid');
        const totalWidth = daysInMonth * DAY_WIDTH;

        if (dayStrip) {
            dayStrip.style.width = `${totalWidth}px`;
        }

        if (calendarGrid) {
            calendarGrid.style.width = `${totalWidth}px`;
            calendarGrid.style.minWidth = `${totalWidth}px`;
        }

        if (calendarContent) {
            calendarContent.style.width = `${totalWidth}px`;
            calendarContent.style.minWidth = `${totalWidth}px`;

            let todayMarker = calendarContent.querySelector('.today-marker');
            if (!todayMarker) {
                todayMarker = document.createElement('div');
                todayMarker.className = 'today-marker';
                todayMarker.innerHTML = '<span>Today</span>';
                calendarContent.appendChild(todayMarker);
            }
            if (year === today.getFullYear() && month === today.getMonth()) {
                const left = (today.getDate() - 1) * DAY_WIDTH;
                todayMarker.style.left = `${left}px`;
                todayMarker.style.display = 'block';
            } else {
                todayMarker.style.display = 'none';
            }
        }

        calendarSection.setAttribute('aria-label', `${formatMonthYear(year, month)} schedule calendar`);
    };

    const renderCalendarItems = (year, month) => {
        const content = document.querySelector('.calendar-content');
        if (!content) return;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const dayMs = 24 * 60 * 60 * 1000;
        const visibleItems = items.filter((item) => {
            if (item.endDate < monthStart || item.startDate > monthEnd) return false;
            if (!state.searchTerm) return true;
            const haystack = `${item.name} ${item.description} ${item.location} ${item.category} ${item.lead} ${item.assignee} ${item.status} ${item.priority} ${item.notes}`.toLowerCase();
            return haystack.includes(state.searchTerm);
        }).sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);

        const rows = [];
        content.querySelectorAll('.calendar-item').forEach((itemEl) => itemEl.remove());

        visibleItems.forEach((item) => {
            let rowIndex = 0;
            while (rowIndex < rows.length && rows[rowIndex].some((existing) => existing.endDate >= item.startDate && item.endDate >= existing.startDate)) {
                rowIndex += 1;
            }

            if (!rows[rowIndex]) {
                rows[rowIndex] = [];
            }
            rows[rowIndex].push(item);

            const startOffset = Math.max(0, Math.round((item.startDate - monthStart) / dayMs));
            const endOffset = Math.min(new Date(year, month + 1, 0).getDate() - 1, Math.round((item.endDate - monthStart) / dayMs));
            const spanDays = Math.max(1, endOffset - startOffset + 1);
            const left = startOffset * DAY_WIDTH;
            const width = spanDays * DAY_WIDTH;
            const top = rowIndex * 50 + 12;

            const itemEl = document.createElement('div');
            itemEl.className = `calendar-item ${item.type}`;
            itemEl.dataset.id = item.id;
            itemEl.dataset.type = item.type;
            itemEl.style.left = `${left}px`;
            itemEl.style.width = `${width}px`;
            itemEl.style.top = `${top}px`;
            itemEl.style.cursor = 'pointer';
            itemEl.innerHTML = `<span class="calendar-label">${item.name}</span>`;
            itemEl.addEventListener('click', (event) => {
                event.stopPropagation();
                fillEditorForItem(item);
                openEditor();
            });
            content.appendChild(itemEl);
        });

        content.style.minHeight = `${Math.max(220, rows.length * 50 + 80)}px`;
    };

    const state = {
        searchTerm: '',
    };

    const renderCalendar = () => {
        if (monthLabel) {
            monthLabel.textContent = formatMonthYear(currentYear, currentMonth);
        }
        renderDayStrip(currentYear, currentMonth);
        renderCalendarItems(currentYear, currentMonth);
    };

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            currentMonth -= 1;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear -= 1;
            }
            renderCalendar();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentMonth += 1;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear += 1;
            }
            renderCalendar();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            state.searchTerm = event.target.value.trim().toLowerCase();
            renderCalendarItems(currentYear, currentMonth);
        });
    }

    loadItems();
    renderCalendar();
});