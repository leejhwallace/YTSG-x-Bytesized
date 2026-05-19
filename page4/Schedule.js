document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('.add-button');
    const editorSheet = document.querySelector('.editor-sheet');
    const closeButton = document.querySelector('.editor-close');
    const saveButton = document.querySelector('.editor-save');
    const tabs = document.querySelectorAll('.editor-tab');
    const columns = document.querySelectorAll('.editor-column');

    if (!editorSheet || !addButton) return;

    addButton.addEventListener('click', () => {
        editorSheet.classList.add('open');
        editorSheet.setAttribute('aria-hidden', 'false');
    });

    const closeEditor = () => {
        editorSheet.classList.remove('open');
        editorSheet.setAttribute('aria-hidden', 'true');
    };

    closeButton.addEventListener('click', closeEditor);
    saveButton.addEventListener('click', closeEditor);

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
        });
    });

    // Initialize: show only event column by default
    const eventColumn = document.querySelector('.editor-event');
    const projectColumn = document.querySelector('.editor-project');
    if (eventColumn) eventColumn.style.display = 'grid';
    if (projectColumn) projectColumn.style.display = 'none';

    const monthLabel = document.getElementById('monthLabel');
    const prevButton = document.querySelector('.month-prev');
    const nextButton = document.querySelector('.month-next');
    const dayStrip = document.querySelector('.day-strip');
    const calendarSection = document.querySelector('.calendar');

    // Read day column width from CSS so JS & CSS stay in sync
    const cssDayWidth = getComputedStyle(document.documentElement).getPropertyValue('--day-width');
    const DAY_WIDTH = parseInt(cssDayWidth, 10) || 100;

    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();

    const formatMonthYear = (year, month) => {
        return new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

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

            let todayMarker = document.querySelector('.today-marker');
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

    const renderCalendar = () => {
        if (monthLabel) {
            monthLabel.textContent = formatMonthYear(currentYear, currentMonth);
        }
        renderDayStrip(currentYear, currentMonth);
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

    renderCalendar();

    // No sample events or projects — keep arrays empty for real data integration
    const events = [];
    const projects = [];


    const renderCalendarItems = (year, month) => {
        const content = document.querySelector('.calendar-content');
        content.innerHTML = '';

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const allItems = [...projects, ...events].sort((a, b) => a.startDate - b.startDate);
        let rowIndex = 0;
        const rowMap = {};

        allItems.forEach((item) => {
            // Only show items that overlap with current month
            if (item.endDate < monthStart || item.startDate > monthEnd) return;

            // Find or assign row
            if (!rowMap[item.id]) {
                rowMap[item.id] = rowIndex;
                rowIndex += 1;
            }

            const row = rowMap[item.id];
            const startDay = Math.max(1, item.startDate.getDate());
            const endDay = Math.min(monthEnd.getDate(), item.endDate.getDate());

            // Position using DAY_WIDTH so columns align with CSS
            const left = (startDay - 1) * DAY_WIDTH;
            const width = (endDay - startDay + 1) * DAY_WIDTH;
            const top = row * 50 + 12;

            const itemEl = document.createElement('div');
            itemEl.className = `calendar-item ${item.type}`;
            itemEl.textContent = item.name;
            itemEl.style.left = `${left}px`;
            itemEl.style.width = `${width}px`;
            itemEl.style.top = `${top}px`;

            content.appendChild(itemEl);
        });

        // Set minimum height for content
        content.style.minHeight = `${Math.max(200, rowIndex * 50 + 60)}px`;
    };

    // Initial render
    renderCalendarItems(currentYear, currentMonth);

    // Re-render when month changes
    const originalRenderCalendar = renderCalendar;
    renderCalendar = () => {
        originalRenderCalendar();
        renderCalendarItems(currentYear, currentMonth);
    };
});