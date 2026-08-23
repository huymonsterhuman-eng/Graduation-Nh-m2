# LaptopWorld — Thiết kế tầng AI (Chương báo cáo)

> Tài liệu chi tiết thiết kế và cài đặt trợ lý AI cho LaptopWorld — dùng làm chương "Thiết kế AI" trong báo cáo đồ án tốt nghiệp.

---

## 1. Mục tiêu

Xây dựng trợ lý ảo tích hợp trong cửa hàng thương mại điện tử LaptopWorld, hỗ trợ khách hàng tư vấn sản phẩm bằng ngôn ngữ tự nhiên tiếng Việt. Yêu cầu chính:

1. **Không bịa dữ liệu** — mọi thông tin về giá, tồn kho, thông số phải khớp dữ liệu thật trong PostgreSQL.
2. **Hiểu ngữ nghĩa** — khách hỏi mơ hồ ("laptop chơi game khoảng 25 triệu") vẫn tìm được sản phẩm phù hợp.
3. **Đa lượt hội thoại** — bot nhớ ngữ cảnh trong session (khách nói "so sánh 2 cái đó" thì bot phải hiểu).
4. **Chi phí thấp** — dùng Gemini free tier, không phát sinh chi phí trong quá trình demo.
5. **An toàn** — không lộ API key, chống spam làm cạn quota.

---

## 2. Kiến trúc tổng thể

```
                     ┌───────────────────────┐
                     │   Người dùng (React)   │
                     └───────────┬───────────┘
                                 │ REST + JWT (optional)
                                 ▼
         ┌───────────────────────────────────────────┐
         │      Spring Boot Backend (LaptopWorld)     │
         │                                            │
         │  ┌────────────────┐   ┌────────────────┐  │
         │  │ ChatController │   │ SearchController│  │
         │  └──┬──────┬──────┘   └────┬───────────┘  │
         │     │      │               │              │
         │  RAG-mode  Agent-mode      │              │
         │     │      │               │              │
         │  ┌──▼──┐ ┌─▼──────────┐  ┌─▼──────────┐   │
         │  │Chat │ │AgentChat   │  │SemanticSrch│   │
         │  │Svc  │ │Service     │  │Service     │   │
         │  └──┬──┘ └──┬─────┬───┘  └─────┬──────┘   │
         │     │       │     │            │           │
         │     │    ┌──▼──┐  │       ┌────▼─────┐     │
         │     │    │Tool │  │       │Embedding │     │
         │     │    │Exec │  │       │Service   │     │
         │     │    └─────┘  │       └────┬─────┘     │
         │     │             │            │           │
         │     └───────┬─────┘            │           │
         │             ▼                  ▼           │
         │      ┌────────────┐    ┌──────────────┐    │
         │      │ Gemini API │    │  JdbcTemplate│    │
         │      │(REST client)│   │  + pgvector  │    │
         │      └──────┬─────┘    └──────┬───────┘    │
         └─────────────┼─────────────────┼────────────┘
                       │                 │
                       ▼                 ▼
        ┌──────────────────────┐  ┌─────────────────────┐
        │  Google Gemini API   │  │  PostgreSQL         │
        │  - text generation   │  │  - products         │
        │  - embedding         │  │  - product_embeddings│
        │                      │  │    (vector 768d)     │
        └──────────────────────┘  └─────────────────────┘
```

### 2.1. Các thành phần chính

| Module | Trách nhiệm |
|---|---|
| `GeminiClient` | Wrapper HTTP calls tới Gemini API (embedding + text generation). Dùng Spring `RestClient`. |
| `EmbeddingService` | Chuyển văn bản → vector 768 chiều bằng `gemini-embedding-001`. |
| `ProductEmbeddingService` | Batch embed toàn bộ sản phẩm, lưu vào bảng `product_embeddings` (pgvector). Có source-hash để skip re-embed khi nội dung không đổi. |
| `SemanticSearchService` | Nhận query → embed → truy vấn native pgvector `<=>` để tìm top-K sản phẩm gần nhất. |
| `ChatService` | Chatbot chế độ **RAG cơ bản** — retrieve top-K SP → nhồi vào system prompt → Gemini trả lời. |
| `AgentChatService` | Chatbot chế độ **Agent** với function calling — Gemini tự quyết định gọi tool nào để lấy dữ liệu chính xác. |
| `ToolExecutor` | Dispatch 4 tool: `search_products`, `compare_products`, `recommend_by_budget`, `get_product_detail`. |
| `ChatRateLimiter` | Token-bucket (Bucket4j) giới hạn 30 msg/giờ/session, chống spam. |

