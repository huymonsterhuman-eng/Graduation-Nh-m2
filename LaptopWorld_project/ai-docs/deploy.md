# LaptopWorld — Kế hoạch triển khai Cloud (Deploy)

> Tài liệu tách riêng khỏi [plan.md](plan.md) (đã dài) để tập trung riêng phần đưa dự án lên internet phục vụ hội đồng bảo vệ.
> **Cập nhật:** 2026-09-05 — **ĐỔI PLATFORM: từ Oracle Cloud sang AWS Lightsail** sau 3 ngày Oracle không giải phóng capacity ARM ở SG (kể cả ở mức 1 OCPU + 6 GB). Bắt đầu deploy trên AWS Lightsail $10/tháng (Singapore region), tận dụng $100 credit + Free Tier 3 tháng đầu.

---

## 1. Bối cảnh và mục tiêu

**Nhu cầu:** Sau khi Phase 11 xong (Docker Compose 3 container local), cần một **URL public** để:
- Hội đồng bảo vệ vào demo từ điện thoại/laptop trường (không phải bật máy sinh viên)
- Dán vào báo cáo Word Phase 12 + slide bảo vệ cho chuyên nghiệp
- Bạn bè test hộ, tạo data demo thật cho video Phase 12

**Ràng buộc:**
- Ngân sách sinh viên — ưu tiên 0đ, chấp nhận tối đa ~$5-15/tháng
- Deadline: cần link sẵn sàng **trước bảo vệ ít nhất 3-4 tuần** để có thời gian test + fix bug runtime
- Dự án Java Spring Boot (nặng RAM ~350MB idle, peak 700-900MB khi chatbot AI) — không hợp free tier PaaS 512MB

---

## 2. So sánh các phương án đã cân nhắc

| Platform | Chi phí thật/tháng | RAM cấp | Region VN-friendly | Setup | Rủi ro chatbot AI |
|---|---|---|---|---|---|
| **AWS Lightsail 2GB** ⭐ ĐANG DÙNG (2026-09-05) | **~$0 trong 13 tháng** ($100 credit + free tier 3 tháng) | 2 GB | ✅ Singapore | ✅ Dễ (VPS quản lý) | ✅ OK với `-Xmx400m` |
| ~~Oracle Cloud Free ARM~~ | ~~0đ vĩnh viễn~~ | ~~24 GB tối đa~~ | ✅ Singapore | ⚠️ VPS tay | — | ❌ Bỏ vì SG hết capacity 3 ngày liên tục (fail cả ở 1/6) |
| Contabo VPS S | $5 | 8 GB | ✅ Singapore | ⚠️ VPS tay | ✅ OK | (Backup nếu AWS hết credit) |
| Railway Hobby | ~$14-15 | 1 GB | ✅ Singapore | ✅ 30 phút | ⚠️ Sát nút | — |
| Fly.io | ~$10-15 | 1 GB | ✅ Singapore | ⚠️ TB | ✅ OK | — |
| Northflank Free | 0đ | 512 MB | ❌ US/EU free | ✅ Dễ | ❌ Crash khi AI | — |
| Render + Neon + Vercel + Cloudinary | 0đ | 512 MB | ❌ US | ⚠️ Phức tạp 5 dịch vụ | ❌ Crash + cold start | — |

**Lý do chọn AWS Lightsail (thay Oracle):**
1. **Deploy được ngay** — không dính capacity issue như Oracle ARM
2. **Region Singapore** — latency VN 30-50ms
3. **2 GB RAM** — đủ chạy LaptopWorld với `-Xmx400m` cho backend (idle 342MB, peak ~700MB)
4. **$100 credit + free tier** = **~13 tháng miễn phí**, quá đủ cho đồ án
5. **Managed VPS** — có snapshot, static IP, monitoring, firewall UI đẹp
6. **Điểm cộng báo cáo:** "Triển khai trên AWS Cloud (dịch vụ Lightsail)" cũng chuyên nghiệp không kém Oracle
7. **Rủi ro thấp:** setup 30 phút xong, không phải đợi capacity vô định

