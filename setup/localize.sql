UPDATE ProductImages SET Url = REPLACE(Url, '.svg', '.jpg') WHERE Url LIKE '%.svg';
UPDATE OrderItems SET ImageUrl = REPLACE(ImageUrl, '.svg', '.jpg') WHERE ImageUrl LIKE '%.svg';

UPDATE Categories SET Name = N'Laptop doanh nhân', Description = N'Dành cho công việc' WHERE Slug = 'business';
UPDATE Categories SET Name = N'Laptop gaming', Description = N'Chơi game không giới hạn' WHERE Slug = 'gaming';
UPDATE Categories SET Name = N'Laptop sinh viên', Description = N'Học tập và sáng tạo' WHERE Slug = 'student';
UPDATE Categories SET Name = N'Laptop 2 trong 1', Description = N'Linh hoạt cho mọi ý tưởng' WHERE Slug = '2-in-1';
UPDATE Categories SET Name = N'Laptop sáng tạo', Description = N'Dành cho ý tưởng lớn' WHERE Slug = 'creator';

UPDATE Brands SET Description = N'Laptop ' + Name;

UPDATE SpecificationAttributes SET Name = N'Màn hình' WHERE Slug = 'display-size';
UPDATE SpecificationAttributes SET Name = N'Độ phân giải' WHERE Slug = 'resolution';
UPDATE SpecificationAttributes SET Name = N'Tần số quét' WHERE Slug = 'refresh-rate';
UPDATE SpecificationAttributes SET Name = N'Tấm nền' WHERE Slug = 'panel';
UPDATE SpecificationAttributes SET Name = N'Hệ điều hành' WHERE Slug = 'os';
UPDATE SpecificationAttributes SET Name = N'Khối lượng' WHERE Slug = 'weight';
UPDATE SpecificationAttributes SET Name = N'Pin' WHERE Slug = 'battery';
UPDATE SpecificationAttributes SET Name = N'Cổng kết nối' WHERE Slug = 'ports';
UPDATE SpecificationAttributes SET Name = N'Bảo hành' WHERE Slug = 'warranty';
UPDATE SpecificationAttributes SET Name = N'Ổ cứng' WHERE Slug = 'storage';

UPDATE ProductSpecifications SET Value = N'Bảo hành 1 năm' WHERE Value = '1 Year Limited Warranty';

UPDATE Products SET ShortDescription = N'MacBook Air thế hệ M3, mỏng và đủ dùng cả ngày.', Description = N'MacBook Air thế hệ M3, mỏng và đủ dùng cả ngày.' WHERE Slug = 'apple-macbook-air-13-m3';
UPDATE Products SET ShortDescription = N'Laptop doanh nhân gọn, bàn phím sạch.', Description = N'Laptop doanh nhân gọn, bàn phím sạch.' WHERE Slug = 'dell-xps-13-plus';
UPDATE Products SET ShortDescription = N'Laptop gaming 16 inch, có lựa chọn RTX 4070.', Description = N'Laptop gaming 16 inch, có lựa chọn RTX 4070.' WHERE Slug = 'asus-rog-strix-g16';
UPDATE Products SET ShortDescription = N'Laptop doanh nhân nhẹ, bàn phím dễ gõ.', Description = N'Laptop doanh nhân nhẹ, bàn phím dễ gõ.' WHERE Slug = 'lenovo-thinkpad-x1-carbon';
UPDATE Products SET ShortDescription = N'Máy lật xoay cho ghi chú và thiết kế.', Description = N'Máy lật xoay cho ghi chú và thiết kế.' WHERE Slug = 'hp-spectre-x360-14';
UPDATE Products SET ShortDescription = N'Laptop sinh viên màn OLED, giá dễ tiếp cận.', Description = N'Laptop sinh viên màn OLED, giá dễ tiếp cận.' WHERE Slug = 'acer-swift-go-14';
UPDATE Products SET ShortDescription = N'Laptop gaming trang bị RTX 4060.', Description = N'Laptop gaming trang bị RTX 4060.' WHERE Slug = 'msi-katana-15';
UPDATE Products SET ShortDescription = N'Laptop mỏng cho việc hàng ngày.', Description = N'Laptop mỏng cho việc hàng ngày.' WHERE Slug = 'microsoft-surface-laptop-7';
UPDATE Products SET ShortDescription = N'Máy chuyên nghiệp cho biên dịch và dựng nội dung dài.', Description = N'Máy chuyên nghiệp cho biên dịch và dựng nội dung dài.' WHERE Slug = 'apple-macbook-pro-14-m4';
UPDATE Products SET ShortDescription = N'Laptop gaming 16 inch, màn 240Hz.', Description = N'Laptop gaming 16 inch, màn 240Hz.' WHERE Slug = 'acer-predator-helios-16';
UPDATE Products SET ShortDescription = N'Laptop gaming êm, vừa chơi vừa dựng video.', Description = N'Laptop gaming êm, vừa chơi vừa dựng video.' WHERE Slug = 'lenovo-legion-7i';
UPDATE Products SET ShortDescription = N'Laptop OLED mỏng cho viết và chỉnh ảnh.', Description = N'Laptop OLED mỏng cho viết và chỉnh ảnh.' WHERE Slug = 'asus-zenbook-14-oled';

UPDATE ContentPages SET Title = N'Về chúng tôi', Body = N'Velora giúp bạn so sánh cấu hình trước khi mua. Giá và tồn kho lấy từ cơ sở dữ liệu.' WHERE Slug = 'about';
UPDATE ContentPages SET Title = N'Chính sách riêng tư', Body = N'Chúng tôi lưu tài khoản, địa chỉ và đơn hàng để xử lý đơn. Mật khẩu được băm, không lưu dạng gốc.' WHERE Slug = 'privacy';
UPDATE ContentPages SET Title = N'Điều khoản', Body = N'Đơn hàng là yêu cầu mua máy. Thanh toán thẻ online chưa mở.' WHERE Slug = 'terms';
UPDATE ContentPages SET Title = N'Đổi trả', Body = N'Liên hệ hỗ trợ nếu cần đổi trả. Hủy đơn đang chờ xác nhận sẽ trả lại tồn kho.' WHERE Slug = 'returns';
UPDATE ContentPages SET Title = N'Bảo hành', Body = N'Thời hạn bảo hành ghi trong thông số của từng laptop.' WHERE Slug = 'warranty';
UPDATE ContentPages SET Title = N'Trung tâm trợ giúp', Body = N'Tìm theo tên chip như 4060 hoặc i7. Các bộ lọc cộng dồn. Bạn so sánh tối đa ba cấu hình.' WHERE Slug = 'help';
