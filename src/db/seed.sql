-- Seed data: Existing bots

INSERT INTO bots (id, phone_number, workflow_name, status, access_mode, active_from, active_until, sort_order) VALUES
(5, '972527428547', NULL, 'active', 'everyone', NULL, NULL, 0),
(6, '972539232960', 'העלאת סטטוסים', 'active', 'dynamic', NULL, NULL, 1),
(8, '972524039934', 'הגרלה בשעה טובה', 'active', 'everyone', NULL, NULL, 2),
(12, '972524039650', 'הגרלה אמיתי המספר', 'active', 'everyone', NULL, '2026-03-08 23:59:59', 3),
(13, '972536295009', 'הגרלה טליה ביטון', 'active', 'everyone', NULL, NULL, 4),
(11, '972536942147', 'הגרלה רבקה לוי אוריין', 'active', 'everyone', NULL, '2026-02-22 23:59:59', 5),
(9, '972536202362', 'הגרלה דוד יעיש', 'inactive', 'everyone', NULL, '2026-02-19 23:59:59', 6),
(14, '972534001332', 'הגרלה להקת אורות', 'inactive', 'everyone', NULL, '2026-01-10 23:59:59', 7),
(15, '972535464544', 'הגרלה נעם קלימיאן', 'inactive', 'everyone', NULL, '2026-01-10 23:59:59', 8),
(7, '972532360363', NULL, 'inactive', 'everyone', NULL, NULL, 9),
(10, '972536353510', 'הגרלה בשביל הנשמה', 'inactive', 'everyone', NULL, '2025-12-27 23:59:59', 10),
(16, '972535405090', NULL, 'inactive', 'everyone', NULL, NULL, 11)
ON CONFLICT (phone_number) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    status = EXCLUDED.status,
    access_mode = EXCLUDED.access_mode,
    active_until = EXCLUDED.active_until,
    sort_order = EXCLUDED.sort_order;

-- Reset sequence
SELECT setval('bots_id_seq', (SELECT MAX(id) FROM bots));
