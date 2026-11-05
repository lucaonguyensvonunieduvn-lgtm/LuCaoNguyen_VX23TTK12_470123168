# Lữ Cao Nguyên\_VX23TTK12\_470123168



# Xây dựng website bán sản phẩm Laptop

Website thương mại điện tử bán laptop nhiều hãng. Khách xem máy, tìm, lọc, so sánh, giỏ và đặt hàng. Admin quản lý hãng, danh mục, sản phẩm, cấu hình, đơn, khách, mã giảm giá, đánh giá và báo cáo. Frontend React gọi ASP.NET Core API. API làm việc với Microsoft SQL Server.

Chưa có thanh toán online. Khách đặt hàng với trạng thái Pending. Thẻ và chuyển khoản hiện Đang phát triển.

## Công nghệ hiện tại

* React, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Recharts
* ASP.NET Core 9 Web API
* ASP.NET Core Identity và JWT
* Entity Framework Core 9
* FluentValidation
* Microsoft SQL Server

Máy này có .NET SDK 9, nên backend dùng .NET 9. Cách chạy giống bài ASP.NET Core thông thường.

## Chức năng

Khách:

* Xem trang chủ, danh mục, hãng, ưu đãi và chi tiết laptop.
* Tìm tương đối, lọc, sắp xếp, phân trang.
* So sánh tối đa 3 cấu hình, yêu thích, giỏ hàng.
* Đăng ký, đăng nhập, quên mật khẩu, hồ sơ, đổi mật khẩu, sổ địa chỉ.
* Đặt hàng không thanh toán online, xem đơn của mình.
* Đánh giá laptop đã mua và đã giao.

Admin, sau khi đăng nhập:

* Tổng quan doanh thu, đơn, khách, tồn kho thấp, bán chạy, doanh thu theo hãng.
* Hãng, danh mục, laptop, thông số và cấu hình.
* Đơn hàng và đổi trạng thái. Hủy đơn thì cộng lại tồn kho.
* Khách hàng, mã giảm giá, đánh giá.

Các mục trên đã có trên bản hiện tại và được hướng dẫn chi tiết ngay trong tài liệu này.

## Kiến trúc

Frontend không nói chuyện trực tiếp với SQL Server. Mọi dữ liệu đi qua API.

* `LaptopStore.Api`: HTTP, CORS, JWT, file tĩnh ảnh.
* `LaptopStore.Application`: DTO, validation, interface.
* `LaptopStore.Domain`: entity.
* `LaptopStore.Infrastructure`: EF Core, Identity, seed, migration, các service.

Không có tầng repository. Không dùng Docker.

## Yêu cầu môi trường

* Node.js 20 trở lên
* .NET SDK 9 trở lên
* Microsoft SQL Server đang chạy

## Cấu hình SQL Server

Chuỗi kết nối nằm trong `src/backend/LaptopStore.Api/appsettings.json`, khóa `ConnectionStrings:DefaultConnection`.

Bản gửi đi dùng instance mặc định và tài khoản Windows của máy đang chạy backend:

```text
Server=localhost;Database=LaptopStore;Trusted\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

`Trusted\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_Connection=True` không cần ghi user hay mật khẩu. SQL Server nhận tài khoản Windows đang mở terminal. Tài khoản đó cần quyền tạo database.

Nếu backend báo không kết nối được, sửa đúng dòng `DefaultConnection` rồi chạy lại:

|Máy của bạn|Chuỗi `Server=`|
|-|-|
|Instance mặc định|`localhost`|
|SQL Server Express|`localhost\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SQLEXPRESS`|
|Instance đặt tên|`localhost\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\TÊN`|

Đăng nhập bằng tài khoản SQL thì bỏ `Trusted\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_Connection=True` và thêm user với mật khẩu:

```text
Server=localhost;Database=LaptopStore;User ID=sa;Password=mat-khau;TrustServerCertificate=True;MultipleActiveResultSets=true
```

Xem tên instance: `Get-Service \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*SQL\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*` hoặc `sqlcmd -L`. Service `MSSQLSERVER` là instance mặc định. Service `MSSQL$SQLEXPRESS` thì dùng `localhost\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SQLEXPRESS`. Chi tiết thêm ở `setup/README.md`.

## Chạy backend

Từ thư mục gốc của project:

```text
dotnet run --project src/backend/LaptopStore.Api --launch-profile http
```

Lần chạy đầu, backend tự tạo database `LaptopStore` trên SQL Server nếu chưa có, rồi áp các migration.

Khi log hiện `SQL Server database is ready`, API ở:

* http://localhost:5189/swagger
* http://localhost:5189/api/health

## Chạy frontend

Mở một terminal khác, từ thư mục gốc:

```text
cd src/frontend
npm install
npm run dev
```

Mở http://localhost:5174.

Địa chỉ API nằm trong `src/frontend/.env.development`:

```text
VITE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL=http://localhost:5189
```

Backend chỉ chấp nhận CORS từ `http://localhost:5174` và `http://localhost:4174`.

