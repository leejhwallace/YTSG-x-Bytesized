document.addEventListener('DOMContentLoaded', async () => {
    // Safe initialization of Supabase client
    let supabaseClient = null;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase client not loaded; aborting page 5 init.");
        return;
    }

    // Auth gate: read queries (Project, Event, etc.) are protected by RLS that requires a user JWT.
    // Redirect to sign-in when there's no active session so the search can actually match rows.
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (!authData?.user || authError) {
        console.warn("No active Supabase session on page 5; redirecting to Get Started.");
        window.location.replace('../page1/Get_Started.html');
        return;
    }

    const searchInput = document.getElementById('dataSearch');
    const viewOverview = document.getElementById('viewOverview');
    const viewProject = document.getElementById('viewProject');
    const viewEvent = document.getElementById('viewEvent');
        
    let currentSearchedProject = "";
    let currentSearchedEvent = "";
    let currentActiveStatTarget = "";

    // Full-row records from the matched search; used to render the entity info header.
    let currentProjectInfo = null;
    let currentEventInfo = null;

    // Fallbacks pulled from the DB at init, so we never hardcode 'Project 1' / 'Event 1'
    let defaultProject = "Default Project";
    let defaultEvent = "Default Event";

    async function fetchDefaults() {
        if (!supabaseClient) return;
        try {
            const { data: pData } = await supabaseClient
                .from('Project').select('project_name')
                .order('starting_date', { ascending: false })
                .limit(1);
            if (pData && pData.length > 0 && pData[0].project_name) {
                defaultProject = pData[0].project_name;
            }

            const { data: eData } = await supabaseClient
                .from('Event').select('event_name')
                .order('date_of_event', { ascending: false })
                .limit(1);
            if (eData && eData.length > 0 && eData[0].event_name) {
                defaultEvent = eData[0].event_name;
            }
        } catch (err) {
            console.warn("fetchDefaults failed; staying on initial fallbacks:", err.message);
        }
    }

    // Cache values for turnout graph
    let turnoutCache = { workshop: 30, outreach: 50, fundraiser: 20 };

    const donutChart = document.getElementById('overviewDonutChart');
    const lblWorkshop = document.getElementById('lblWorkshop');
    const lblOutreach = document.getElementById('lblOutreach');
    const lblFundraiser = document.getElementById('lblFundraiser');

    // Render turnout graph from raw values
    function renderTurnoutGraph(workshopVal, outreachVal, fundraiserVal) {
        turnoutCache = { workshop: workshopVal, outreach: outreachVal, fundraiser: fundraiserVal };
        const total = workshopVal + outreachVal + fundraiserVal;

        if (total === 0) {
            if (donutChart) donutChart.style.background = '#ccc';
            if (lblWorkshop) lblWorkshop.textContent = "Workshop ~ 0%";
            if (lblOutreach) lblOutreach.textContent = "Community Outreach ~ 0%";
            if (lblFundraiser) lblFundraiser.textContent = "Fundraiser ~ 0%";
            return;
        }

        const pctWorkshop = Math.round((workshopVal / total) * 100);
        const pctOutreach = Math.round((outreachVal / total) * 100);
        const pctFundraiser = 100 - (pctWorkshop + pctOutreach);

        const stop1 = pctWorkshop;
        const stop2 = pctWorkshop + pctOutreach;

        if (donutChart) {
            donutChart.style.background = `conic-gradient(
                var(--yellow) 0% ${stop1}%,
                var(--blue) ${stop1}% ${stop2}%,
                var(--orange) ${stop2}% 100%
            )`;
        }

        if (lblWorkshop) lblWorkshop.textContent = `Workshop ~ ${pctWorkshop}% (${workshopVal})`;
        if (lblOutreach) lblOutreach.textContent = `Community Outreach ~ ${pctOutreach}% (${outreachVal})`;
        if (lblFundraiser) lblFundraiser.textContent = `Fundraiser ~ ${pctFundraiser}% (${fundraiserVal})`;
    }

    // Load persisted turnout counts from database
    async function loadTurnoutFromDB() {
        if (!supabaseClient) {
            renderTurnoutGraph(30, 50, 20);
            return;
        }
        try {
            const { data, error } = await supabaseClient.from('Event_Turnout').select('*');
            if (error) throw error;

            if (data && data.length > 0) {
                const wObj = data.find(item => item.event_type === 'Workshop');
                const oObj = data.find(item => item.event_type === 'Community Outreach');
                const fObj = data.find(item => item.event_type === 'Fundraiser');

                const wVal = wObj ? wObj.headcount : 30;
                const oVal = oObj ? oObj.headcount : 50;
                const fVal = fObj ? fObj.headcount : 20;

                renderTurnoutGraph(wVal, oVal, fVal);
            } else {
                renderTurnoutGraph(30, 50, 20);
            }
        } catch (err) {
            console.warn("Could not load turnout from DB, using fallback defaults:", err.message);
            renderTurnoutGraph(30, 50, 20);
        }
    }

    // Render Month-on-Month Growth Bar Chart using Participant Counts from Event Table
    function renderMonthGrowthChart(eventsList) {
        const barChartContainer = document.getElementById('monthGrowthBarChart');
        if (!barChartContainer) return;

        // 12 Months participant accumulator (0 = Jan, 11 = Dec)
        const monthlyParticipants = new Array(12).fill(0);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        (eventsList || []).forEach(e => {
            if (!e.date_of_event) return;
            const parts = String(e.date_of_event).split('T')[0].split('-');
            if (parts.length < 2) return;
            
            const monthIndex = parseInt(parts[1], 10) - 1; // 0-indexed month
            if (monthIndex >= 0 && monthIndex < 12) {
                const count = (e.number_of_attendees && typeof e.number_of_attendees === 'object') 
                    ? (parseInt(e.number_of_attendees.count, 10) || 0) 
                    : (parseInt(e.number_of_attendees, 10) || 0);
                monthlyParticipants[monthIndex] += count;
            }
        });

        const maxParticipants = Math.max(...monthlyParticipants, 1); // Avoid division by 0

        barChartContainer.innerHTML = '';
        monthlyParticipants.forEach((total, idx) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            
            // Height proportional to maximum participants across months (min 8% height for visibility)
            const calculatedPct = total > 0 ? Math.max(8, Math.round((total / maxParticipants) * 100)) : 5;
            bar.style.height = `${calculatedPct}%`;
            bar.title = `${monthNames[idx]}: ${total} participants`;
            
            barChartContainer.appendChild(bar);
        });
    }

    // Switch View Panel Visibility
    function switchActiveView(targetPanel) {
        [viewOverview, viewProject, viewEvent].forEach(panel => {
            if(panel) panel.classList.remove('active');
        });
        if(targetPanel) targetPanel.classList.add('active');
    }

    // --- Entity info header helpers ---
    function formatDateLabel(dateStr) {
        if (!dateStr) return '';
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length !== 3) return dateStr;
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderProjectInfo(row) {
        const header = document.getElementById('projectInfoHeader');
        const nameEl = document.getElementById('projectInfoName');
        const descEl = document.getElementById('projectInfoDesc');
        const metaEl = document.getElementById('projectInfoMeta');
        if (!header || !nameEl || !descEl || !metaEl) return;
        if (!row) { header.hidden = true; return; }
        nameEl.textContent = row.project_name || '';
        descEl.textContent = row.project_discription || '';
        const meta = [];
        if (row.pirority) meta.push(`Priority: ${row.pirority}`);
        if (row.status) meta.push(`Status: ${row.status}`);
        if (row.project_lead) meta.push(`Lead: ${row.project_lead}`);
        if (row.starting_date) meta.push(`Start: ${formatDateLabel(row.starting_date)}`);
        if (row.ending_date) meta.push(`Due: ${formatDateLabel(row.ending_date)}`);
        metaEl.textContent = meta.join('  •  ');
        header.hidden = false;
    }

    function renderEventInfo(row) {
        const header = document.getElementById('eventInfoHeader');
        const nameEl = document.getElementById('eventInfoName');
        const descEl = document.getElementById('eventInfoDesc');
        const metaEl = document.getElementById('eventInfoMeta');
        if (!header || !nameEl || !descEl || !metaEl) return;
        if (!row) { header.hidden = true; return; }
        nameEl.textContent = row.event_name || '';
        descEl.textContent = row.event_discription || '';
        const meta = [];
        if (row.date_of_event) meta.push(`Date: ${formatDateLabel(row.date_of_event)}`);
        if (row.location) meta.push(`Location: ${row.location}`);
        if (row.event_catergory) meta.push(`Category: ${row.event_catergory}`);
        metaEl.textContent = meta.join('  •  ');
        header.hidden = false;
    }

    function showNoMatchHint(query) {
        const hint = document.getElementById('searchHint');
        if (!hint) return;
        hint.textContent = `No event or project matches “${query}”.`;
        hint.hidden = false;
    }

    function clearNoMatchHint() {
        const hint = document.getElementById('searchHint');
        if (hint) hint.hidden = true;
    }

    // View Routing Core Switch Logic
    async function evaluateNavigationRoute() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        clearNoMatchHint();

        // Empty input -> clear cached entity and return to default (overview) page.
        if (!query) {
            currentSearchedProject = '';
            currentSearchedEvent = '';
            currentProjectInfo = null;
            currentEventInfo = null;
            renderProjectInfo(null);
            renderEventInfo(null);
            switchActiveView(viewOverview);
            return;
        }

        const needle = query.toLowerCase();
        try {
            const projectCols = 'project_name, project_discription, starting_date, ending_date, project_lead, pirority, status';
            const eventCols = 'event_name, event_discription, date_of_event, location, event_catergory';
            const [projectsRes, eventsRes] = await Promise.all([
                supabaseClient.from('Project').select(projectCols),
                supabaseClient.from('Event').select(eventCols)
            ]);

            const projectMatch = (projectsRes.data || [])
                .find(p => String(p.project_name || '').toLowerCase().includes(needle));
            const eventMatch = (eventsRes.data || [])
                .find(e => String(e.event_name || '').toLowerCase().includes(needle));

            if (projectMatch) {
                currentSearchedProject = projectMatch.project_name || defaultProject;
                currentProjectInfo = projectMatch;
                currentSearchedEvent = '';
                currentEventInfo = null;
                renderEventInfo(null);
                renderProjectInfo(currentProjectInfo);
                await loadProjectDataMetrics(currentSearchedProject);
                switchActiveView(viewProject);
                return;
            }

            if (eventMatch) {
                currentSearchedEvent = eventMatch.event_name || defaultEvent;
                currentEventInfo = eventMatch;
                currentSearchedProject = '';
                currentProjectInfo = null;
                renderProjectInfo(null);
                renderEventInfo(currentEventInfo);
                await loadEventStatistics(currentSearchedEvent);
                switchActiveView(viewEvent);
                return;
            }

            // No match -> fall back to default page with a visible hint.
            currentSearchedProject = '';
            currentSearchedEvent = '';
            currentProjectInfo = null;
            currentEventInfo = null;
            renderProjectInfo(null);
            renderEventInfo(null);
            showNoMatchHint(query);
            switchActiveView(viewOverview);
        } catch (e) {
            console.error("Navigation evaluation error:", e);
            switchActiveView(viewOverview);
        }
    }

    // REGEX-BASED TASK DURATION PARSER & HOOK SUMMATION
    function parseAndSumHours(tasksList) {
        let totalMinutes = 0;
        tasksList.forEach(t => {
            const timeStr = String(t.hours_spent).toLowerCase();
            const hourMatch = timeStr.match(/(\d+)\s*h/);
            const minMatch = timeStr.match(/(\d+)\s*m/);
            const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
            const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
            totalMinutes += (hours * 60) + minutes;
        });

        const calculatedHours = Math.floor(totalMinutes / 60);
        const calculatedMinutes = totalMinutes % 60;
        const totalEl = document.getElementById('projectHoursTotal');
        if (totalEl) totalEl.textContent = `${calculatedHours} Hours ${calculatedMinutes}min`;
    }

    // Load Project Data from Tables
    async function loadProjectDataMetrics(projectName) {
        if (!supabaseClient) return;
        try {
            const [tasksRes, delaysRes] = await Promise.all([
                supabaseClient.from('Project_Tasks').select('*').eq('project_name', projectName),
                supabaseClient.from('Project_Delays').select('*').eq('project_name', projectName)
            ]);

            const taskContainer = document.getElementById('projectTaskBody');
            if (taskContainer) {
                taskContainer.innerHTML = '';
                const tasks = tasksRes.data || [];
                
                tasks.forEach(t => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${t.task_title}</td><td>${t.hours_spent}</td><td>${t.who_completed}</td><td>${t.when_completed}</td>`;
                    taskContainer.appendChild(tr);
                });

                parseAndSumHours(tasks);
            }

            const delayContainer = document.getElementById('projectDelayBody');
            if (delayContainer) {
                delayContainer.innerHTML = '';
                (delaysRes.data || []).forEach(d => {
                    const li = document.createElement('li');
                    li.textContent = d.delay_reason;
                    delayContainer.appendChild(li);
                });
            }
        } catch (e) {
            console.error("Project data load error:", e);
        }
    }

    // Load Event Analytical Layouts & Update Graphs
    async function loadEventStatistics(eventName) {
        if (!supabaseClient) return;
        try {
            let { data, error } = await supabaseClient.from('Event_Stats').select('*').eq('event_name', eventName).maybeSingle();
            
            if (!data) {
                const baseline = { event_name: eventName, stars_5: 40, stars_4: 30, stars_3: 20, stars_2: 10, child_orange: 20, child_yellow: 80, teen_orange: 60, teen_yellow: 40, adult_orange: 5, adult_yellow: 95, first_timers: 28, returning_pct: 72, volunteer_count: 130, attendee_count: 95, reach_word: 50, reach_website: 10, reach_social: 40 };
                await supabaseClient.from('Event_Stats').insert([baseline]);
                data = baseline;
            }

            const ratingLabels = document.getElementById('eventRatingLabels');
            const ratingDonut = document.getElementById('eventRatingDonut');
            if (ratingLabels) {
                ratingLabels.innerHTML = `
                    <p class="rating-five">5 Stars ~ ${data.stars_5}%</p><p class="rating-four">4 Stars ~ ${data.stars_4}%</p>
                    <p class="rating-three">3 Stars ~ ${data.stars_3}%</p><p class="rating-two">2 Stars ~ ${data.stars_2}%</p>
                `;
            }
            if (ratingDonut) {
                ratingDonut.style.background = `conic-gradient(
                    var(--orange) 0% ${data.stars_5}%,
                    var(--yellow) ${data.stars_5}% ${data.stars_5 + data.stars_4}%,
                    var(--blue) ${data.stars_5 + data.stars_4}% ${data.stars_5 + data.stars_4 + data.stars_3}%,
                    #4fae5e ${data.stars_5 + data.stars_4 + data.stars_3}% 100%
                )`;
            }

            const barChild = document.getElementById('barChild');
            const barTeen = document.getElementById('barTeen');
            const barAdult = document.getElementById('barAdult');
            const demoKeyLabels = document.getElementById('demoKeyLabels');
            if (barChild) barChild.innerHTML = `<span class="demo-seg seg-orange" style="height:${data.child_orange}%;">${data.child_orange}%</span><span class="demo-seg seg-yellow" style="height:${data.child_yellow}%;">${data.child_yellow}%</span>`;
            if (barTeen) barTeen.innerHTML = `<span class="demo-seg seg-orange" style="height:${data.teen_orange}%;">${data.teen_orange}%</span><span class="demo-seg seg-yellow" style="height:${data.teen_yellow}%;">${data.teen_yellow}%</span>`;
            if (barAdult) barAdult.innerHTML = `<span class="demo-seg seg-orange" style="height:${data.adult_orange}%;">${data.adult_orange}%</span><span class="demo-seg seg-yellow" style="height:${data.adult_yellow}%;">${data.adult_yellow}%</span>`;
            if (demoKeyLabels) demoKeyLabels.innerHTML = `<p class="demo-key first-timer">First timers ~ ${data.first_timers}%</p><p class="demo-key returning">Returning ~ ${data.returning_pct}%</p>`;

            const lblVol = document.getElementById('lblVolHeadcount');
            const lblAtt = document.getElementById('lblAttHeadcount');
            const lblDiff = document.getElementById('lblDiffHeadcount');
            if (lblVol) lblVol.textContent = data.volunteer_count;
            if (lblAtt) lblAtt.textContent = data.attendee_count;
            if (lblDiff) lblDiff.textContent = Math.abs(data.volunteer_count - data.attendee_count);

            const barReachWord = document.getElementById('barReachWord');
            const barReachWeb = document.getElementById('barReachWeb');
            const barReachSocial = document.getElementById('barReachSocial');
            const reachLabelsContainer = document.getElementById('reachLabelsContainer');
            if (barReachWord) barReachWord.style.height = `${data.reach_word}%`;
            if (barReachWeb) barReachWeb.style.height = `${data.reach_website}%`;
            if (barReachSocial) barReachSocial.style.height = `${data.reach_social}%`;
            if (reachLabelsContainer) {
                reachLabelsContainer.innerHTML = `
                    <p class="word">Word of Mouth ~ ${data.reach_word}%</p>
                    <p class="website">Website ~ ${data.reach_website}%</p>
                    <p class="social">Social Media ~ ${data.reach_social}%</p>
                `;
            }
        } catch (e) {
            console.error("Event stats load error:", e);
        }
    }

    // Load Overview Global Metrics & Render Growth Bar Chart
    async function loadOverviewGlobalMetrics() {
        if (!supabaseClient) return;
        try {
            const [logsRes, profilesRes, eventsRes] = await Promise.all([
                supabaseClient.from('volunteer_hour_logs').select('volunteer_name, hours_logged'),
                supabaseClient.from('profiles').select('display_name, department'),
                supabaseClient.from('Event').select('*')
            ]);

            const volunteerAggregates = {};
            (logsRes.data || []).forEach(log => {
                const name = log.volunteer_name || "Unknown Volunteer";
                const hours = parseFloat(log.hours_logged) || 0;
                volunteerAggregates[name] = (volunteerAggregates[name] || 0) + hours;
            });

            const profileMap = {};
            (profilesRes.data || []).forEach(p => {
                if (p.display_name) {
                    profileMap[p.display_name] = p.department || 'Volunteer';
                }
            });

            const leaderboard = Object.keys(volunteerAggregates).map(name => ({
                name: name,
                hours: volunteerAggregates[name],
                department: profileMap[name] || 'Volunteer'
            })).sort((a, b) => b.hours - a.hours);

            const volunteerTableBody = document.getElementById('volunteerTableBody');
            if (volunteerTableBody) {
                volunteerTableBody.innerHTML = '';
                if (leaderboard.length === 0) {
                    volunteerTableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; opacity:0.5; padding: 20px 0;">No hours logged yet.</td></tr>';
                } else {
                    leaderboard.forEach(v => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${v.name}<br><span class="sub">${v.department}</span></td>
                            <td style="text-align: right; font-size: 18px; font-weight: 800;">${v.hours}</td>
                        `;
                        volunteerTableBody.appendChild(tr);
                    });
                }
            }

            const eventsList = eventsRes.data || [];
            const eventTableBody = document.getElementById('eventTableBody');
            if (eventTableBody) {
                eventTableBody.innerHTML = '';
                if (eventsList.length === 0) {
                    eventTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding: 20px 0;">No events recorded yet.</td></tr>';
                }
                eventsList.forEach(e => {
                    const tr = document.createElement('tr');
                    const count = (e.number_of_attendees && typeof e.number_of_attendees === 'object') ? (e.number_of_attendees.count || 0) : (e.number_of_attendees || 0);
                    tr.innerHTML = `
                        <td>${e.event_name || 'Unnamed'}<br><span class="sub">${e.event_discription || ''}</span></td>
                        <td>${count}</td>
                        <td>${e.event_catergory || 'General'}</td>
                    `;
                    eventTableBody.appendChild(tr);
                });
            }

            // Calculate monthly participant totals and render the growth bar chart
            renderMonthGrowthChart(eventsList);

        } catch (err) {
            console.error("Overview metrics engine failed:", err.message);
        }
    }

    // CLICK TO INTERACT STATS CONTEXT FIELDS DEFINITIONS
    document.querySelectorAll('.clickable-stat').forEach(element => {
        element.addEventListener('click', () => {
            const target = element.getAttribute('data-target');
            // Project panels reuse the existing add-task / add-delay modals
            // (mirrors how the events panels open their per-panel stats editor).
            if (target === 'project-tasks') { openModalDirectly('taskModal'); return; }
            if (target === 'project-delays') { openModalDirectly('delayModal'); return; }
            currentActiveStatTarget = target;
            buildDynamicStatsEditor(target);
        });
    });

    async function buildDynamicStatsEditor(target) {
        const fieldsWrapper = document.getElementById('statsModalFields');
        const modalTitle = document.getElementById('statsModalTitle');
        if (!fieldsWrapper || !modalTitle) return;
        fieldsWrapper.innerHTML = '';

        if (target === 'turnout') {
            modalTitle.textContent = "Enter Event Turnout Raw Headcounts";
            fieldsWrapper.innerHTML = `
                <label class="editor-field"><span>Workshop Headcount</span><input type="number" id="stat_turnout_w" value="${turnoutCache.workshop}" min="0"></label>
                <label class="editor-field"><span>Community Outreach Headcount</span><input type="number" id="stat_turnout_o" value="${turnoutCache.outreach}" min="0"></label>
                <label class="editor-field"><span>Fundraiser Headcount</span><input type="number" id="stat_turnout_f" value="${turnoutCache.fundraiser}" min="0"></label>
            `;
        } else if (target === 'feedback') {
            modalTitle.textContent = "Enter Feedback Raw Headcounts";
            fieldsWrapper.innerHTML = `
                <label class="editor-field"><span>5 Stars Count</span><input type="number" id="stat_cnt_s5" value="40" min="0"></label>
                <label class="editor-field"><span>4 Stars Count</span><input type="number" id="stat_cnt_s4" value="30" min="0"></label>
                <label class="editor-field"><span>3 Stars Count</span><input type="number" id="stat_cnt_s3" value="20" min="0"></label>
                <label class="editor-field"><span>2 Stars Count</span><input type="number" id="stat_cnt_s2" value="10" min="0"></label>
            `;
        } else if (target === 'demographics') {
            modalTitle.textContent = "Enter Demographics Headcounts";
            fieldsWrapper.innerHTML = `
                <h4 style="font-size:14px; margin-top:4px;">Children (3-12)</h4>
                <label class="editor-field"><span>First Timers Count</span><input type="number" id="stat_cnt_c_first" value="2" min="0"></label>
                <label class="editor-field"><span>Returning Count</span><input type="number" id="stat_cnt_c_ret" value="8" min="0"></label>
                
                <h4 style="font-size:14px; margin-top:8px;">Teenagers (13-19)</h4>
                <label class="editor-field"><span>First Timers Count</span><input type="number" id="stat_cnt_t_first" value="6" min="0"></label>
                <label class="editor-field"><span>Returning Count</span><input type="number" id="stat_cnt_t_ret" value="4" min="0"></label>
                
                <h4 style="font-size:14px; margin-top:8px;">Adults (20-39)</h4>
                <label class="editor-field"><span>First Timers Count</span><input type="number" id="stat_cnt_a_first" value="1" min="0"></label>
                <label class="editor-field"><span>Returning Count</span><input type="number" id="stat_cnt_a_ret" value="19" min="0"></label>
            `;
        } else if (target === 'headcount') {
            modalTitle.textContent = "Enter Headcount Numbers";
            let data = null;
            if (supabaseClient) {
                let res = await supabaseClient.from('Event_Stats').select('*').eq('event_name', currentSearchedEvent).maybeSingle();
                data = res.data;
            }
            fieldsWrapper.innerHTML = `
                <label class="editor-field"><span>Volunteer Headcount</span><input type="number" id="stat_vol" value="${data?.volunteer_count || 130}" min="0"></label>
                <label class="editor-field"><span>Attendee Headcount</span><input type="number" id="stat_att" value="${data?.attendee_count || 95}" min="0"></label>
            `;
        } else if (target === 'reach') {
            modalTitle.textContent = "Enter Reach Source Volume Numbers";
            fieldsWrapper.innerHTML = `
                <label class="editor-field"><span>Word of Mouth Count</span><input type="number" id="stat_cnt_rw" value="50" min="0"></label>
                <label class="editor-field"><span>Website Signups Count</span><input type="number" id="stat_cnt_rweb" value="10" min="0"></label>
                <label class="editor-field"><span>Social Media Count</span><input type="number" id="stat_cnt_rs" value="40" min="0"></label>
            `;
        }

        const modal = document.getElementById('eventStatsModal');
        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    // Save Event Stats
    const btnSaveStats = document.getElementById('saveEventStatsBtn');
    if (btnSaveStats) {
        btnSaveStats.addEventListener('click', async () => {
            let updatePayload = {};

            if (currentActiveStatTarget === 'turnout') {
                const w = Math.max(0, parseInt(document.getElementById('stat_turnout_w')?.value, 10) || 0);
                const o = Math.max(0, parseInt(document.getElementById('stat_turnout_o')?.value, 10) || 0);
                const f = Math.max(0, parseInt(document.getElementById('stat_turnout_f')?.value, 10) || 0);

                renderTurnoutGraph(w, o, f);

                if (supabaseClient) {
                    try {
                        const updates = [
                            { event_type: 'Workshop', headcount: w },
                            { event_type: 'Community Outreach', headcount: o },
                            { event_type: 'Fundraiser', headcount: f }
                        ];
                        await supabaseClient.from('Event_Turnout').upsert(updates, { onConflict: 'event_type' });
                    } catch (e) {
                        console.error("Error updating turnout database:", e);
                    }
                }
                closeActiveModal('eventStatsModal');
                return;
            }

            if (currentActiveStatTarget === 'feedback') {
                const s5 = Math.max(0, parseInt(document.getElementById('stat_cnt_s5')?.value, 10) || 0);
                const s4 = Math.max(0, parseInt(document.getElementById('stat_cnt_s4')?.value, 10) || 0);
                const s3 = Math.max(0, parseInt(document.getElementById('stat_cnt_s3')?.value, 10) || 0);
                const s2 = Math.max(0, parseInt(document.getElementById('stat_cnt_s2')?.value, 10) || 0);
                const total = s5 + s4 + s3 + s2;

                if (total > 0) {
                    updatePayload = {
                        stars_5: Math.round((s5 / total) * 100),
                        stars_4: Math.round((s4 / total) * 100),
                        stars_3: Math.round((s3 / total) * 100),
                        stars_2: Math.round((s2 / total) * 100)
                    };
                }
            } else if (currentActiveStatTarget === 'demographics') {
                const cFirst = Math.max(0, parseInt(document.getElementById('stat_cnt_c_first')?.value, 10) || 0);
                const cRet = Math.max(0, parseInt(document.getElementById('stat_cnt_c_ret')?.value, 10) || 0);
                const tFirst = Math.max(0, parseInt(document.getElementById('stat_cnt_t_first')?.value, 10) || 0);
                const tRet = Math.max(0, parseInt(document.getElementById('stat_cnt_t_ret')?.value, 10) || 0);
                const aFirst = Math.max(0, parseInt(document.getElementById('stat_cnt_a_first')?.value, 10) || 0);
                const aRet = Math.max(0, parseInt(document.getElementById('stat_cnt_a_ret')?.value, 10) || 0);

                const cTotal = cFirst + cRet;
                const tTotal = tFirst + tRet;
                const aTotal = aFirst + aRet;
                const grandTotalFirstTimers = cFirst + tFirst + aFirst;
                const grandTotalAll = cTotal + tTotal + aTotal;

                updatePayload = {
                    child_orange: cTotal > 0 ? Math.round((cFirst / cTotal) * 100) : 0,
                    child_yellow: cTotal > 0 ? Math.round((cRet / cTotal) * 100) : 0,
                    teen_orange: tTotal > 0 ? Math.round((tFirst / tTotal) * 100) : 0,
                    teen_yellow: tTotal > 0 ? Math.round((tRet / tTotal) * 100) : 0,
                    adult_orange: aTotal > 0 ? Math.round((aFirst / aTotal) * 100) : 0,
                    adult_yellow: aTotal > 0 ? Math.round((aRet / aTotal) * 100) : 0,
                    first_timers: grandTotalAll > 0 ? Math.round((grandTotalFirstTimers / grandTotalAll) * 100) : 0,
                    returning_pct: grandTotalAll > 0 ? (100 - Math.round((grandTotalFirstTimers / grandTotalAll) * 100)) : 0
                };
            } else if (currentActiveStatTarget === 'headcount') {
                updatePayload = {
                    volunteer_count: Math.max(0, parseInt(document.getElementById('stat_vol')?.value, 10) || 0),
                    attendee_count: Math.max(0, parseInt(document.getElementById('stat_att')?.value, 10) || 0)
                };
            } else if (currentActiveStatTarget === 'reach') {
                const rw = Math.max(0, parseInt(document.getElementById('stat_cnt_rw')?.value, 10) || 0);
                const rweb = Math.max(0, parseInt(document.getElementById('stat_cnt_rweb')?.value, 10) || 0);
                const rs = Math.max(0, parseInt(document.getElementById('stat_cnt_rs')?.value, 10) || 0);
                const total = rw + rweb + rs;

                if (total > 0) {
                    updatePayload = {
                        reach_word: Math.round((rw / total) * 100),
                        reach_website: Math.round((rweb / total) * 100),
                        reach_social: Math.round((rs / total) * 100)
                    };
                }
            }

            if (supabaseClient) {
                await supabaseClient.from('Event_Stats').update(updatePayload).eq('event_name', currentSearchedEvent);
            }
            closeActiveModal('eventStatsModal');
            await loadEventStatistics(currentSearchedEvent);
        });
    }

    const btnAddTask = document.getElementById('addProjectTaskBtn');
    const btnAddDelay = document.getElementById('addProjectDelayBtn');
    if (btnAddTask) btnAddTask.addEventListener('click', () => openModalDirectly('taskModal'));
    if (btnAddDelay) btnAddDelay.addEventListener('click', () => openModalDirectly('delayModal'));

    function openModalDirectly(id) {
        const target = document.getElementById(id);
        if (target) {
            target.classList.add('open');
            target.setAttribute('aria-hidden', 'false');
        }
    }

    window.closeActiveModal = function(id) {
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('open');
            target.setAttribute('aria-hidden', 'true');
        }
    };

    const btnSaveTask = document.getElementById('saveTaskBtn');
    if (btnSaveTask) {
        btnSaveTask.addEventListener('click', async () => {
            const payload = {
                project_name: currentSearchedProject || defaultProject,
                task_title: document.getElementById('taskTitleInput')?.value.trim() || '',
                hours_spent: document.getElementById('taskHoursInput')?.value.trim() || '',
                who_completed: document.getElementById('taskUserInput')?.value.trim() || '',
                when_completed: document.getElementById('taskDateInput')?.value.trim() || ''
            };
            if (supabaseClient) {
                await supabaseClient.from('Project_Tasks').insert([payload]);
            }
            closeActiveModal('taskModal');
            loadProjectDataMetrics(payload.project_name);
        });
    }

    const btnSaveDelay = document.getElementById('saveDelayBtn');
    if (btnSaveDelay) {
        btnSaveDelay.addEventListener('click', async () => {
            const payload = {
                project_name: currentSearchedProject || defaultProject,
                delay_reason: document.getElementById('delayReasonInput')?.value.trim() || ''
            };
            if (supabaseClient) {
                await supabaseClient.from('Project_Delays').insert([payload]);
            }
            closeActiveModal('delayModal');
            loadProjectDataMetrics(payload.project_name);
        });
    }

    if (searchInput) searchInput.addEventListener('input', evaluateNavigationRoute);

    // Initial load sequence
    await fetchDefaults();
    await loadTurnoutFromDB();
    loadOverviewGlobalMetrics();
});