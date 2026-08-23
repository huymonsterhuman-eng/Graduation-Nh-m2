# Setup PostgreSQL + pgvector trên Windows

> Dành cho môi trường dev local. Áp dụng cho PostgreSQL đã cài từ EnterpriseDB installer + pgAdmin4.

---

## 1. Cài pgvector — chọn 1 trong 2 cách

### 🌟 Cách A (KHUYÊN DÙNG): Chạy PostgreSQL trong Docker có sẵn pgvector

Ưu điểm: 5 phút xong, không phụ thuộc trình biên dịch. Cách này thay thế hoàn toàn PostgreSQL native đã cài — hai thứ sẽ chạy trên cổng khác nhau (native 5432, Docker 5433 chẳng hạn) hoặc bạn tắt native đi.

**Bước 1.** Cài Docker Desktop for Windows (nếu chưa có): https://www.docker.com/products/docker-desktop/

**Bước 2.** Tạo file `docker-compose.dev.yml` trong thư mục project:
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: laptopworld_postgres
    restart: unless-stopped
    ports:
      - "5433:5432"          # Host 5433 (tránh đụng PostgreSQL native ở 5432)
    environment:
      POSTGRES_DB: laptopworld_dev
      POSTGRES_USER: laptopworld_app
      POSTGRES_PASSWORD: change_me_local
    volumes:
      - laptopworld_pgdata:/var/lib/postgresql/data

volumes:
  laptopworld_pgdata:
```

**Bước 3.** Chạy:
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Bước 4.** Kết nối bằng pgAdmin4 với `host=localhost, port=5433, user=laptopworld_app`. Chạy trong query tool:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT * FROM pg_extension WHERE extname = 'vector';  -- verify
```

**Bước 5.** Đổi `application-dev.properties` để trỏ vào cổng 5433:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/laptopworld_dev
```
Hoặc set env var: `$env:DB_PORT = "5433"`.

→ **Xong. Skip qua mục 2.**

---

### Cách B: Cài pgvector cho PostgreSQL native (khó hơn)

pgvector KHÔNG có installer chính thức cho Windows. Bạn phải compile từ source hoặc lấy binary từ cộng đồng.

**Bước 1.** Cài Visual Studio 2022 Build Tools:
- Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
- Chọn workload: "Desktop development with C++"

**Bước 2.** Mở "x64 Native Tools Command Prompt for VS 2022" (chạy as Administrator).

**Bước 3.** Đặt biến môi trường trỏ tới PostgreSQL install:
```cmd
set "PGROOT=C:\Program Files\PostgreSQL\17"
```
(Đổi `17` thành phiên bản PostgreSQL bạn cài.)

**Bước 4.** Clone và build:
```cmd
cd %TEMP%
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
nmake /F Makefile.win
nmake /F Makefile.win install
```

**Bước 5.** Trong pgAdmin4 hoặc psql, chạy trên database `laptopworld_dev`:
```sql
CREATE EXTENSION vector;
```

Nếu báo lỗi permission → chạy Command Prompt as Administrator ở Bước 2.

---

## 2. Tạo user riêng cho app + cấp quyền

Không dùng user `postgres` (root) cho app. Mở query tool trong pgAdmin4, kết nối vào `postgres` (default DB) rồi chạy:

```sql
-- 1. Tạo user
CREATE USER laptopworld_app WITH PASSWORD 'chon_mot_password_manh_o_day';

-- 2. Cấp quyền trên database
GRANT ALL PRIVILEGES ON DATABASE laptopworld_dev TO laptopworld_app;

-- 3. Chuyển sang database laptopworld_dev
-- (Trong pgAdmin4: right-click database → Query Tool để kết nối vào đúng DB)

-- 4. Cấp quyền trên schema public
GRANT ALL ON SCHEMA public TO laptopworld_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO laptopworld_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO laptopworld_app;

-- 5. Cài extension (nếu chưa)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- cho fuzzy search
```

---

## 3. Verify

Test connect bằng psql (hoặc pgAdmin4):

```sql
-- Kết nối:  psql -h localhost -p 5432 -U laptopworld_app -d laptopworld_dev
-- Nhập password vừa tạo.

SELECT current_user, current_database();
-- Kết quả:  laptopworld_app | laptopworld_dev

SELECT extname FROM pg_extension;
-- Phải có 'vector' trong danh sách.
```

Test tạo vector column:
```sql
CREATE TABLE _test_vec (id INT, v vector(3));
INSERT INTO _test_vec VALUES (1, '[1,2,3]');
SELECT v <-> '[3,2,1]' AS distance FROM _test_vec;
DROP TABLE _test_vec;
```
Nếu chạy được → pgvector OK.

---

## 4. Đưa password vào ứng dụng

**Cách 1 (khuyên dùng):** Tạo file `src/main/resources/application-local.properties` (đã gitignore):
```properties
spring.datasource.password=chon_mot_password_manh_o_day
```
Chạy với 2 profile: `--spring.profiles.active=dev,local`.

**Cách 2:** Đặt biến môi trường trong PowerShell trước khi chạy:
```powershell
$env:DB_PASSWORD = "chon_mot_password_manh_o_day"
./mvnw spring-boot:run
```

**Cách 3 (IntelliJ):** Run Configuration → Environment variables → `DB_PASSWORD=...`.