## Đăng ký và đăng nhập

Trên trang web, chọn biểu tượng tài khoản rồi **Register** hoặc **Login**.

API:

* `POST /api/auth/register`
* `POST /api/auth/login`
* `POST /api/auth/logout`
* `GET /api/auth/me`

Mật khẩu do ASP.NET Core Identity băm trước khi lưu. Database không chứa mật khẩu gốc. Đăng nhập trả về JWT. Trình duyệt giữ token để gọi API. Bấm **Log out** thì token bị xóa khỏi trình duyệt.

Khóa ký JWT nằm ở `Jwt:Key` trong `src/backend/LaptopStore.Api/appsettings.json`. Đây là khóa demo cho máy local. Đổi khóa này trước khi đưa hệ thống ra môi trường thật.

## Tài khoản demo

|Vai trò|Email|Mật khẩu|
|-|-|-|
|Admin|`admin@laptopstore.local`|`Admin@123`|
|Customer|`customer@laptopstore.local`|`Customer@123`|

Hai tài khoản này được tạo khi backend khởi động, từ phase có seed tài khoản. Admin đăng nhập xong vào được `/admin`. Customer mở `/admin` thì bị từ chối.

## Quên mật khẩu

Ở trang đăng nhập, chọn **Forgot password**. Nếu email đã có tài khoản, trang hiện liên kết đặt lại. Cùng liên kết đó được ghi vào log backend. Chưa gửi email thật.

## Sản phẩm

API công khai, sau khi có dữ liệu catalog:

* `GET /api/brands`
* `GET /api/categories`
* `GET /api/products`
* `GET /api/products?categorySlug=gaming`
* `GET /api/products/{slug}`

Ảnh minh họa nằm ở `/catalog/` trên backend. Đây là ảnh laptop lưu trong project, không phải ảnh sản phẩm chính hãng. Giá tính bằng đồng Việt Nam.

Xem kịch bản kiểm thử chi tiết ở phần Kịch bản kiểm thử nghiệp vụ bên dưới.

## Migration

Migration nằm trong `src/backend/LaptopStore.Infrastructure/Persistence/Migrations`.

Không cần chạy `dotnet ef database update` khi demo. Backend tự gọi `Database.Migrate()` lúc khởi động.

Khi thêm migration mới trong lúc phát triển:

```text
dotnet tool restore
dotnet ef migrations add TenMigration --project src/backend/LaptopStore.Infrastructure --startup-project src/backend/LaptopStore.Api --output-dir Persistence/Migrations
```

## Cấu trúc thư mục

```text
src/
├── frontend/                         React, Vite, Tailwind
└── backend/
    ├── LaptopStore.sln
    ├── LaptopStore.Api/              HTTP, CORS, phân quyền
    ├── LaptopStore.Application/      DTO, validation, interface
    ├── LaptopStore.Domain/           Entity
    └── LaptopStore.Infrastructure/   EF Core, Identity, JWT, seed, migration
```

Thêm `setup/` cho ghi chú SQL Server, `releases/` cho các gói bàn giao, `thesis/` và `progress-report/` cho đồ án.

## Seed

Khi backend khởi động và dữ liệu chưa có, hệ thống tạo:

* Role Admin, Customer và hai tài khoản demo.
* Hãng, danh mục, laptop, cấu hình và thông số. Một số cấu hình tồn kho thấp để hiện trên tổng quan.
* Mã giảm giá `SAVE10` và `WELCOME10`.
* Một số đơn và đánh giá mẫu để tổng quan và tìm kiếm có dữ liệu.
* Trang nội dung ở footer.

## Tài khoản và trang quản trị

Admin đăng nhập bằng `admin@laptopstore.local`, rồi mở http://localhost:5174/admin.

* http://localhost:5174/admin/products
* http://localhost:5174/admin/categories
* http://localhost:5174/admin/brands
* http://localhost:5174/admin/orders
* http://localhost:5174/admin/customers
* http://localhost:5174/admin/vouchers
* http://localhost:5174/admin/reviews
* http://localhost:5174/admin/reports