### 2.2. Chọn công nghệ

| Lựa chọn | Lý do |
|---|---|
| **Google Gemini** thay vì OpenAI/Anthropic | Có free tier ~1500 req/ngày, đủ cho demo. Chất lượng tiếng Việt tốt. |
| **`gemini-embedding-001`** (768 dim) | Model embedding chính thức, cost thấp, cân bằng chất lượng và tốc độ. |
| **`gemini-flash-latest`** cho generation | Alias tự cập nhật version mới; nhanh, rẻ hơn Pro. |
| **pgvector** cho vector store | Extension PostgreSQL, không cần thêm hạ tầng vector DB riêng. |
| **HNSW index** (Hierarchical Navigable Small World) | Nhanh hơn IVFFlat, không cần train, phù hợp dataset < 1M rows. |
| **RestClient** thay vì Gemini SDK | Tránh phụ thuộc thêm SDK, dễ debug HTTP, không rủi ro version mismatch. |
| **Bucket4j** cho rate limit | Chuẩn công nghệ, hỗ trợ token-bucket + burst chuẩn xác. |

---

## 3. Semantic Search (Truy vấn ngữ nghĩa)

### 3.1. Pipeline embedding sản phẩm

Mỗi sản phẩm được biến thành 1 vector 768 chiều biểu diễn ngữ nghĩa. Vector được lưu ở bảng `product_embeddings`.

**Bước 1 — Chuẩn hóa văn bản:**
```
[Tên SP]. [Mô tả ngắn]. Thương hiệu: [Brand]. Danh mục: [Category].
Thông số: cpu=Intel i7, ram=16GB, ssd=512GB, ...
Giá: 25990000đ.
```

**Bước 2 — Gọi Gemini embedding:**
```
POST /v1beta/models/gemini-embedding-001:embedContent
Body: {
  "content": {"parts": [{"text": "..."}]},
  "taskType": "RETRIEVAL_DOCUMENT",
  "outputDimensionality": 768
}
```
`taskType=RETRIEVAL_DOCUMENT` cho biết vector này dùng để index (khác với `RETRIEVAL_QUERY` dùng khi search).

**Bước 3 — Lưu upsert PostgreSQL:**
```sql
INSERT INTO product_embeddings (product_id, embedding, source_hash, embedded_at)
VALUES (?, ?::vector, ?, NOW())
ON CONFLICT (product_id) DO UPDATE
    SET embedding = EXCLUDED.embedding,
        source_hash = EXCLUDED.source_hash,
        embedded_at = EXCLUDED.embedded_at;
```
`source_hash` là SHA-256 của văn bản đã embed. Lần chạy tiếp theo, nếu hash chưa đổi thì skip → tiết kiệm Gemini quota.

**Bước 4 — HNSW index (V11 migration):**
```sql
CREATE INDEX idx_product_embeddings_hnsw
    ON product_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### 3.2. Truy vấn

```sql
SELECT p.id, 1 - (pe.embedding <=> :queryVec) AS similarity
FROM product_embeddings pe
JOIN products p ON p.id = pe.product_id
WHERE p.deleted_at IS NULL AND p.is_active = TRUE
ORDER BY pe.embedding <=> :queryVec
LIMIT :k;
```

- Toán tử `<=>` = cosine distance
- `1 - distance` = cosine similarity (0-1, cao càng gần)
- HNSW index cho phép query < 10ms trên 200 SP, dễ scale đến 100k+

### 3.3. Kết quả thực nghiệm

| Query | Top-1 result | Similarity |
|---|---|---|
| "laptop gaming dưới 30 triệu" | HP Pavilion Gaming 15 | 0.72 |
| "iphone camera đẹp" | iPhone 15 | 0.67 |
| "tai nghe không dây chống ồn" | JBL Live Pro+ | 0.70 |
| "laptop nhẹ mỏng cho sinh viên" | MSI GF65 Thin | 0.69 |

Các kết quả đều liên quan ngữ nghĩa, không chỉ khớp keyword.

---

## 4. Chatbot mode 1 — RAG (Retrieval-Augmented Generation)

### 4.1. Luồng xử lý

```
User message
    │
    ▼
