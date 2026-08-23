# LaptopWorld — Database Schema (PostgreSQL)

> Toàn bộ schema quản lý bằng **Flyway migration** (`src/main/resources/db/migration/`).
> Hibernate chạy ở chế độ `ddl-auto=validate` — chỉ kiểm tra, KHÔNG tự tạo/sửa bảng.
> Tham khảo: [reference database.md](../../../HK2025-2026/Xampp/htdocs/Project/Project/webthegioididong/ai-docs/database.md) (Laravel MySQL).

---

## 1. Quyết định thiết kế xuyên suốt

| Điểm | Chọn | Lý do |
|---|---|---|
| Naming | `snake_case` cho bảng + cột | Chuẩn PostgreSQL, Hibernate mặc định (`SpringPhysicalNamingStrategy`) map camelCase Java → snake_case DB |
| Primary key | `BIGSERIAL` (BIGINT auto-increment) | Đơn giản, index nhỏ, đủ dùng — không cần UUID cho đồ án |
| Tiền tệ | `NUMERIC(15,2)` | Đủ chứa hàng ngàn tỷ VND, không mất chính xác như DOUBLE |
| Timestamp | `TIMESTAMPTZ` (with time zone) | Chuẩn quốc tế, tránh confusion khi deploy khác timezone |
| Thông số kỹ thuật SP | Cột `specs JSONB` + template theo category | Linh hoạt cho nhiều nhóm hàng, query được với JSONB operators |
| Soft delete | Cột `deleted_at TIMESTAMPTZ NULL` (chỉ `products`) | Giữ lịch sử đơn khi ẩn SP |
| Audit timestamps | `created_at`, `updated_at` (`TIMESTAMPTZ`, mặc định `NOW()`) | Trigger tự cập nhật `updated_at` |
| Enum | Dùng `VARCHAR` + CHECK constraint | Không dùng `CREATE TYPE ENUM` — dễ migrate/thay đổi hơn |
| Extension | `vector`, `pg_trgm`, `unaccent` | Vector cho AI RAG; pg_trgm cho fuzzy search; unaccent cho search bỏ dấu tiếng Việt |
| Foreign key | Index tay từng FK | PostgreSQL KHÔNG auto-index FK — nếu quên sẽ chậm join |

---

## 2. Danh sách migration files

| File | Nội dung | Số bảng |
|---|---|---|
| `V1__init_extensions.sql` | Bật `vector`, `pg_trgm`, `unaccent`; hàm trigger dùng chung | — |
| `V2__catalog_tables.sql` | Catalog | 6 |
| `V3__auth_tables.sql` | User, role, permission, refresh_token | 7 |
| `V4__order_tables.sql` | Cart, order | 4 |
| `V5__voucher_tables.sql` | Voucher | 2 |
| `V6__review_table.sql` | Review | 1 |
| `V7__inventory_tables.sql` | FIFO inventory | 5 |
| `V8__ai_tables.sql` | Chat + product embeddings | 3 |
| `V9__blog_tables.sql` | Blog + banner | 3 |
| `V10__activity_log.sql` | Audit log | 1 |
| `V11__indexes.sql` | Tổng hợp các index nâng cao (GIN/HNSW) | — |

**Tổng: 32 bảng.**

---

## 3. Nhóm bảng theo module

### 3.1. Catalog (V2)