Khách mở hồ sơ tại http://localhost:5174/account.



## Kịch bản kiểm thử nghiệp vụ đề xuất

### 1\. Khách hàng xem sản phẩm, tìm kiếm và so sánh

1. Mở `http://localhost:5174`, xem banner trang chủ, laptop nổi bật và phân loại theo nhu cầu.
2. Bấm vào trang **Laptops**, thử tìm kiếm theo từ khóa (VD: `rog`, `4060`, `i7`) hoặc lọc theo Hãng, Khoảng giá, RAM, GPU ở cột bên trái.
3. Bấm vào một sản phẩm để xem chi tiết: đổi lựa chọn CPU, RAM hoặc SSD -> giá và số lượng tồn kho tự động cập nhật theo cấu hình tương ứng.
4. Chọn cấu hình và bấm **Compare** (tối đa 3 máy). Mở trang **Compare** ở footer để so sánh bảng thông số kỹ thuật trực quan cạnh nhau.

### 2\. Giỏ hàng, Mã giảm giá và Đặt hàng

1. Tại trang chi tiết hoặc danh sách, bấm **Add to Cart**.
2. Mở biểu tượng Giỏ hàng, điều chỉnh số lượng (hệ thống chặn không cho tăng vượt tồn kho).
3. Nhập mã voucher demo: `SAVE10` (giảm 2.500.000 ₫ cho đơn từ 25tr) hoặc `WELCOME10` (giảm 10%, tối đa 7.5tr) -> bấm **Apply**.
4. Bấm **Proceed to Checkout**, điền thông tin người nhận và địa chỉ giao hàng.
5. Chọn phương thức **Place Order (No Online Payment)** và bấm xác nhận đặt hàng. Đơn hàng được tạo thành công ở trạng thái `Pending` và số lượng tồn kho của cấu hình lập tức giảm tương ứng.

### 3\. Khách hàng quản lý tài khoản và Đơn hàng

1. Đăng nhập tài khoản khách (`customer@laptopstore.local` / `Customer@123`).
2. Vào **My Account**:

   * **Overview**: Cập nhật thông tin cá nhân.
   * **Security**: Đổi mật khẩu tài khoản.
   * **Addresses**: Thêm, sửa, xóa sổ địa chỉ giao hàng.
   * **Order History**: Xem danh sách đơn và chi tiết đơn hàng. Với đơn ở trạng thái `Pending`, có thể bấm **Cancel order** -> đơn chuyển sang đã hủy và số lượng tồn kho được hoàn trả tự động vào kho.
   * **Wishlist**: Quản lý danh sách sản phẩm yêu thích (bấm icon trái tim).

### 4\. Đánh giá sản phẩm đã mua

1. Với đơn hàng đã được Admin chuyển sang trạng thái `Delivered`, khách hàng vào trang chi tiết laptop đó -> mục **Reviews**.
2. Chọn số sao (1-5 sao) và viết nhận xét thực tế. Khách hàng chưa mua máy hoặc đơn chưa giao sẽ thấy thông báo chưa đủ điều kiện đánh giá.

### 5\. Quản trị viên (Admin Portal)

1. Đăng nhập tài khoản Admin (`admin@laptopstore.local` / `Admin@123`), truy cập `http://localhost:5174/admin`.
2. **Dashboard**: Xem thống kê KPI doanh thu thật, số đơn hàng, khách hàng, cấu hình sắp hết hàng, top bán chạy.
3. **Products**: Thêm laptop mới, sửa giá, sửa tồn kho, cập nhật thông số, quản lý Hãng (Brands) và Danh mục (Categories).
4. **Orders**: Quản lý đơn hàng, đổi trạng thái tuần tự (`Pending` -> `Confirmed` -> `Processing` -> `Shipped` -> `Delivered`).
5. **Customers**: Xem danh sách khách hàng, khóa/mở khóa tài khoản.
6. **Discounts**: Quản lý mã giảm giá, cấu hình mức giảm và thời hạn áp dụng.
7. **Reviews**: Duyệt và ẩn các đánh giá không phù hợp.

## Để sau

Thanh toán cổng và giao dịch thanh toán chưa làm. Trên form đặt hàng, **Credit / Debit Card** và **Bank Transfer** ghi Coming Soon, không chọn được. **Place Order (No Online Payment)** là cách đặt đơn hiện tại.



