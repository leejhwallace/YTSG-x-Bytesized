document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase client
    const supabaseUrl = "https://txfditoxxdjigplckjcc.supabase.co";
    const supabaseKey = "sb_publishable_KzdZhuiEyoG6GEVEggJVug_1VtHc6mz";
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Fetch user session
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (!authData?.user || authError) {
        window.location.href = '../page1/Get_Started.html';
        return;
    }
    const user = authData.user;
    const currentUserDisplayName = user.user_metadata?.full_name || '';
    // Application state lists
    let cachedProjectsList = [];
    let cachedEventsList = [];
    let assignedProjectsList = [];
    let activeFilterMode = "all"; // Options: "all", "active", "upcoming", "overdue"
    // Helper functions for parsing timelines securely
    const parseDBDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length !== 3) return null;
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    };
    const getNormalizedToday = () => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    // Main Engine to pull data rows and run analysis metrics
    const fetchDashboardStats = async () => {
        try {
            const today = getNormalizedToday();
            const [projectsRes, eventsRes, profileRes] = await Promise.all([
                supabaseClient.from('Project').select('*'),
                supabaseClient.from('Event').select('*'),
                supabaseClient.from('profiles').select('total_hours').eq('user_id', user.id).maybeSingle()
            ]);
            if (projectsRes.error) throw projectsRes.error;
            if (eventsRes.error) throw eventsRes.error;
            cachedProjectsList = projectsRes.data || [];
            cachedEventsList = eventsRes.data || [];
            if (!profileRes.error && profileRes.data) {
                const totalHours = profileRes.data.total_hours || 0;
                document.getElementById('volunteerHoursCount').textContent = `${totalHours} hrs`;
            }
            let activeCount = 0;
            let upcomingCount = 0;
            let overdueCount = 0;
            assignedProjectsList = [];
            
            cachedProjectsList.forEach(p => {
                const start = parseDBDate(p.starting_date);
                const end = parseDBDate(p.ending_date);
                
                // Determine timeline status classifications
                if (start && start > today) {
                    p.timelineStatus = "upcoming";
                    upcomingCount++;
                } else if (end && end < today) {
                    // If timeline passed but listed as completed (Done), don't mark as overdue
                    if (p.status === "Done") {
                        p.timelineStatus = "completed";
                    } else {
                        p.timelineStatus = "overdue";
                        overdueCount++;
                    }
                } else if (start && end && today >= start && today <= end) {
                    // If current but listed as Done, classify as completed so it doesn't count as active
                    if (p.status === "Done") {
                        p.timelineStatus = "completed";
                    } else {
                        p.timelineStatus = "active";
                        activeCount++;
                    }
                } else {
                    p.timelineStatus = "unknown";
                }
                
                // Collect only the projects explicitly assigned to this individual user
                if (p["assign _to"]) {
                    const assignees = p["assign _to"].split(',').map(s => s.trim());
                    if (assignees.includes(currentUserDisplayName)) {
                        // If a project is listed as done, filter it out from the dashboard listings
                        if (p.status !== "Done") {
                            assignedProjectsList.push(p);
                        }
                    }
                }
            });
            
            document.getElementById('activeProjectsCount').textContent = activeCount;
            document.getElementById('upcomingProjectsCount').textContent = upcomingCount;
            document.getElementById('overdueProjectsCount').textContent = overdueCount;
            // Apply filters to display choices correctly
            applyFilterAndRender();
            renderUpcomingEvents(cachedEventsList, today);
        } catch (err) {
            console.error("Dashboard engine processing failed:", err.message);
        }
    };
    // Filter project items dynamically based on the category clicked
    const applyFilterAndRender = () => {
        let listToDisplay = [...assignedProjectsList];
        const titleEl = document.getElementById('projectListTitle');
        const resetBtn = document.getElementById('resetFilterBtn');
        if (activeFilterMode !== "all") {
            listToDisplay = assignedProjectsList.filter(p => p.timelineStatus === activeFilterMode);
            resetBtn.style.display = "inline-block";
            titleEl.textContent = `Current project listing (${activeFilterMode.toUpperCase()} tasks assigned to you)`;
        } else {
            resetBtn.style.display = "none";
            titleEl.textContent = `Current project listing (${assignedProjectsList.length} Assigned)`;
        }
        renderPrioritizedList(listToDisplay);
    };
    // Render prioritized project listings
    const renderPrioritizedList = (projects) => {
        const container = document.getElementById('prioritizedProjectList');
        container.innerHTML = '';
        if (projects.length === 0) {
            container.innerHTML = '<p style="font-size: 14px; font-weight:600; opacity: 0.6; padding: 10px 0;">No tasks match this filter choice.</p>';
            return;
        }
        const priorityWeights = { 'High': 1, 'Medium': 2, 'Low': 3 };
        projects.sort((a, b) => (priorityWeights[a.pirority || 'Low'] || 3) - (priorityWeights[b.pirority || 'Low'] || 3));
        projects.forEach(p => {
            const row = document.createElement('div');
            row.className = 'project';
            let badgeColor = '#878785';
            if (p.pirority === 'High') badgeColor = '#cf512a';
            if (p.pirority === 'Medium') badgeColor = '#efb247';
            
            // Format the due date gracefully if it exists
            const dueDateString = p.ending_date ? new Date(p.ending_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'No due date';

            row.innerHTML = `
                <div class="project-row" style="margin-bottom: 4px;">
                    <p style="font-size:14px; font-weight:800;">${p.project_name} <span style="background:${badgeColor}; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:6px;">${p.pirority || 'Low'}</span></p>
                    <div style="text-align: right;">
                        <p style="font-size:13px; font-weight:600; margin: 0;">${p.status || 'To Do'}</p>
                        <p style="font-size:11px; font-weight:500; color: #666; margin: 0;">Due: ${dueDateString}</p>
                    </div>
                </div>
                <p style="font-size:13px; color:#555; font-weight:500; margin-bottom:4px;">${p.project_discription || 'No description added.'}</p>
            `;
            container.appendChild(row);
        });
    };
    // Render separate actual events pulled from the backend
    const renderUpcomingEvents = (events, today) => {
        const container = document.getElementById('upcomingEventsList');
        container.innerHTML = '';
        const upcomingEvents = events.filter(e => {
            const eventDate = parseDBDate(e.date_of_event);
            return eventDate && eventDate >= today;
        });
        if (upcomingEvents.length === 0) {
            container.innerHTML = '<p style="padding: 12px 17px; font-size:14px; opacity:0.6; font-weight:800;">No upcoming events scheduled.</p>';
            return;
        }
        upcomingEvents.sort((a, b) => parseDBDate(a.date_of_event) - parseDBDate(b.date_of_event));
        upcomingEvents.forEach(e => {
            const eventDate = parseDBDate(e.date_of_event);
            const dayStr = eventDate ? eventDate.getDate() : '';
            const monthStr = eventDate ? eventDate.toLocaleDateString('en-US', { month: 'short' }) : '';
            const eventBlock = document.createElement('div');
            eventBlock.className = 'event';
            eventBlock.style.padding = "12px 17px"; // Match inner container layout alignment
            eventBlock.innerHTML = `
                <div class="date-badge" style="font-weight:800; font-size:12px;">${dayStr}<br>${monthStr}</div>
                <div>
                    <h3>${e.event_name}</h3>
                    <p>${e.location || 'No Location Set'} - <span style="font-weight:500; font-size:12px; color:#555;">${e.event_catergory || 'General'}</span></p>
                </div>
            `;
            container.appendChild(eventBlock);
        });
    };
    // Card Event Listeners
    document.getElementById('cardActive').addEventListener('click', () => { activeFilterMode = "active"; applyFilterAndRender(); });
    document.getElementById('cardUpcoming').addEventListener('click', () => { activeFilterMode = "upcoming"; applyFilterAndRender(); });
    document.getElementById('cardOverdue').addEventListener('click', () => { activeFilterMode = "overdue"; applyFilterAndRender(); });
    document.getElementById('resetFilterBtn').addEventListener('click', () => { activeFilterMode = "all"; applyFilterAndRender(); });
    // Hours modal handling mechanics
    const hoursModal = document.getElementById('hoursModal');
    const resourceDropdown = document.getElementById('modalResourceDropdown');
    const fillResourceDropdown = () => {
        resourceDropdown.innerHTML = '';
        cachedProjectsList.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.project_name;
            opt.textContent = p.project_name;
            resourceDropdown.appendChild(opt);
        });
    };
    document.getElementById('volunteerHoursCard').addEventListener('click', () => {
        document.getElementById('modalHoursInput').value = '';
        fillResourceDropdown();
        hoursModal.style.display = 'grid';
    });
    document.getElementById('closeHoursModal').addEventListener('click', () => {
        hoursModal.style.display = 'none';
    });
    // Save project hours transaction logs to base schema with accumulation support
    document.getElementById('saveHoursBtn').addEventListener('click', async () => {
        const hoursToAdd = parseFloat(document.getElementById('modalHoursInput').value);
        const resourceName = resourceDropdown.value;
        if (isNaN(hoursToAdd) || hoursToAdd <= 0) {
            alert("Please key in a valid numerical hour entry.");
            return;
        }
        try {
            const { data: profile, error: getError } = await supabaseClient
                .from('profiles')
                .select('total_hours')
                .eq('user_id', user.id)
                .maybeSingle();
            if (getError) throw getError;
            const existingHours = profile && profile.total_hours ? parseFloat(profile.total_hours) : 0;
            const newTotalHours = existingHours + hoursToAdd;
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ total_hours: newTotalHours })
                .eq('user_id', user.id);
            if (updateError) throw updateError;
            // Check if user has logged hours for this specific project already
            const { data: existingLog, error: logFetchError } = await supabaseClient
                .from('volunteer_hour_logs')
                .select('id, hours_logged')
                .eq('user_id', user.id)
                .eq('allocated_target_name', resourceName)
                .maybeSingle();
            if (logFetchError) throw logFetchError;
            if (existingLog) {
                // Combine entries if entry for this project name already exists
                const combinedHours = parseFloat(existingLog.hours_logged || 0) + hoursToAdd;
                const { error: logUpdateError } = await supabaseClient
                    .from('volunteer_hour_logs')
                    .update({ hours_logged: combinedHours })
                    .eq('id', existingLog.id);
                
                if (logUpdateError) throw logUpdateError;
            } else {
                // Otherwise make a clean row insert entry
                const { error: logInsertError } = await supabaseClient
                    .from('volunteer_hour_logs')
                    .insert([{
                        user_id: user.id,
                        volunteer_name: currentUserDisplayName,
                        activity_type: 'project',
                        allocated_target_name: resourceName,
                        hours_logged: hoursToAdd
                    }]);
                
                if (logInsertError) throw logInsertError;
            }
            alert(`Logged ${hoursToAdd} hours successfully!`);
            hoursModal.style.display = 'none';
            
            // Add a short delay so the data tables are indexed before rendering the numbers
            await new Promise(resolve => setTimeout(resolve, 250));
            await fetchDashboardStats();
        } catch (err) {
            console.error("Hour tracking fault:", err.message);
            alert("Encountered structural query faults verifying operations data. Verify database setups.");
        }
    });
    fetchDashboardStats();
});