#### `categories`
Danh mục sản phẩm, hỗ trợ cấu trúc cha/con (`parent_id`). Mỗi category có thể định nghĩa `spec_template` (JSON) mô tả các trường thông số kỹ thuật cần điền cho SP thuộc category đó.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR(150) NOT NULL | |
| `slug` | VARCHAR(160) NOT NULL UNIQUE | |
| `parent_id` | BIGINT FK → categories.id ON DELETE SET NULL | Null = root |
| `description` | TEXT | |
| `image` | VARCHAR(500) | |
| `spec_template` | JSONB | VD: `[{"key":"cpu","label":"CPU","type":"text","required":true},...]` |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `sort_order` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at`, `updated_at` | TIMESTAMPTZ | Auto |

#### `brands`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR(150) NOT NULL | |
| `slug` | VARCHAR(160) NOT NULL UNIQUE | |
| `logo` | VARCHAR(500) | |
| `description` | TEXT | |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

#### `products`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR(255) NOT NULL | |
| `slug` | VARCHAR(280) NOT NULL UNIQUE | |
| `sku` | VARCHAR(80) UNIQUE | |
| `short_description` | VARCHAR(500) | Mô tả ngắn hiển thị trong list |
| `description` | TEXT | Mô tả dài (HTML) |
| `price` | NUMERIC(15,2) NOT NULL | |
| `sale_price` | NUMERIC(15,2) | Giá KM, null nếu không giảm |
| `brand_id` | BIGINT FK → brands ON DELETE SET NULL | |
| `category_id` | BIGINT FK → categories ON DELETE SET NULL | |
| `specs` | JSONB | Theo template của category. VD: `{"cpu":"i7-13700H","ram":"16GB",...}` |
| `stock` | INTEGER NOT NULL DEFAULT 0 | Cập nhật bởi InventoryService |
| `views` | INTEGER NOT NULL DEFAULT 0 | |
| `is_featured` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | Cho phép ẩn tạm không cần soft delete |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Index đặc biệt** (ở V11): full-text `to_tsvector('simple', unaccent(name || ' ' || coalesce(short_description,'')))`; GIN trên `specs`; trigram trên `name`.

#### `product_images`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `product_id` | BIGINT NOT NULL FK → products ON DELETE CASCADE | |
| `path` | VARCHAR(500) NOT NULL | |
| `alt` | VARCHAR(255) | |
| `sort_order` | INTEGER NOT NULL DEFAULT 0 | |
| `is_primary` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

#### `collections`
Nhóm sản phẩm marketing (VD "Deal HOT tháng 8", "Laptop dưới 15 triệu"). Cấu trúc nested giống categories.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR(150) NOT NULL | |
| `slug` | VARCHAR(160) NOT NULL UNIQUE | |
| `image` | VARCHAR(500) | |
| `description` | TEXT | |
| `parent_id` | BIGINT FK self ON DELETE SET NULL | |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `show_on_home` | BOOLEAN DEFAULT FALSE | |
| `sort_order` | INTEGER DEFAULT 0 | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

#### `collection_product` (pivot)
| Cột | Kiểu |
|---|---|
| `collection_id` | BIGINT NOT NULL FK → collections ON DELETE CASCADE |
| `product_id` | BIGINT NOT NULL FK → products ON DELETE CASCADE |
| `sort_order` | INTEGER DEFAULT 0 |
| PK | (collection_id, product_id) |

---

### 3.2. Auth & User (V3)

- **`users`**: id, username UNIQUE, email UNIQUE nullable, email_verified_at, password (BCrypt), full_name, phone, avatar, gender, birthday, status VARCHAR (`active`/`banned`/`unverified`), timestamps.
- **`addresses`**: id, user_id FK CASCADE, name, phone, address, ward, district, province, is_default, timestamps.
- **`roles`**: id, name UNIQUE (`ADMIN`/`STAFF`/`CUSTOMER`), description, timestamps.
- **`permissions`**: id, code UNIQUE (VD `product.create`), description, timestamps.
- **`user_roles`**: pivot (user_id, role_id) PK.
- **`role_permissions`**: pivot (role_id, permission_id) PK.
- **`refresh_tokens`**: id, user_id FK, token UNIQUE, expires_at, revoked_at, user_agent, ip, created_at.

---

### 3.3. Order (V4)

- **`carts`**: id, user_id FK UNIQUE, timestamps. (Mỗi user 1 cart trong DB — có thể chuyển Redis sau nếu cần.)
- **`cart_items`**: id, cart_id FK, product_id FK, quantity, price_snapshot, added_at, updated_at.
- **`orders`**: id, code UNIQUE (`ORD-YYYYMMDD-NNN`), user_id FK, subtotal, discount_amount, shipping_fee, total, shipping_name/address/phone/method, status VARCHAR (`pending`/`confirmed`/`shipping`/`delivered`/`cancelled`), payment_method VARCHAR (`cod`/`vnpay`/`momo`), payment_status VARCHAR (`unpaid`/`paid`/`refunded`), voucher_id FK nullable, partner_id FK nullable (shipping provider), tracking_number, admin_note, delivered_at, cancelled_at, timestamps.
- **`order_details`**: id, order_id FK CASCADE, product_id FK ON DELETE SET NULL, product_name (snapshot), product_image (snapshot), quantity, price_at_purchase (snapshot), timestamps.

---

### 3.4. Voucher (V5)

- **`vouchers`**: id, code UNIQUE, name, type (`fixed`/`percent`), discount_amount, min_order_value, max_discount (nullable, dùng khi type=percent), started_at, expires_at, usage_limit (nullable = ∞), used_count DEFAULT 0, is_active, timestamps.
- **`user_vouchers`**: id, user_id FK CASCADE, voucher_id FK CASCADE, is_used, used_at, order_id nullable, timestamps. UNIQUE(user_id, voucher_id).

---

### 3.5. Review (V6)

- **`reviews`**: id, user_id FK CASCADE, product_id FK CASCADE, rating SMALLINT CHECK (1-5), comment, images JSONB (mảng URL), is_hidden BOOLEAN, admin_reply, timestamps. UNIQUE(user_id, product_id).

---

### 3.6. Inventory FIFO (V7)

- **`partners`**: id, name, type (`supplier`/`shipping_provider`), phone, email, address, is_active, timestamps.
- **`goods_receipts`** (phiếu nhập): id, code UNIQUE (`GR-YYYYMMDD-NNN`), supplier_id FK CASCADE, user_id FK (người lập phiếu), total_amount, note, timestamps.
- **`goods_receipt_details`** (chi tiết nhập — lô hàng): id, goods_receipt_id FK CASCADE, product_id FK CASCADE, quantity, **remaining_quantity** (số còn trong lô — key FIFO), import_price, timestamps.
- **`goods_issues`** (phiếu xuất): id, code UNIQUE (`GI-YYYYMMDD-NNN`), order_id FK CASCADE, type VARCHAR (`auto`/`manual`), author_id FK nullable, note, total_cogs, status VARCHAR (`completed`/`cancelled`), timestamps.
- **`goods_issue_details`** (chi tiết xuất — audit trail FIFO): id, goods_issue_id FK CASCADE, goods_receipt_detail_id FK (batch nguồn), product_id FK CASCADE, quantity, import_price, total_price, timestamps.

**Business rule**: khi tạo `goods_receipt_detail` → tự set `remaining_quantity = quantity`. Khi xuất kho → chọn batch cũ nhất (`ORDER BY created_at ASC FOR UPDATE`), decrement `remaining_quantity`, log ra `goods_issue_details`. Logic ở Java service (Phase 6), không dùng trigger.

---

### 3.7. AI Layer (V8)

- **`chat_sessions`**: id, user_id FK nullable (guest OK), title VARCHAR (auto sinh từ câu đầu), created_at, last_activity_at, is_archived BOOLEAN.
- **`chat_messages`**: id, session_id FK CASCADE, role VARCHAR (`user`/`assistant`/`system`/`tool`), content TEXT, tool_name VARCHAR nullable, tool_input JSONB nullable, tool_output JSONB nullable, tokens_input INT, tokens_output INT, response_time_ms INT, created_at.
- **`product_embeddings`**: product_id BIGINT PK FK → products CASCADE, embedding **vector(768)** NOT NULL, source_hash TEXT (SHA của text đã embed — detect cần re-embed), embedded_at TIMESTAMPTZ.

**Index vector** (V11): `CREATE INDEX ON product_embeddings USING hnsw (embedding vector_cosine_ops);` — HNSW nhanh hơn IVFFlat và không cần train.

---

### 3.8. Blog (V9)

- **`post_categories`**: id, name, slug UNIQUE, description, timestamps.
- **`posts`**: id, title, slug UNIQUE, post_category_id FK nullable, author_id FK nullable, image, excerpt, content TEXT, is_published BOOLEAN, published_at, views, timestamps.
- **`banners`**: id, title, image, link, sort_order, is_active, author_id FK nullable, timestamps.

---

### 3.9. Activity Log (V10)

- **`activity_logs`**: id, user_id FK nullable ON DELETE SET NULL, action VARCHAR (`created_order`, `updated_product`...), action_type VARCHAR DEFAULT `system`, description TEXT, subject_type VARCHAR nullable (VD `Order`), subject_id BIGINT nullable, properties JSONB, ip VARCHAR, user_agent TEXT, created_at.

Job dọn log > 90 ngày sẽ được viết ở Phase 11.

---

## 4. Sơ đồ quan hệ tóm tắt

```
users (1) ──┬── addresses (N)
            ├── orders (N) ── order_details (N) ── products (N:1 SET NULL)
            ├── reviews (N) ── products (N:1)
            ├── user_vouchers (N) ── vouchers (N:1)
            ├── chat_sessions (N) ── chat_messages (N)
            └── user_roles ── roles ── role_permissions ── permissions

