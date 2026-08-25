-- Seed admin user TRUOC V15 (V15 seed inventory reference admin.id).
-- Idempotent: ON CONFLICT DO NOTHING — dev DB da co admin tu DataInitializer se skip.
--
-- Ly do: DataInitializer (Java @Component) chay SAU Flyway → tren dev DB co san khong
-- van de vi admin da ton tai tu lan chay truoc. Nhung fresh DB (Docker deploy, CI test,
-- integration test) fail V15 vi user_id=NULL. Fix: seed admin qua Flyway migration.
--
-- Password: admin123 (BCrypt cost 10) — dat mac dinh, doi ngay khi deploy prod that.

INSERT INTO users (username, email, password, full_name, status, email_verified_at,
                   created_at, updated_at)
VALUES ('admin', 'admin@laptopworld.local',
        '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
        'System Administrator', 'active', NOW(),
        NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Gan role ADMIN cho admin user (V3 da tao role ADMIN)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
