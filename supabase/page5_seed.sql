-- Optional starter records for Page 5. Run after page5_schema.sql.
-- They mirror the event/project detail states in the supplied Page 5 design.

insert into public.data_projects (id, name, description, delay_reason, manual_total_minutes)
values ('10000000-0000-0000-0000-000000000001', 'Project 1', 'Community device training project', null, 670)
on conflict (id) do nothing;

insert into public.data_project_tasks (id, project_id, task_name, duration_minutes, completed_by, completed_at)
values
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Planning', 307, 'John Tan', '2026-03-12'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Design', 244, 'Greg Lim', '2026-03-16'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Build', 119, 'Lucy Kim', '2026-03-21')
on conflict (id) do nothing;

insert into public.data_events (id, name, description, event_type, event_date, volunteer_count, attendee_count)
values
    ('30000000-0000-0000-0000-000000000001', 'Event 1', 'How to safely use devices', 'Workshop', '2026-03-25', 130, 95),
    ('30000000-0000-0000-0000-000000000002', 'Community Day', 'Neighbourhood activities and support', 'Community Outreach', '2026-04-11', 42, 88),
    ('30000000-0000-0000-0000-000000000003', 'Fundraising Drive', 'Fundraising event for community programmes', 'Fundraiser', '2026-05-08', 22, 38)
on conflict (id) do nothing;

insert into public.data_event_feedback (id, event_id, rating)
values
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 5),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 5),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 5),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 5),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 4),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 4),
    ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', 4),
    ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000001', 3),
    ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000001', 3),
    ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', 3),
    ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', 2)
on conflict (id) do nothing;

insert into public.data_event_demographics (event_id, age_group, is_first_timer, attendee_count)
values
    ('30000000-0000-0000-0000-000000000001', 'children', true, 2),
    ('30000000-0000-0000-0000-000000000001', 'children', false, 8),
    ('30000000-0000-0000-0000-000000000001', 'teenagers', true, 6),
    ('30000000-0000-0000-0000-000000000001', 'teenagers', false, 4),
    ('30000000-0000-0000-0000-000000000001', 'adults', true, 1),
    ('30000000-0000-0000-0000-000000000001', 'adults', false, 19)
on conflict (event_id, age_group, is_first_timer) do nothing;

insert into public.data_event_reach (event_id, source, reach_count)
values
    ('30000000-0000-0000-0000-000000000001', 'Word of Mouth', 50),
    ('30000000-0000-0000-0000-000000000001', 'Website', 10),
    ('30000000-0000-0000-0000-000000000001', 'Social Media', 40)
on conflict (event_id, source) do nothing;

insert into public.data_volunteer_hours (id, volunteer_name, department, hours, event_id)
values
    ('50000000-0000-0000-0000-000000000001', 'John Tan', 'Management', 30, '30000000-0000-0000-0000-000000000001'),
    ('50000000-0000-0000-0000-000000000002', 'Greg Lim', 'Operations', 18, '30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