**Rủi ro / cảnh báo AWS:**
- **Auto upgrade sang paid plan** nếu dùng service ngoài free plan (VD: RDS, AWS Organizations). **Chỉ dùng Lightsail**, không đụng service khác
- **Card bị charge nếu credit hết mà quên tắt instance** → Bắt buộc setup **billing alert ở $50 + $80**
- **Sau bảo vệ:** phải xóa instance để dừng billing (hoặc để tự hết free plan 4/3/2027)

---

## 3. Tình trạng hiện tại (2026-09-05)

### 🔄 Chuyển hướng platform: Oracle → AWS Lightsail

**Kết quả 3 ngày thử Oracle (2026-09-01 → 2026-09-04):**
- Ngày 1: manual retry 3 shape (4/24, 2/12, 1/6) đều fail "Out of capacity"
- Ngày 2-3: script auto-retry chạy 24/7 — thử ở 4/24 (211 fail) → 2/12 (178 fail) → 1/6 (vẫn fail)
- **Kết luận:** Oracle SG A1.Flex ARM đang bị oversubscribe nặng, không có slot cho tài khoản Free tier mới
- **Quyết định:** dừng Oracle, chuyển AWS

**AWS Lightsail — đang setup:**

| Bước | Chi tiết | Trạng thái |
|---|---|---|
| Tạo tài khoản AWS | Free Plan: $100 credit + 6 tháng free tier (hết 4/3/2027) | ✅ Xong |
| Đổi region console | Sydney → Singapore (ap-southeast-1) | ⏳ Đang làm |
| Setup billing alarm | Cảnh báo $50 + $80 để tránh charge bất ngờ | ⏳ Chưa |
| Tạo Lightsail instance | Ubuntu 22.04, $10/tháng plan (2GB RAM, 60GB SSD, SG) | ⏳ Chưa |
| Static IP + Firewall | Attach IP tĩnh, mở port 80/443 | ⏳ Chưa |
| Deploy Docker Compose | SSH + install Docker + clone repo + up | ⏳ Chưa |
| Caddy + SSL | Reverse proxy + HTTPS free với `<ip>.nip.io` | ⏳ Chưa |

**Cũ (giữ tham chiếu, sẽ xoá sau khi AWS chạy ổn):**

### ✅ Đã hoàn thành phần Oracle (không dùng nữa)

### ✅ Đã hoàn thành

| Bước | Chi tiết |
|---|---|
| Đăng ký Oracle Cloud | Pass với **Vietcombank eVer-link** (virtual card) — may mắn lọt vào ~10-15% tài khoản VN được approve với virtual card |
| Tenancy | `laptopworld-huy` |
| Home Region | `Singapore (ap-singapore-1)` — **KHÔNG ĐỔI ĐƯỢC**, chọn đúng ngay lần đầu |
| SSH key | Đã tạo `~/.ssh/oracle_cloud` (ed25519) — public key sẵn sàng paste vào Oracle |
| Cấu hình VM | Đã điền form: Ubuntu 22.04 Minimal aarch64 + VM.Standard.A1.Flex + Networking auto VCN |
| **OCI CLI 3.92.0** | Cài qua venv Python 3.12 tại `C:\Users\huymo\oci-cli-venv` (bỏ installer official vì bug PyYAML build với Python 3.14) |
| **API key** | Đã tạo `~/.oci/oci_api_key.pem` + upload public key lên Console, fingerprint `3e:1c:f9:59:68:91:f6:0b:0b:82:bc:24:c9:9a:78:db` |
| **VCN + Subnet** | Tận dụng VCN từ wizard fail lần trước: `vcn-20260901-2033` + public subnet `subnet-20260901-2033` (`prohibit-public-ip-on-vnic: false`) |
| **Image OCID** | `Canonical-Ubuntu-22.04-Minimal-aarch64-2026.08.25-0` |
| **Availability Domain** | `HwYs:AP-SINGAPORE-1-AD-1` (SG chỉ có 1 AD) |
| **Script auto-retry** | `C:\Users\huymo\oci-retry.ps1` — PowerShell, 500 attempts × 90s = ~12.5h max, log ra `C:\Users\huymo\oci-retry.log`. **Update 2026-09-02:** giảm shape từ 4/24 → **2 OCPU + 12 GB** sau 211 attempts fail (~5.3h). LaptopWorld chỉ cần ~2GB peak nên 12GB dư sức. Quota còn dư 2/12 cho VM thứ 2 nếu cần. |
| **Windows sleep** | Đã tắt qua `powercfg /change standby-timeout-ac 0` để script chạy liên tục ban đêm |