1. Lưu message vào chat_messages
    │
    ▼
2. Embed câu hỏi → semantic search top-5 sản phẩm
    │
    ▼
3. Load 8 message gần nhất trong session (lịch sử)
    │
    ▼
4. Build prompt:
   [System prompt: role + rules]
   [Context: format top-5 sản phẩm với id/name/price/specs]
   [History: lịch sử compressed]
   [Current question]
    │
    ▼
5. Gọi Gemini generateContent
    │
    ▼
6. Lưu reply vào chat_messages với tokens + response_time
    │
    ▼
Return: {reply text, cited products}
```

### 4.2. System prompt (chi tiết)

```
Bạn là trợ lý bán hàng của LaptopWorld — cửa hàng thiết bị công nghệ tại Việt Nam.
Nhiệm vụ: giúp khách hàng tìm và chọn sản phẩm phù hợp.

QUY TẮC BẮT BUỘC:
1. CHỈ giới thiệu sản phẩm có trong danh sách "Sản phẩm liên quan" bên dưới.
   KHÔNG được bịa tên, giá, hoặc thông số không có trong danh sách.
2. Nếu không có sản phẩm nào phù hợp trong danh sách, hãy nói thật:
   "Hiện tôi chưa tìm được sản phẩm phù hợp với yêu cầu của bạn.
    Bạn có thể mô tả kỹ hơn được không?"
3. Trả lời bằng tiếng Việt tự nhiên, thân thiện, ngắn gọn (tối đa ~200 từ).
4. Khi đề xuất sản phẩm, viết theo format:
   **[Tên SP]** — [giá đã format VNĐ]
   Nêu 1-2 điểm nổi bật ngắn gọn.
5. Nếu khách hỏi so sánh, hãy nêu ưu điểm/nhược điểm rõ ràng.
6. Nếu câu hỏi không liên quan đến sản phẩm/mua sắm, hãy lịch sự chuyển hướng.
```

### 4.3. Điểm mạnh và giới hạn

**Ưu điểm:**
- Đơn giản, 1 lần gọi Gemini per user message.
- Chi phí thấp (~600-900 input tokens + 200-350 output tokens).
- Response time ổn định 2-3s.

**Hạn chế:**
- Bot chỉ thấy top-5 SP semantic tìm được, không thể truy vấn ngẫu nhiên khác.
- Không lấy được dữ liệu real-time (VD stock chính xác tại thời điểm hỏi — top-5 context có thể cũ vài giây so với DB).
- Không xử lý được câu hỏi cụ thể theo ID hoặc so sánh 2 SP đã xác định.

→ Cần chế độ **Agent** để giải quyết.

---

## 5. Chatbot mode 2 — Agent với Function Calling

### 5.1. Nguyên lý

Thay vì nhồi sẵn context vào prompt, ta cho Gemini biết có 4 "công cụ" (function) và để nó tự quyết định gọi khi cần. Gemini trả về `functionCall` → backend thực thi → gửi kết quả lại cho Gemini → Gemini tổng hợp thành text.

### 5.2. 4 tool đã cài đặt

| Tool | Tham số | Chức năng |
|---|---|---|
| `search_products` | `query`, `limit?` | Semantic search theo câu hỏi tự nhiên |
| `compare_products` | `productIds[]` | So sánh 2-3 SP theo thông số kỹ thuật |
| `recommend_by_budget` | `budget`, `useCase`, `categorySlug?` | Gợi ý SP phù hợp ngân sách + mục đích |
| `get_product_detail` | `productId` | Lấy full chi tiết 1 SP (giá, stock, specs) |

### 5.3. Luồng multi-turn tool call

```
User: "Sản phẩm ID 1 còn hàng không?"
  │
  ▼
