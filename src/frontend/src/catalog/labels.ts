export const brandName = "Velora";

const statuses: Record<string, string> = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  Processing: "Đang xử lý",
  Shipped: "Đang giao",
  Delivered: "Đã giao",
  Cancelled: "Đã hủy",
};

const stocks: Record<string, string> = {
  "In stock": "Còn hàng",
  "Low stock": "Sắp hết",
  "Out of stock": "Hết hàng",
};

const specs: Record<string, string> = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  storage: "Ổ cứng",
  "display-size": "Màn hình",
  resolution: "Độ phân giải",
  "refresh-rate": "Tần số quét",
  panel: "Tấm nền",
  os: "Hệ điều hành",
  weight: "Khối lượng",
  battery: "Pin",
  ports: "Cổng kết nối",
  warranty: "Bảo hành",
  Display: "Màn hình",
  Resolution: "Độ phân giải",
  "Refresh Rate": "Tần số quét",
  Panel: "Tấm nền",
  "Operating System": "Hệ điều hành",
  Weight: "Khối lượng",
  Battery: "Pin",
  Ports: "Cổng kết nối",
  Warranty: "Bảo hành",
  Storage: "Ổ cứng",
};

export function statusText(status: string) {
  return statuses[status] ?? status;
}

export function stockText(label: string) {
  return stocks[label] ?? label;
}

export function specText(name: string) {
  return specs[name] ?? name;
}
