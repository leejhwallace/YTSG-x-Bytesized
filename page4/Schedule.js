document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase using window credentials from HTML
    const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    // Hide body to prevent client-side routing exploit before auth verifies
    document.body.style.display = 'none';
    
    // Fetch the current user session
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    
    // If no user is logged in, force redirect to the Get Started page
    if (!authData?.user || authError) {
        window.location.replace('../page1/Get_Started.html');
        return;
    }
    
    // Reveal body content only after authentication successfully verifies
    document.body.style.display = 'block';
    
    // State Variables
    const state = { searchTerm: '' };
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();
    let items = [];
    let validUsersList = [];
    let currentUserDisplayName = authData.user?.user_metadata?.full_name || '';
    let currentAssignees = [];
    let activeItem = null;
    
    const addButton = document.querySelector('.add-button');
    const editorSheet = document.querySelector('.editor-sheet');
    const closeButton = document.querySelector('.editor-close');
    const saveButton = document.querySelector('.editor-save');
    const deleteButton = document.querySelector('.editor-delete');
    const tabs = document.querySelectorAll('.editor-tab');
    const searchInput = document.querySelector('.search-box input');
    
    if (!editorSheet || !addButton) return;
    
    const monthLabel = document.getElementById('monthLabel');
    const prevButton = document.querySelector('.month-prev');
    const nextButton = document.querySelector('.month-next');
    const dayStrip = document.querySelector('.day-strip');
    const calendarSection = document.querySelector('.calendar');
    const cssDayWidth = getComputedStyle(document.documentElement).getPropertyValue('--day-width');
    const DAY_WIDTH = parseInt(cssDayWidth, 10) || 100;
    
    const assigneeInputEle = document.getElementById('assignee-input');
    const assigneeChipsEle = document.getElementById('assignee-chips');
    const hiddenAssigneeEle = document.getElementById('hidden-assignee');
    const selectAllBtn = document.getElementById('select-all-btn');
    const parentSelectEle = document.getElementById('project-parent-select');

    // -- STRICT LOCAL TIME FIXES --
    const formatDateForDB = (dateObj) => {
        if (!dateObj || isNaN(dateObj.getTime())) return null;
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    const parseDBDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length !== 3) return null;
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return isNaN(d.getTime()) ? null : d;
    };
    
    const renderChips = () => {
        if (!assigneeChipsEle) return;
        assigneeChipsEle.innerHTML = '';
        currentAssignees.forEach(name => {
            const chip = document.createElement('div');
            chip.className = 'assignee-chip';
            chip.innerHTML = `<span>${name}</span><button type="button" data-name="${name}">&#10005;</button>`;
            assigneeChipsEle.appendChild(chip);
        });
        if (hiddenAssigneeEle) {
            hiddenAssigneeEle.value = currentAssignees.join(', ');
        }
    };

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentAssignees = [...validUsersList];
            renderChips();
        });
    }

    if (assigneeInputEle) {
        assigneeInputEle.addEventListener('change', (e) => {
            const name = e.target.value.trim();
            if (!name) return;

            if (validUsersList.includes(name) && !currentAssignees.includes(name)) {
                currentAssignees.push(name);
                e.target.value = '';
                renderChips();
            } else if (!validUsersList.includes(name)) {
                alert(`Error: "${name}" is not a registered user.`);
                e.target.value = '';
            } else {
                e.target.value = '';
            }
        });
    }

    if (assigneeChipsEle) {
        assigneeChipsEle.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const nameToRemove = e.target.getAttribute('data-name');
                currentAssignees = currentAssignees.filter(n => n !== nameToRemove);
                renderChips();
            }
        });
    }

    const formatMonthYear = (year, month) => {
        return new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

    const loadItems = async () => {
        try {
            const [projectsResponse, eventsResponse] = await Promise.all([
                supabaseClient.from('Project').select('project_discription, project_name, starting_date, ending_date, project_lead, pirority, "assign _to", status, parent_id'),
                supabaseClient.from('Event').select('*')
            ]);

            if (projectsResponse.error) console.error("Error fetching projects:", projectsResponse.error.message);
            if (eventsResponse.error) console.error("Error fetching events:", eventsResponse.error.message);

            if (parentSelectEle && projectsResponse.data) {
                parentSelectEle.innerHTML = '<option value="">None (Is a Master Project)</option>';
                projectsResponse.data.forEach(p => {
                    if (!p.parent_id) {
                        const opt = document.createElement('option');
                        opt.value = p.project_discription;
                        opt.textContent = p.project_name || 'Unnamed Project';
                        parentSelectEle.appendChild(opt);
                    }
                });
            }

            let rawItems = [];

            if (projectsResponse.data) {
                rawItems.push(...projectsResponse.data.map(dbItem => ({
                    dbId: dbItem.project_name, 
                    id: dbItem.project_name,
                    type: 'project',
                    name: dbItem.project_name || '',
                    description: dbItem.project_discription || '',
                    startDate: parseDBDate(dbItem.starting_date),
                    endDate: parseDBDate(dbItem.ending_date),
                    lead: dbItem.project_lead || '',
                    priority: dbItem.pirority || '',
                    assignee: dbItem["assign _to"] || '',
                    status: dbItem.status || '',
                    parentId: dbItem.parent_id || null
                })));
            }

            if (eventsResponse.data) {
                rawItems.push(...eventsResponse.data.map(dbItem => {
                    const attendeesVal = (dbItem.number_of_attendees && typeof dbItem.number_of_attendees === 'object' && dbItem.number_of_attendees.count)
                        ? dbItem.number_of_attendees.count
                        : (dbItem.number_of_attendees || '');

                    return {
                        dbId: dbItem.event_name,
                        id: dbItem.event_name,
                        type: 'event',
                        name: dbItem.event_name || '',
                        description: dbItem.event_discription || '',
                        startDate: parseDBDate(dbItem.date_of_event),
                        endDate: parseDBDate(dbItem.date_of_event),
                        location: dbItem.location || '',
                        category: dbItem.event_catergory || '',
                        notes: dbItem.additional_notes || '',
                        attendees: attendeesVal
                    };
                }));
            }

            // Keep all items so all saved projects appear on the schedule
            items = rawItems;
        } catch (error) {
            console.warn('Unable to load schedule items', error);
        } finally {
            renderCalendar();
        }
    };

    const loadUsers = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('display_name');
            const userList = document.getElementById('user-list');

            if (error) return;

            if (data && userList) {
                userList.innerHTML = '';
                validUsersList = [];
                data.forEach(user => {
                    if (user.display_name) {
                        const option = document.createElement('option');
                        option.value = user.display_name;
                        userList.appendChild(option);
                        validUsersList.push(user.display_name);
                    }
                });
            }
        } catch (error) {
            console.warn('Unable to load users', error);
        }
    };

    const resetForm = () => {
        activeItem = null;
        editorSheet.querySelectorAll('input, select').forEach((element) => {
            element.value = '';
        });
        tabs.forEach(tab => {
            tab.disabled = false;
            tab.style.pointerEvents = 'auto';
            tab.style.opacity = '1';
        });
        currentAssignees = [];
        renderChips();
        if (parentSelectEle) parentSelectEle.value = '';
        if (deleteButton) deleteButton.style.display = 'none';
    };

    const getActiveType = () => document.querySelector('.editor-tab.active')?.getAttribute('data-type') || 'event';

    const fillEditorForItem = (item) => {
        activeItem = item;

        tabs.forEach((tab) => {
            const selected = tab.getAttribute('data-type') === item.type;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-selected', selected.toString());
            tab.disabled = !selected;
            tab.style.pointerEvents = selected ? 'auto' : 'none';
            tab.style.opacity = selected ? '1' : '0.5';
        });

        const allCols = document.querySelectorAll('.editor-column');
        allCols.forEach((col) => {
            if (col.classList.contains(`editor-${item.type}`)) {
                col.style.display = 'grid';
            } else {
                col.style.display = 'none';
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
            setField('date', formatDateForDB(item.startDate));
        } else if (item.type === 'project') {
            setField('lead', item.lead);
            setField('status', item.status);
            setField('priority', item.priority);
            setField('startDate', formatDateForDB(item.startDate));
            setField('endDate', formatDateForDB(item.endDate));

            currentAssignees = item.assignee ? String(item.assignee).split(',').map(s => s.trim()).filter(Boolean) : [];
            renderChips();

            if (parentSelectEle) parentSelectEle.value = item.parentId || '';
        }
        if (deleteButton && item.dbId) {
            deleteButton.style.display = 'inline-block';
        }
    };

    const closeEditor = () => {
        if (document.activeElement) {
            document.activeElement.blur();
        }
        editorSheet.classList.remove('open');
        editorSheet.setAttribute('aria-hidden', 'true');
        resetForm();
    };

    const openEditor = () => {
        editorSheet.classList.add('open');
        editorSheet.setAttribute('aria-hidden', 'false');
    };

    if (addButton) {
        addButton.addEventListener('click', () => {
            resetForm();
            openEditor();
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeEditor);
    }

    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
            if (!activeItem || !activeItem.dbId) return;

            const confirmation = confirm(`Are you sure you want to delete this ${activeItem.type}? This action cannot be reversed.`);
            if (!confirmation) return;
            try {
                let error = null;
                if (activeItem.type === 'project') {
                    const response = await supabaseClient
                        .from('Project')
                        .delete()
                        .eq('project_name', activeItem.dbId);
                    error = response.error;
                } else if (activeItem.type === 'event') {
                    const response = await supabaseClient
                        .from('Event')
                        .delete()
                        .eq('event_name', activeItem.dbId);
                    error = response.error;
                }
                if (error) throw error;
                alert('Deleted successfully!');
                closeEditor();
                await loadItems();
            } catch (err) {
                console.error('Error deleting item:', err.message);
                alert('Failed to delete item: ' + err.message);
            }
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const activeType = getActiveType();
            const column = activeType === 'project' ? document.querySelector('.editor-project') : document.querySelector('.editor-event');
            const nameInput = column?.querySelector('[data-field="name"]');
            const name = nameInput?.value?.trim();

            if (!name) {
                alert("Name is required!");
                return;
            }

            let finalAssignees = [...currentAssignees];
            const pendingInput = assigneeInputEle?.value?.trim();

            if (activeType === 'project' && pendingInput) {
                if (validUsersList.includes(pendingInput) && !finalAssignees.includes(pendingInput)) {
                    finalAssignees.push(pendingInput);
                } else if (!validUsersList.includes(pendingInput)) {
                    alert(`Error: "${pendingInput}" is not a registered user. Please clear it or use a valid user.`);
                    return;
                }
            }

            const rawStart = column?.querySelector('[data-field="startDate"]')?.value || column?.querySelector('[data-field="date"]')?.value;
            const rawEnd = column?.querySelector('[data-field="endDate"]')?.value || column?.querySelector('[data-field="date"]')?.value;

            const startDateParsed = parseDBDate(rawStart) || new Date(currentYear, currentMonth, 1);
            const endDateParsed = parseDBDate(rawEnd) || startDateParsed;

            // Automatically switch calendar view to the newly saved project's month/year
            currentYear = startDateParsed.getFullYear();
            currentMonth = startDateParsed.getMonth();

            const updatedItem = {
                type: activeType,
                name,
                description: column?.querySelector('[data-field="description"]')?.value?.trim() || '',
                location: column?.querySelector('[data-field="location"]')?.value?.trim() || '',
                category: column?.querySelector('[data-field="category"]')?.value?.trim() || '',
                notes: column?.querySelector('[data-field="notes"]')?.value?.trim() || '',
                attendees: column?.querySelector('[data-field="attendees"]')?.value?.trim() || '0',
                lead: column?.querySelector('[data-field="lead"]')?.value?.trim() || '',
                status: column?.querySelector('[data-field="status"]')?.value?.trim() || '',
                priority: column?.querySelector('[data-field="priority"]')?.value?.trim() || '',
                assignee: finalAssignees.join(', '),
                startDate: startDateParsed,
                endDate: endDateParsed,
            };

            if (activeType === 'project') {
                const parentIdValue = parentSelectEle ? parentSelectEle.value : null;
                const dbPayload = {
                    project_name: updatedItem.name,
                    project_discription: updatedItem.description,
                    starting_date: formatDateForDB(updatedItem.startDate),
                    ending_date: formatDateForDB(updatedItem.endDate),
                    project_lead: updatedItem.lead,
                    pirority: updatedItem.priority,
                    "assign _to": updatedItem.assignee,
                    status: updatedItem.status,
                    parent_id: parentIdValue || null
                };

                let error = null;
                if (activeItem && activeItem.dbId && activeItem.type === 'project') {
                    const response = await supabaseClient.from('Project').update(dbPayload).eq('project_name', activeItem.dbId);
                    error = response.error;
                } else {
                    const response = await supabaseClient.from('Project').insert([dbPayload]);
                    error = response.error;
                }

                if (error) {
                    console.error("Error saving project to Supabase:", error.message);
                    alert("Failed to save project: " + error.message);
                    return;
                }
            } else if (activeType === 'event') {
                const dbPayload = {
                    event_name: updatedItem.name,
                    event_discription: updatedItem.description,
                    date_of_event: formatDateForDB(updatedItem.startDate),
                    location: updatedItem.location,
                    event_catergory: updatedItem.category,
                    additional_notes: updatedItem.notes,
                    number_of_attendees: { count: parseInt(updatedItem.attendees, 10) || 0 }
                };

                let error = null;
                if (activeItem && activeItem.dbId && activeItem.type === 'event') {
                    const response = await supabaseClient.from('Event').update(dbPayload).eq('event_name', activeItem.dbId);
                    error = response.error;
                } else {
                    const response = await supabaseClient.from('Event').insert([dbPayload]);
                    error = response.error;
                }
                if (error) {
                    console.error("Error saving event to Supabase:", error.message);
                    alert("Failed to save event: " + error.message);
                    return;
                }
            }

            closeEditor();
            await loadItems();
            alert("Saved successfully!");
        });
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (tab.disabled) return;
            const tabType = tab.getAttribute('data-type');

            if (activeItem && activeItem.type !== tabType) {
                resetForm();
            }
            tabs.forEach((otherTab) => {
                const selected = otherTab === tab;
                otherTab.classList.toggle('active', selected);
                otherTab.setAttribute('aria-selected', selected.toString());
            });

            const allCols = document.querySelectorAll('.editor-column');
            allCols.forEach((column) => {
                if (column.classList.contains(`editor-${tabType}`)) {
                    column.style.display = 'grid';
                } else {
                    column.style.display = 'none';
                }
            });
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

        if (dayStrip) dayStrip.style.width = `${totalWidth}px`;

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

        if (calendarSection) {
            calendarSection.setAttribute('aria-label', `${formatMonthYear(year, month)} schedule calendar`);
        }
    };

    const renderCalendarItems = (year, month) => {
        const content = document.querySelector('.calendar-content');
        if (!content) return;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const dayMs = 24 * 60 * 60 * 1000;

        const visibleItems = items.filter((item) => {
            if (!item.startDate || !item.endDate || isNaN(item.startDate.getTime())) return false;
            if (item.endDate < monthStart || item.startDate > monthEnd) return false;
            if (!state.searchTerm) return true;

            const haystack = `${item.name} ${item.description} ${item.location || ''} ${item.category || ''} ${item.lead || ''} ${item.assignee || ''} ${item.status || ''} ${item.priority || ''} ${item.notes || ''}`.toLowerCase();
            return haystack.includes(state.searchTerm);
        }).sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);

        const projectItems = visibleItems.filter(i => i.type === 'project');
        const eventItems = visibleItems.filter(i => i.type === 'event');

        const sortedHierarchicalItems = [];
        const masterItems = projectItems.filter(i => !i.parentId);
        const subItems = projectItems.filter(i => i.parentId);

        masterItems.forEach(master => {
            sortedHierarchicalItems.push(master);
            const matchingSubs = subItems.filter(sub => sub.parentId === master.dbId);
            matchingSubs.forEach(sub => sortedHierarchicalItems.push(sub));
        });

        subItems.forEach(sub => {
            if (!sortedHierarchicalItems.includes(sub)) {
                sortedHierarchicalItems.push(sub);
            }
        });

        const finalizedOrderedList = [...sortedHierarchicalItems, ...eventItems];
        const rows = [];
        content.querySelectorAll('.calendar-item').forEach((itemEl) => itemEl.remove());

        finalizedOrderedList.forEach((item) => {
            let rowIndex = 0;
            while (rowIndex < rows.length && rows[rowIndex].some((existing) =>
                item.startDate.getTime() <= existing.endDate.getTime() &&
                item.endDate.getTime() >= existing.startDate.getTime()
            )) {
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

            const displayPrefix = item.parentId ? '&nbsp;&nbsp; &nbsp;' : '';
            itemEl.innerHTML = `<span class="calendar-label">${displayPrefix}${item.name}</span>`;

            itemEl.addEventListener('click', (event) => {
                event.stopPropagation();
                fillEditorForItem(item);
                openEditor();
            });
            content.appendChild(itemEl);
        });

        content.style.minHeight = `${Math.max(220, rows.length * 50 + 80)}px`;
    };

    const renderCalendar = () => {
        if (monthLabel) monthLabel.textContent = formatMonthYear(currentYear, currentMonth);
        renderDayStrip(currentYear, currentMonth);
        renderCalendarItems(currentYear, currentMonth);
    };

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            currentMonth -= 1;
            if (currentMonth < 0) { currentMonth = 11; currentYear -= 1; }
            renderCalendar();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentMonth += 1;
            if (currentMonth > 11) { currentMonth = 0; currentYear += 1; }
            renderCalendar();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            state.searchTerm = event.target.value.trim().toLowerCase();
            renderCalendarItems(currentYear, currentMonth);
        });
    }

    // Call core setup methods
    loadItems();
    loadUsers();
});