### ⏳ Đang chờ (script tự động retry)

**Lỗi gặp phải trước khi có script:** `Out of capacity for shape VM.Standard.A1.Flex in availability domain AD-1`

Đã thử manual 3 mức shape đều fail:
- ❌ 4 OCPU + 24 GB
- ❌ 2 OCPU + 12 GB
- ❌ 1 OCPU + 6 GB

**Nguyên nhân:** Oracle Singapore chỉ có 1 Availability Domain (AD-1), quá nhiều tài khoản Free tier request ARM → thường xuyên hết slot.

**Hành động hiện tại:** Script auto-retry đang chạy trong PowerShell window, tự gọi API mỗi 90s.

**Kinh nghiệm rút ra (2026-09-02):**
- **4 OCPU + 24 GB** là mức "hot" nhất, contest gắt → sau 211 attempts (~5.3h) vẫn Out of capacity
- Đã hạ xuống **2 OCPU + 12 GB** — dễ được cấp hơn nhiều (thường 1-2 tiếng)
- Nếu 2/12 vẫn fail sau 3-4 tiếng nữa → hạ tiếp xuống **1 OCPU + 6 GB** (vẫn đủ cho LaptopWorld)

Khi thấy `===== SUCCESS! =====` trong log → sang giai đoạn 5 (SSH + deploy).

---

## 4. Kế hoạch retry Oracle capacity

### Cách 1 — Retry thủ công theo khung giờ ít người

Thời điểm Oracle giải phóng slot cao nhất (kinh nghiệm cộng đồng VN):
- **02:00 - 06:00 sáng VN** (giờ này ít user Á-Âu request)
- **Thứ 7, Chủ nhật buổi sáng**

Cách retry: mở lại wizard → bấm Create → nếu OK thì thành công, nếu fail thử lại sau 1-2 giờ.

### Cách 2 — Script auto-retry ✅ ĐANG DÙNG (2026-09-02)

**Đã bỏ hướng script bên thứ 3** (`hitrov/oci-arm-host-capacity`) vì cần trust code lạ + phức tạp Docker. Thay bằng **PowerShell script tự viết** dùng OCI CLI official:

- File: `C:\Users\huymo\oci-retry.ps1`
- Log: `C:\Users\huymo\oci-retry.log`
- Tần suất: 90s/lần, tối đa 500 lần (~12.5h/session)
- Chỉ retry khi gặp "Out of capacity" (không retry mù)
- Dừng ngay khi gặp lỗi lạ (authentication, config sai...)
- Ctrl+C dừng an toàn bất cứ lúc nào

