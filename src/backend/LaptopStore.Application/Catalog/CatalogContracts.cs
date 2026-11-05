using LaptopStore.Application;

namespace LaptopStore.Application.Catalog;

public sealed class ProductQuery
{
    public string? Search { get; set; }
    public string? Brand { get; set; }
    public string? Category { get; set; }
    public string? Cpu { get; set; }
    public string? Gpu { get; set; }
    public string? Ram { get; set; }
    public string? Storage { get; set; }
    public string? DisplaySize { get; set; }
    public string? RefreshRate { get; set; }
    public string? Os { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? InStock { get; set; }
    public bool? Deals { get; set; }
    public bool? Featured { get; set; }
    public string Sort { get; set; } = "newest";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public sealed class ProductCardDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string BrandSlug { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string SpecLine { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int VariantId { get; set; }
    public bool InStock { get; set; }
    public bool IsNew { get; set; }
    public bool IsFeatured { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public int SoldCount { get; set; }
}

public sealed class SpecValueDto
{
    public string Group { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public sealed class VariantDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; }
    public List<SpecValueDto> Specifications { get; set; } = [];
}

public sealed class ReviewDto
{
    public int Id { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public sealed class ProductDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string BrandSlug { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public bool IsNew { get; set; }
    public List<string> Categories { get; set; } = [];
    public List<string> Images { get; set; } = [];
    public List<SpecValueDto> Specifications { get; set; } = [];
    public List<VariantDto> Variants { get; set; } = [];
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public List<ReviewDto> Reviews { get; set; } = [];
    public List<ProductCardDto> Related { get; set; } = [];
    public bool CanReview { get; set; }
}

public sealed class FilterOptionDto
{
    public string Value { get; set; } = string.Empty;
    public int Count { get; set; }
}

public sealed class CatalogFiltersDto
{
    public List<FilterOptionDto> Brands { get; set; } = [];
    public List<FilterOptionDto> Categories { get; set; } = [];
    public List<FilterOptionDto> Cpus { get; set; } = [];
    public List<FilterOptionDto> Gpus { get; set; } = [];
    public List<FilterOptionDto> Rams { get; set; } = [];
    public List<FilterOptionDto> Storages { get; set; } = [];
    public List<FilterOptionDto> DisplaySizes { get; set; } = [];
    public List<FilterOptionDto> RefreshRates { get; set; } = [];
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
}

public sealed class OfferDto
{
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscount { get; set; }
    public DateTime? EndsAt { get; set; }
}

public sealed class BrandDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public decimal FromPrice { get; set; }
    public int ProductCount { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ProductCount { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class HomeDto
{
    public ProductCardDto? Hero { get; set; }
    public List<CategoryDto> Categories { get; set; } = [];
    public List<ProductCardDto> Featured { get; set; } = [];
    public List<BrandDto> Brands { get; set; } = [];
}

public interface ICatalogService
{
    Task<HomeDto> GetHomeAsync(CancellationToken cancellationToken);
    Task<CatalogFiltersDto> GetFiltersAsync(CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken);
    Task<ProductDetailDto?> GetProductAsync(string slug, string? userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<BrandDto>> GetBrandsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<OfferDto>> GetOffersAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductCardDto>> GetByIdsAsync(IReadOnlyList<int> ids, CancellationToken cancellationToken);
}
