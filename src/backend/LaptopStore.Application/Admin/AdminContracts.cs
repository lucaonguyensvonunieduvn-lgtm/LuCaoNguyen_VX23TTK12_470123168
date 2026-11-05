using LaptopStore.Application;
using LaptopStore.Application.Catalog;
using LaptopStore.Application.Commerce;

namespace LaptopStore.Application.Admin;

public sealed class NameWriteRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public sealed class SpecWrite
{
    public string Slug { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public sealed class VariantWrite
{
    public int? Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#111111";
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; } = true;
    public List<SpecWrite> Specifications { get; set; } = [];
}

public sealed class ProductWriteRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public int BrandId { get; set; }
    public List<int> CategoryIds { get; set; } = [];
    public string ShortDescription { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public bool IsNew { get; set; }
    public bool IsActive { get; set; } = true;
    public List<string> ImageUrls { get; set; } = [];
    public List<SpecWrite> Specifications { get; set; } = [];
    public List<VariantWrite> Variants { get; set; } = [];
}

public sealed class AdminProductRow
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string SpecLine { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int Stock { get; set; }
    public string StockLabel { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public sealed class AdminStatsDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int OutOfStock { get; set; }
    public int Drafts { get; set; }
}

public sealed class VoucherWriteRequest
{
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "Fixed";
    public decimal DiscountValue { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscount { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int? UsageLimit { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class VoucherDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscount { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; }
}

public sealed class CustomerRow
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class StatusChangeRequest
{
    public string Status { get; set; } = string.Empty;
}

public sealed class DashboardDto
{
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
    public int Customers { get; set; }
    public int LowStock { get; set; }
    public List<TrendPoint> Trend { get; set; } = [];
    public List<SharePoint> RevenueByBrand { get; set; } = [];
    public List<OrderDto> RecentOrders { get; set; } = [];
    public List<LowStockRow> LowStockProducts { get; set; } = [];
    public List<TopProductRow> TopProducts { get; set; } = [];
}

public sealed class TrendPoint
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
}

public sealed class SharePoint
{
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public sealed class LowStockRow
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int Stock { get; set; }
}

public sealed class TopProductRow
{
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Sold { get; set; }
    public decimal Revenue { get; set; }
}

public sealed class ReportQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Brand { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; }
}

public interface IAdminCatalogService
{
    Task<AdminStatsDto> StatsAsync(CancellationToken cancellationToken);
    Task<PagedResult<AdminProductRow>> ProductsAsync(string? search, string? brand, string? category, string? status, int page, CancellationToken cancellationToken);
    Task<ProductWriteRequest> GetProductAsync(int id, CancellationToken cancellationToken);
    Task<int> SaveProductAsync(int? id, ProductWriteRequest request, CancellationToken cancellationToken);
    Task DeleteProductAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<BrandDto>> BrandsAsync(CancellationToken cancellationToken);
    Task SaveBrandAsync(int? id, NameWriteRequest request, CancellationToken cancellationToken);
    Task DeleteBrandAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> CategoriesAsync(CancellationToken cancellationToken);
    Task SaveCategoryAsync(int? id, NameWriteRequest request, CancellationToken cancellationToken);
    Task DeleteCategoryAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<SpecWrite>> AttributesAsync(CancellationToken cancellationToken);
}

public sealed class OrderBoardDto
{
    public int Total { get; set; }
    public int Pending { get; set; }
    public int Confirmed { get; set; }
    public int Processing { get; set; }
    public int Shipped { get; set; }
    public int Delivered { get; set; }
    public int Cancelled { get; set; }
    public decimal Revenue { get; set; }
}

public interface IAdminOrderService
{
    Task<OrderBoardDto> BoardAsync(CancellationToken cancellationToken);
    Task<PagedResult<OrderDto>> ListAsync(string? search, string? status, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken cancellationToken);
    Task<OrderDto?> GetAsync(string code, CancellationToken cancellationToken);
    Task<OrderDto> UpdateStatusAsync(string code, string status, CancellationToken cancellationToken);
}

public interface IAdminCustomerService
{
    Task<IReadOnlyList<CustomerRow>> ListAsync(string? search, CancellationToken cancellationToken);
    Task SetLockAsync(string id, bool locked, CancellationToken cancellationToken);
}

public interface IAdminVoucherService
{
    Task<IReadOnlyList<VoucherDto>> ListAsync(CancellationToken cancellationToken);
    Task SaveAsync(int? id, VoucherWriteRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken);
    Task<DashboardDto> ReportAsync(ReportQuery query, CancellationToken cancellationToken);
}

public interface IContentService
{
    Task<ContentPageDto?> GetAsync(string slug, CancellationToken cancellationToken);
    Task<IReadOnlyList<ContentPageDto>> ListAsync(CancellationToken cancellationToken);
    Task SaveMessageAsync(ContactWrite request, CancellationToken cancellationToken);
}

public sealed class ContentPageDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public sealed class ContactWrite
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