**Cách chạy:**
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\huymo\oci-retry.ps1
```

**Muốn giảm shape nếu 4/24 mãi fail:** sửa `$OCPUS` và `$MEMORY_GB` trong file .ps1.

### Cách 3 — Fallback nếu Oracle capacity không có sau >7 ngày

Chuyển sang **1 trong 2 phương án dự phòng**:

**Phương án dự phòng A: Contabo VPS S** ($5/tháng)
- Có SG region
- 8 GB RAM, 200 GB SSD, 4 vCPU
- Setup Docker tay tương tự Oracle
- Đăng ký ngay được, không có capacity issue
- Cần credit card **vật lý** (eVer-link có thể fail — cần đặt Vietcombank Connect24 debit vật lý 5-7 ngày)

**Phương án dự phòng B: Render Free + Neon Free + Vercel + Cloudinary** (0đ)
- Không cần credit card
- Deploy được ngay
- Nhưng cần refactor code upload sang Cloudinary API (~2 buổi công)
- Chatbot AI có thể crash khi peak (rủi ro cho demo)

---

## 5. Sau khi có VM Oracle — 6 bước deploy

### Bước 1: SSH vào VM lần đầu + hardening cơ bản (~30 phút)

```bash
# Trên máy Windows PowerShell
ssh -i C:\Users\huymo\.ssh\oracle_cloud ubuntu@<PUBLIC_IP>
```

- Update packages: `sudo apt update && sudo apt upgrade -y`
- Tạo user riêng (không dùng ubuntu default): `sudo adduser deployer` + add sudo group
- Tắt SSH password auth: `sudo nano /etc/ssh/sshd_config` → `PasswordAuthentication no`
- Set timezone: `sudo timedatectl set-timezone Asia/Ho_Chi_Minh`

### Bước 2: Cài Docker + Docker Compose (~15 phút)

```bash
# Cài Docker engine cho Ubuntu ARM
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Logout + login lại để apply group

# Verify
docker --version
docker compose version
```

### Bước 3: Clone repo + cấu hình secrets (~20 phút)

```bash
git clone https://github.com/huymonsterhuman-eng/Graduation-Nh-m2.git
cd Graduation-Nh-m2
```

**Tạo file `.env`** dựa vào `.env.example` (Phase 11D đã có sẵn):
- `DB_PASSWORD` — mật khẩu Postgres mạnh
- `JWT_SECRET` — random 64 ký tự
- `GEMINI_API_KEY` — key riêng của bạn
- `SMTP_USERNAME`, `SMTP_PASSWORD` — Gmail app password
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` — sandbox credentials
- `VNPAY_RETURN_URL` — đổi từ `localhost:8080` → `https://<domain>/api/vnpay/return`

### Bước 4: Mở firewall Oracle + Ubuntu (~10 phút)

**Trong Oracle Console:**
- Vào VCN → Security Lists → default security list
- Add Ingress Rules:
  - Port **80** (HTTP) từ `0.0.0.0/0`
  - Port **443** (HTTPS) từ `0.0.0.0/0`

**Trên Ubuntu:**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Bước 5: Build + chạy Docker Compose (~10-30 phút build lần đầu)

```bash
docker compose up -d --build
docker compose logs -f backend  # theo dõi Flyway migration V1-V26
```

**Verify:**
- `curl http://localhost/api/actuator/health` → UP
- `curl http://localhost/` → HTML frontend
- Login `admin / admin123` → OK

### Bước 6: Reverse proxy + SSL (~30 phút)

