# Phiếu Phản Ánh — K4 Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: thay từng dòng giữ chỗ bên dưới bằng câu trả lời.
> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Nguyễn Đăng Thanh Vinh  Mã học viên: 2A202602021

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `api_token` không có giá trị mặc định nên app chết ngay khi
khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà việc
"chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

> Một tình huống cụ thể là khi tôi tạo web service trên Render nhưng quên khai báo `API_TOKEN`. Vì trường `api_token` không có mặc định, Pydantic báo `ValidationError` ngay lúc app khởi động và bản deploy không thể nhận traffic. Tôi phát hiện lỗi khi vẫn đang theo dõi quá trình deploy và bổ sung secret đúng chỗ. Nếu dùng mặc định `"changeme"`, service vẫn lên trạng thái live; người biết hoặc đoán được token mặc định có thể gọi `/chat`, làm phát sinh chi phí trước khi tôi nhận ra cấu hình đang sai.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/chat` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

> Dòng log tôi lấy được sau khi gọi `/chat` trong container là `{"event": "chat_completed", "severity": "INFO", "ts": "2026-08-10T10:30:30.917508+00:00", "client_id": "exercise-log", "prompt_tokens": 10, "completion_tokens": 44, "usd_cost": 2.79e-05}`. Từ các trường JSON, tôi có thể nhóm theo `client_id` rồi cộng `usd_cost` để biết client nào tiêu nhiều tiền nhất. Tôi cũng có thể lọc theo `event`, `severity` và khoảng `ts` để dựng dashboard hoặc cảnh báo khi số lỗi tăng. Chuỗi `print("đã trả lời xong")` không có khóa ổn định, thời gian, client, token usage hay chi phí nên không thực hiện được hai việc này một cách tin cậy.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t chat:single .
docker build -t chat:multi .
docker images | grep chat
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu) | 1.73 GB |
| Multi-stage | 296 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

> Tôi build lại đúng Dockerfile single-stage ban đầu bằng `python:3.11` và bản hiện tại bằng `python:3.11-slim`; `docker image ls chat` lần lượt báo `1.73GB` và `296MB`. Phần chênh lệch chủ yếu là hệ điều hành và công cụ có sẵn trong base image Python đầy đủ, cache do `pip install` không dùng `--no-cache-dir`, cùng những file không cần cho runtime bị `COPY . .` đưa vào image. Bản multi-stage dùng base slim và chỉ chuyển các package đã cài từ builder sang runtime, nên không mang toàn bộ môi trường build sang image cuối.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

> Khi chỉ sửa `app/main.py`, các layer của builder gồm base image, `WORKDIR`, `COPY requirements.txt` và `RUN pip install` vẫn được lấy từ cache vì `requirements.txt` không đổi. Ở runtime, base image, `WORKDIR` và `COPY --from=builder /install /usr/local` cũng được dùng lại. Cache bị mất từ `COPY app ./app`; các bước đứng sau nó như `COPY utils ./utils` và `RUN useradd ...` phải tạo lại, còn `EXPOSE`, `HEALTHCHECK`, `CMD` chỉ tạo metadata nên rất nhanh. Nếu đặt `COPY . .` trước `RUN pip install`, mọi thay đổi nhỏ trong source đều làm checksum của layer `COPY` đổi và bắt Docker tải, giải quyết rồi cài lại toàn bộ dependency dù `requirements.txt` không đổi.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

> Chuỗi rủi ro có thể bắt đầu từ lỗi cho phép thực thi lệnh từ xa trong ứng dụng Python. Nếu process chạy root, kẻ tấn công lập tức có quyền root bên trong container; sau đó họ có thể lợi dụng Docker socket/host volume bị mount sai hoặc một lỗ hổng container escape của kernel để sửa file hay chạy lệnh với quyền cao trên host. `USER appuser` cắt chuỗi ngay sau bước chiếm ứng dụng: mã độc chỉ chạy với UID 10001, không được sửa file hệ thống hay thực hiện nhiều thao tác đặc quyền trong container. Đây là lớp giảm thiểu thiệt hại, không thay thế việc vá lỗi và cấu hình container an toàn.

---

### Câu 6 — Bearer token (CP3)

Vì sao 401 phải kèm header `WWW-Authenticate: Bearer`? Và vì sao ta trả **cùng
một** thông báo lỗi cho cả ba trường hợp (thiếu header, sai scheme, sai token)
thay vì nói rõ sai ở đâu cho người dùng dễ sửa?

> Theo chuẩn Bearer authentication, response 401 kèm `WWW-Authenticate: Bearer` cho client biết tài nguyên yêu cầu cơ chế xác thực nào, để thư viện HTTP hoặc người gọi có thể gửi lại đúng header `Authorization`. Ba trường hợp đều trả cùng thông báo `invalid or missing bearer token` vì nếu nói rõ "scheme đúng nhưng token sai" hay "token gần đúng", endpoint sẽ trở thành một oracle giúp người tấn công thu hẹp quá trình dò token. Chi tiết sửa lỗi dành cho client hợp lệ nên nằm trong tài liệu API, không nên được tiết lộ qua phản hồi xác thực công khai.

---

### Câu 7 — Token bucket (CP3)

Với `capacity=10`, `refill_per_minute=10`: một client im lặng 10 phút rồi gửi
liên tiếp. Nó gửi được bao nhiêu request trước khi bị 429? Nếu bỏ đoạn
`min(capacity, ...)` trong `available()` thì con số đó thành bao nhiêu, và tại sao?

> Với `min(capacity, ...)`, dù im lặng 10 phút thì xô cũng chỉ đầy tối đa 10 token, nên client gửi liên tiếp được 10 request và request thứ 11 nhận 429. Nếu bỏ `min`, tốc độ 10 token/phút sẽ cộng thêm 100 token sau 10 phút. Nếu xô cạn tại lúc bắt đầu chờ, client gửi được 100 request; nếu trước đó xô vẫn đầy thì giá trị có thể lên tới 110. Như vậy `capacity=10` không còn là sức chứa thật và thời gian im lặng bị biến thành khả năng tích lũy một burst rất lớn.

---

### Câu 8 — Ngân sách theo ngày (CP3)

So sánh hạn mức $30/tháng với hạn mức $1/ngày cho cùng một client. Giả sử có sự
cố khiến một client gọi liên tục từ 2h sáng. Với mỗi cách, thiệt hại tối đa là
bao nhiêu và service tự hồi phục khi nào?

> Với hạn mức `$30/tháng`, sự cố bắt đầu lúc 2 giờ sáng có thể đốt gần hết `$30` ngay trong một đợt trước khi bị chặn; service chỉ tự mở lại khi bước sang kỳ tháng mới hoặc khi quản trị viên can thiệp. Với `$1/ngày`, thiệt hại của ngày xảy ra sự cố bị giới hạn quanh `$1` và khóa Redis của ngày UTC tiếp theo là một khóa mới, nên service tự phục hồi vào 00:00 UTC hôm sau. Trong triển khai thực tế có thể vượt hạn mức một lượng rất nhỏ bằng chi phí của request cuối đã được cho qua trước khi chi phí thật của nó được ghi nhận.

---

### Câu 9 — /healthz khác /readyz (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

> Trình tự sẽ là: (1) Redis mất kết nối; (2) endpoint gộp của cả ba container trả 503 dù process FastAPI vẫn sống; (3) load balancer loại đồng thời cả ba instance nên service không còn nơi nhận traffic; (4) nếu endpoint đó còn được dùng làm liveness probe, orchestrator kết luận container hỏng và restart cả ba; (5) Redis vẫn chưa hồi phục nên container mới lại fail probe, tạo vòng lặp restart và tăng tải đúng lúc hệ thống đang sự cố. Tách probe giúp `/healthz` vẫn trả 200 để giữ process sống, còn `/readyz` trả 503 để tạm ngừng traffic. Khi Redis trở lại, readiness tự chuyển về 200 mà không cần restart hàng loạt.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

> Lần deploy Render đầu tiên của tôi build image thành công nhưng app thoát với `Exited with status 3`. Render log ghi `NotImplementedError: TODO (CP4): cài đặt arm`, với traceback đi từ lifespan trong `app/main.py` tới `shutdown_guard.arm()` trong `app/lifecycle.py`. Tôi tìm nguyên nhân bằng Render CLI, giới hạn log đúng khoảng thời gian deploy và đọc từ dòng lỗi cuối ngược lên call stack. Nguyên nhân là CP4 chưa được cài nhưng lifespan luôn gọi `arm()` khi khởi động. Tôi triển khai `arm()` để lưu handler cũ rồi đăng ký handler cho `SIGTERM`/`SIGINT`, đồng thời triển khai `start_draining()` để bật cờ draining và gọi tiếp handler cũ của Uvicorn. Sau khi chạy test CP4, commit và deploy lại, service khởi động thành công; `/healthz` và `/readyz` đều trả 200.
