# Thông Tin Deploy — Checkpoint 5

## Thông Tin Học Viên

| Mục | Nội dung |
|-----|----------|
| Họ và tên | Nguyễn Đăng Thành Vinh |
| Mã học viên | 2A202602021 |
| Repo | https://github.com/GapDoiCanxi/K4-Day12-2A202602021-NguyenDangThanhVinh-Services-And-Deployment |

## Service

| Mục | Nội dung |
|-----|----------|
| Public URL | https://day12-chat-2kz8.onrender.com |
| Platform | Render |
| Runtime | Docker |
| Region | Oregon |
| Ngày deploy | 2026-08-10 |
| Application code commit | `026f5e09746468ba1f3e7a0876316ecacbcbcb69` |
| Trạng thái | Live |

## Biến Môi Trường Đã Set Trên Cloud

Chỉ liệt kê tên biến và nguồn giá trị; không lưu secret trong repo.

| Biến | Đã set | Nguồn |
|------|--------|-------|
| `PORT` | ✅ | Render tự gán |
| `API_TOKEN` | ✅ | Secret đặt trên Render, không nằm trong repo |
| `REDIS_URL` | ✅ | Render Key Value `day12-chat-redis` |
| `BUCKET_CAPACITY` | ✅ | Cấu hình Render Blueprint |
| `REFILL_PER_MINUTE` | ✅ | Cấu hình Render Blueprint |
| `DAILY_BUDGET_USD` | ✅ | Cấu hình Render Blueprint |
| `LOG_LEVEL` | ✅ | Cấu hình Render Blueprint |

## Kết Quả Kiểm Tra Thật

### Liveness

```text
GET /healthz
HTTP 200
{"status":"ok","service":"day12-chat-service","version":"1.0.0"}
```

### Readiness

```text
GET /readyz
HTTP 200
{"status":"ready","redis":true}
```

Kết quả `redis: true` xác nhận web service đã kết nối Render Key Value.

### Authentication

```text
POST /chat (không có Authorization header)
HTTP 401
{"detail":"invalid or missing bearer token"}
```

Giá trị `API_TOKEN` không được ghi vào tài liệu này.