**Cài Caddy** (nhẹ hơn Nginx, tự lấy SSL Let's Encrypt):

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

Nội dung Caddyfile:
```
<domain-hoac-ip>.nip.io {
    reverse_proxy localhost:80
}
```

**Tip cho sinh viên không có domain:** dùng dịch vụ free `<IP>.nip.io` — không cần đăng ký domain, ví dụ `123.45.67.89.nip.io` sẽ point tới IP `123.45.67.89`. Caddy tự lấy SSL cho subdomain này.

```bash
sudo systemctl restart caddy
```

Verify: `https://<ip>.nip.io` mở được, có ổ khóa xanh SSL.

---

## 6. Điểm chú ý riêng cho LaptopWorld

### pgvector extension
Phase 5 AI dùng vector similarity search. Trong `docker-compose.yml` đã dùng image `pgvector/pgvector:pg16` → **tự có sẵn**, không phải cài thêm.

### Volume cho ảnh upload
Ảnh SP + banner + blog nằm ở `/uploads` (77MB hiện tại). Trong `docker-compose.yml` cần **volume mount** để không mất khi container restart:
```yaml
volumes:
  - ./uploads:/app/uploads
```
→ Đã có sẵn từ Phase 11D, không cần sửa.

### Flyway migration V1-V26
Tự chạy khi backend boot lần đầu → seed 200 SP + admin + demo data (V22).
→ Sau `docker compose up -d`, database sẵn sàng ngay, không cần import SQL tay.

### Environment variables production
File `application-prod.properties` đã hardened từ Phase 11D:
- Actuator chỉ expose `/health`
- SQL logging OFF
- Swagger UI disabled
- CORS chặt theo domain thật

### Chatbot AI + Gemini API key
- Rate limit token bucket 180 msg/hour, burst 20 → không lo quota Gemini
- Key phải là **key production riêng**, không share với local dev (tránh vượt quota Google)

### VNPay sandbox
- Đổi `VNPAY_RETURN_URL` từ localhost sang domain thật khi deploy
- Sandbox URL callback vẫn work qua HTTPS domain

---

## 7. Timeline đề xuất

```
2026-09-01 (D0, hiện tại):
  ├─ ✅ Đăng ký Oracle xong
  ├─ ✅ SSH key sẵn sàng
  └─ ⏳ Chờ capacity ARM

D+1 → D+5:
  ├─ Retry Oracle 2-3 lần/ngày (sáng sớm + tối muộn)
  └─ (Song song) Tiếp tục làm Phase 12 báo cáo + slide

D+5 → D+7:
  ├─ Nếu Oracle vẫn fail → quyết định chuyển sang Contabo hoặc chờ tiếp
  └─ Nếu Oracle OK → deploy trong 1 buổi (Bước 1-6)

D+7 → D+14:
  ├─ Test toàn bộ luồng trên link deploy thật
  ├─ Quay video Phase 12 dùng URL deploy (không phải localhost)
  └─ Chụp screenshot cho báo cáo Word

Trước bảo vệ 3-4 tuần:
  └─ Link deploy sẵn sàng, không đụng gì để tránh crash
```

---

## 8. Checklist trước ngày bảo vệ

- [ ] Link deploy vẫn UP, health check trả 200
- [ ] Chatbot AI phản hồi được (Gemini key còn quota)
- [ ] Đăng nhập admin OK
- [ ] Đặt đơn mới OK end-to-end
- [ ] VNPay sandbox callback OK
- [ ] SSL còn hạn (Let's Encrypt auto-renew 90 ngày)
- [ ] Backup DB dump gần nhất
- [ ] URL đã dán vào slide + báo cáo Word
- [ ] Có backup plan nếu link chết giữa buổi bảo vệ (chạy local dự phòng)

---

## 9. Rủi ro và mitigation

| Rủi ro | Xác suất | Impact | Cách phòng |
|---|---|---|---|
| Oracle capacity không có sau nhiều ngày | Trung bình | Cao | Fallback Contabo $5/tháng |
| Oracle "phát hiện" eVer-link virtual card → suspend account sau | Thấp | Cao | Đặt Vietcombank Connect24 vật lý làm dự phòng |
| Chatbot AI crash lúc bảo vệ | Thấp (24GB RAM dư) | Rất cao | Monitor RAM, có backup screenshot demo |
| Gemini API quota hết | Thấp | TB | Rate limit đã có, monitor Google Cloud Console |
| SSL Let's Encrypt fail auto-renew | Rất thấp | TB | Caddy tự renew, nếu fail 1 lần vẫn có 30 ngày grace |
| Domain nip.io down | Rất thấp | Cao | Có thể đăng ký domain thật `.tech` free cho sinh viên (Github Student Pack) |

---

## 10. Reference

- Oracle Cloud Free Tier docs: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Docker Compose 3 container hiện có: [../docker-compose.yml](../docker-compose.yml)
- Application prod config: [../src/main/resources/application-prod.properties](../src/main/resources/application-prod.properties)
- Env example: [../.env.example](../.env.example)
- Repo: https://github.com/huymonsterhuman-eng/Graduation-Nh-m2