categories (self ref) ── products (N) ── product_images (N)
                                      ├── product_embeddings (1:1)
                                      ├── cart_items / order_details
                                      └── collections (N:M via collection_product)

partners (supplier) ── goods_receipts ── goods_receipt_details ── goods_issue_details ── goods_issues ── orders
```

---

## 5. Convention khi viết migration

- **KHÔNG sửa migration cũ đã chạy trên môi trường ai đó** — chỉ thêm `V{n+1}__...sql` mới.
- Naming: `V<số>__<snake_case_mô_tả>.sql`, đánh số liên tục 1, 2, 3...
- Mỗi file bắt đầu bằng comment header ngắn mô tả.
- Constraint có tên rõ ràng: `PRIMARY KEY`, `UNIQUE (col)`, `CONSTRAINT products_price_positive CHECK (price >= 0)`, `CONSTRAINT fk_products_brand FOREIGN KEY ...`.
- Timestamp default: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- Trigger tự cập nhật `updated_at` dùng function chung từ V1: `set_updated_at()`.

---

## 6. Sequences cho mã code

Mã đơn/phiếu dạng `ORD-20260816-001` KHÔNG dùng PostgreSQL sequence — sinh ở Java service (Phase 4/6), query `MAX(seq)` trong ngày hôm đó rồi `+1`, khóa row-level tránh race (`SELECT ... FOR UPDATE`). Lý do: sequence PostgreSQL không reset theo ngày dễ, và dùng Java cho phép format tùy biến.