Iter 1: Send to Gemini với tools declaration
  ← Gemini return functionCall{name="get_product_detail", args={productId:1}}
  │
  ▼
Backend: ToolExecutor dispatch → productRepository.findWithDetailsById(1)
       → return {id, name, stock:15, price, specs...}
  │
  ▼
Iter 2: Append (model turn + user functionResponse) → send to Gemini
  ← Gemini return text: "Sản phẩm Samsung Galaxy S23 Ultra còn hàng (15 máy).
                         Giá 25,990,000 VNĐ. Chip Snapdragon 8 Gen 2..."
  │
  ▼
Return reply to user
```

Loop tối đa 5 iterations. Nếu vượt (VD tool trả error, Gemini gọi lặp lại) → fallback message.

### 5.4. Điểm kỹ thuật quan trọng

**thought_signature** — Gemini 2.5+ yêu cầu khi echo lại `functionCall` từ turn trước, phải giữ nguyên field `thoughtSignature` của Part. Bỏ sẽ trả 400 với message "Function call is missing a thought_signature". Đã xử lý bằng cách capture toàn bộ `Part` từ response và pass ngược lại.

**thinkingBudget=0** — Gemini 2.5 có "thinking mode" mặc định ăn ~500-1000 token. Với chat ngắn, ta tắt bằng `generationConfig.thinkingConfig.thinkingBudget = 0` để tiết kiệm quota + phản hồi nhanh.

**Multi-turn contents** — Gemini API dùng structure:
```json
{"contents": [
  {"role": "user",  "parts": [{"text": "..."}]},
  {"role": "model", "parts": [{"functionCall": {...}, "thoughtSignature": "..."}]},
  {"role": "user",  "parts": [{"functionResponse": {"name": "...", "response": {...}}}]},
  {"role": "model", "parts": [{"text": "reply"}]}
]}
```

### 5.5. Ví dụ hội thoại thực

**Turn 1:** "Sản phẩm ID 1 còn hàng không? Giá bao nhiêu?"
→ Bot gọi `get_product_detail(1)` → trả lời:
> Sản phẩm **Samsung Galaxy S23 Ultra** hiện **còn hàng** tại LaptopWorld (còn 15 sản phẩm). Giá bán: 25,990,000 VNĐ. Chip Snapdragon 8 Gen 2 mạnh mẽ, camera 108MP, pin 5000mAh.

**Turn 2:** "So sánh giúp SP id 71 với id 91"
→ Bot gọi `compare_products([71, 91])` → trả bảng markdown chi tiết, đánh giá ưu/nhược, hỏi follow-up.

**Turn 3:** "Ngân sách 15 triệu, cần điện thoại chụp ảnh đẹp"
→ Bot gọi `recommend_by_budget(15000000, "chụp ảnh đẹp")` → gợi ý Xiaomi Redmi Note 12 Pro (108MP camera) + OPPO F21 Pro.

---

## 6. So sánh 2 mode

| Tiêu chí | RAG | Agent |
|---|---|---|
| Số lần gọi Gemini | 1 | 2-6 (tùy tool calls) |
| Latency trung bình | 2-3s | 4-10s |
| Input tokens/turn | 600-900 | 1500-4000 |
| Chính xác dữ liệu | Cao với top-5 | Rất cao (query DB thật) |
| Xử lý câu hỏi ngoài top-5 | Kém | Tốt |
| So sánh SP theo ID | Không | Có (`compare_products`) |
| Lấy stock chính xác | Có thể cũ vài giây | Real-time |
| Chi phí | Thấp | Cao hơn 3-5 lần |
| Endpoint | `POST /api/ai/chat/sessions/{id}/messages` | `POST /api/ai/chat/sessions/{id}/agent-messages` |

**Chiến lược khuyến nghị:** Frontend dùng RAG mặc định cho query mơ hồ, chuyển sang Agent khi user hỏi cụ thể theo ID/tên SP hoặc yêu cầu so sánh.

---

## 7. Rate limit và bảo mật

### 7.1. Rate limit (Bucket4j)

- **30 message/giờ/session** với **burst tối đa 5** liên tiếp
- Token bucket: capacity=5, refill greedy 30 token/1 giờ
- Key = `session_id` (mỗi session có bucket riêng, in-memory)
- Vượt hạn mức → HTTP 429 với message tiếng Việt kèm thời gian chờ

### 7.2. Bảo mật

| Rủi ro | Biện pháp |
|---|---|
| Lộ API key | Không log, không trả về client, đặt trong `application-local.properties` (gitignored) |
| Prompt injection | System prompt định nghĩa strict: chỉ tư vấn SP LaptopWorld, redirect câu ngoài scope |
| Gemini trả về error thô | Wrap trong `BusinessException` với message tiếng Việt cho user, log chi tiết ở server |
| Quota exhaust | Rate limit + retry logic khi rate limit ở Gemini side (đã handle qua try/catch) |
| Timeout Gemini treo | Read timeout 30s (`app.ai.gemini.timeout-seconds`), connect timeout 10s |
| Enumeration guest session | Chấp nhận cho demo. Prod nên dùng UUID thay BIGSERIAL |

---

## 8. Hiệu năng & Chi phí

### 8.1. Đo lường thực tế

Test với 200 sản phẩm, câu hỏi tiếng Việt trung bình:

| Metric | RAG | Agent |
|---|---|---|
| P50 latency | 2.5s | 5s |
| P95 latency | 3.5s | 12s |
| Input tokens (median) | 700 | 2500 |
| Output tokens (median) | 280 | 350 |

### 8.2. Ước lượng quota Gemini free tier

- Embedding: `gemini-embedding-001` — 100 request/phút
- Generation: `gemini-flash-latest` — 15 RPM, 1M tokens/ngày, 1500 req/ngày (free tier hiện tại)

Với batch embed 200 SP: cần ~14 phút (bị rate limit 100 RPM).
Với chat: ~1500 request/ngày = ~50 user chat 30 lần/ngày → đủ demo.

### 8.3. Nếu chuyển production

- Nâng lên Tier 1 Gemini API (yêu cầu billing card): 2000 RPM, không giới hạn ngày
- Có thể cache embedding của top câu hỏi phổ biến bằng Redis
- Migrate rate limit sang Redis-backed Bucket4j để scale horizontal

---

## 9. Rủi ro & giới hạn

1. **Gemini deprecation** — Model tên (`gemini-2.0-flash`, `text-embedding-004`) đã bị Google đổi tên trong quá trình phát triển. Dùng alias `gemini-flash-latest` để giảm rủi ro, nhưng vẫn phải theo dõi Google update.
2. **Chất lượng embedding tiếng Việt** — Gemini embedding tốt cho tiếng Việt nhưng similarity threshold không tuyệt đối. Với dataset lớn nên fine-tune threshold hoặc dùng re-rank.
3. **Chi phí scale** — Free tier hết → cần Tier 1 (yêu cầu thẻ). Cho đồ án thì đủ, cho startup thực cần tính toán.
4. **Multi-tenant / privacy** — Nếu có nhiều cửa hàng, cần isolate embedding + prompt theo tenant.
5. **Hallucination residual** — Dù có RAG, Gemini vẫn có thể bịa nếu câu hỏi vượt scope. Đã ràng buộc bằng system prompt.

---

## 10. Kết luận

Tầng AI của LaptopWorld đã hoàn thiện ở mức MVP:
- ✅ Semantic search với pgvector (200 SP đã embed)
- ✅ Chatbot RAG cơ bản cho use case đơn giản
- ✅ Agent với 4 tool function calling cho query phức tạp
- ✅ Rate limit chống spam
- ✅ Timeout guard cho Gemini API

Điểm khác biệt so với dự án reference (webthegioididong Laravel): tích hợp AI như một layer chính, không phải phụ trợ. Bot có thể **thay thế phần lớn nhân viên tư vấn cấp 1** — trả lời được câu hỏi về giá, tồn kho, so sánh, gợi ý theo ngân sách.

**Hướng phát triển:**
- Integration với FE React (Phase 8) — chat widget floating bottom-right
- Streaming response (SSE) — user thấy text đang được sinh ra thay vì đợi full response
- Function calling thêm: `add_to_cart`, `check_order_status` — bot có thể thao tác thay user
- RLHF-lite: log conversation, admin đánh giá, dùng data để fine-tune prompt
