using LaptopStore.Application;
using LaptopStore.Application.Catalog;
using LaptopStore.Domain.Catalog;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Catalog;

public sealed class CatalogService : ICatalogService
{
    private readonly AppDbContext _db;

    public CatalogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<HomeDto> GetHomeAsync(CancellationToken cancellationToken)
    {
        var categories = await GetCategoriesAsync(cancellationToken);
        var brands = await GetBrandsAsync(cancellationToken);
        var featured = await GetProductsAsync(new ProductQuery { Featured = true, PageSize = 8, Sort = "popular" }, cancellationToken);
        var heroId = await _db.Products.AsNoTracking()
            .Where(product => product.IsHero && product.IsActive)
            .Select(product => product.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var heroCards = await LoadCardsAsync(heroId == 0 ? [] : [heroId], cancellationToken);

        return new HomeDto
        {
            Hero = heroCards.GetValueOrDefault(heroId) ?? featured.Items.FirstOrDefault(),
            Categories = categories.ToList(),
            Featured = featured.Items.ToList(),
            Brands = brands.ToList()
        };
    }

    public async Task<CatalogFiltersDto> GetFiltersAsync(CancellationToken cancellationToken)
    {
        var brands = await _db.Brands.AsNoTracking()
            .Where(brand => brand.IsActive)
            .OrderBy(brand => brand.SortOrder)
            .Select(brand => new FilterOptionDto
            {
                Value = brand.Name,
                Count = brand.Products.Count(product => product.IsActive)
            })
            .ToListAsync(cancellationToken);

        var categories = await _db.Categories.AsNoTracking()
            .Where(category => category.IsActive)
            .OrderBy(category => category.SortOrder)
            .Select(category => new FilterOptionDto
            {
                Value = category.Name,
                Count = category.Products.Count(link => link.Product.IsActive)
            })
            .ToListAsync(cancellationToken);

        var prices = await _db.ProductVariants.AsNoTracking()
            .Where(variant => variant.IsActive && variant.Product.IsActive)
            .Select(variant => variant.Price)
            .ToListAsync(cancellationToken);

        return new CatalogFiltersDto
        {
            Brands = brands,
            Categories = categories,
            Cpus = await SpecOptionsAsync("cpu", true, cancellationToken),
            Gpus = await SpecOptionsAsync("gpu", true, cancellationToken),
            Rams = await SpecOptionsAsync("ram", true, cancellationToken),
            Storages = await SpecOptionsAsync("storage", true, cancellationToken),
            DisplaySizes = await SpecOptionsAsync("display-size", false, cancellationToken),
            RefreshRates = await SpecOptionsAsync("refresh-rate", false, cancellationToken),
            MinPrice = prices.Count == 0 ? 0 : prices.Min(),
            MaxPrice = prices.Count == 0 ? 0 : prices.Max()
        };
    }

    public async Task<PagedResult<ProductCardDto>> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 48);
        var products = _db.Products.AsNoTracking().Where(product => product.IsActive && product.Brand.IsActive);
        products = ApplyFilters(products, query);

        var total = await products.CountAsync(cancellationToken);
        var ordered = ApplySort(products, query.Sort);
        var ids = await ordered.Select(product => product.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        var cards = await LoadCardsAsync(ids, cancellationToken);

        return new PagedResult<ProductCardDto>
        {
            Items = ids.Select(id => cards[id]).ToList(),
            Page = page,
            PageSize = pageSize,
            Total = total
        };
    }

    public async Task<ProductDetailDto?> GetProductAsync(string slug, string? userId, CancellationToken cancellationToken)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(item => item.Brand)
            .Include(item => item.Images)
            .Include(item => item.Categories).ThenInclude(link => link.Category)
            .Include(item => item.Specifications).ThenInclude(spec => spec.Attribute).ThenInclude(attribute => attribute.Group)
            .Include(item => item.Variants).ThenInclude(variant => variant.Specifications).ThenInclude(spec => spec.Attribute)
            .Include(item => item.Reviews)
            .FirstOrDefaultAsync(item => item.Slug == slug && item.IsActive, cancellationToken);

        if (product is null)
        {
            return null;
        }

        var categoryIds = product.Categories.Select(link => link.CategoryId).ToArray();
        var relatedIds = await _db.Products.AsNoTracking()
            .Where(item => item.IsActive && item.Id != product.Id && item.Categories.Any(link => categoryIds.Contains(link.CategoryId)))
            .OrderByDescending(item => item.IsFeatured)
            .Select(item => item.Id)
            .Take(4)
            .ToListAsync(cancellationToken);
        var related = await LoadCardsAsync(relatedIds, cancellationToken);
        var visibleReviews = product.Reviews.Where(review => review.IsVisible).OrderByDescending(review => review.CreatedAt).ToList();
        var canReview = false;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var already = visibleReviews.Any(review => review.UserId == userId) ||
                product.Reviews.Any(review => review.UserId == userId);
            if (!already)
            {
                canReview = await _db.OrderItems.AnyAsync(
                    item => item.ProductId == product.Id && item.Order.UserId == userId && item.Order.Status == OrderStatuses.Delivered,
                    cancellationToken);
            }
        }

        return new ProductDetailDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            BrandName = product.Brand.Name,
            BrandSlug = product.Brand.Slug,
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            IsFeatured = product.IsFeatured,
            IsNew = product.IsNew,
            Categories = product.Categories.Select(link => link.Category.Name).ToList(),
            Images = product.Images.OrderBy(image => image.SortOrder).Select(image => image.Url).ToList(),
            Specifications = product.Specifications
                .OrderBy(spec => spec.Attribute.Group.SortOrder)
                .ThenBy(spec => spec.Attribute.SortOrder)
                .Select(spec => new SpecValueDto
                {
                    Group = spec.Attribute.Group.Name,
                    Name = spec.Attribute.Name,
                    Slug = spec.Attribute.Slug,
                    Value = spec.Value
                })
                .ToList(),
            Variants = product.Variants.Where(variant => variant.IsActive).Select(MapVariant).ToList(),
            Rating = visibleReviews.Count == 0 ? 0 : visibleReviews.Average(review => review.Rating),
            ReviewCount = visibleReviews.Count,
            Reviews = visibleReviews.Take(8).Select(review => new ReviewDto
            {
                Id = review.Id,
                AuthorName = review.AuthorName,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            }).ToList(),
            Related = relatedIds.Where(related.ContainsKey).Select(id => related[id]).ToList(),
            CanReview = canReview
        };
    }

    public async Task<IReadOnlyList<BrandDto>> GetBrandsAsync(CancellationToken cancellationToken)
    {
        var brands = await _db.Brands.AsNoTracking()
            .Where(brand => brand.IsActive)
            .OrderBy(brand => brand.SortOrder)
            .Select(brand => new BrandDto
            {
                Id = brand.Id,
                Name = brand.Name,
                Slug = brand.Slug,
                Description = brand.Description,
                ProductCount = brand.Products.Count(product => product.IsActive)
            })
            .ToListAsync(cancellationToken);

        var covers = await _db.Products.AsNoTracking()
            .Where(product => product.IsActive)
            .Select(product => new
            {
                product.BrandId,
                ImageUrl = product.Images.OrderByDescending(image => image.IsPrimary).ThenBy(image => image.SortOrder).Select(image => image.Url).FirstOrDefault(),
                Price = product.Variants.Where(variant => variant.IsActive).Min(variant => (decimal?)variant.Price)
            })
            .ToListAsync(cancellationToken);

        foreach (var brand in brands)
        {
            var rows = covers.Where(item => item.BrandId == brand.Id).ToList();
            var prices = rows.Select(item => item.Price).Where(price => price != null).Select(price => price!.Value).ToList();
            brand.FromPrice = prices.Count == 0 ? 0 : prices.Min();
            brand.ImageUrl = rows.Select(item => item.ImageUrl).FirstOrDefault(url => !string.IsNullOrWhiteSpace(url)) ?? "";
        }

        return brands;
    }

    public async Task<IReadOnlyList<OfferDto>> GetOffersAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return await _db.Vouchers.AsNoTracking()
            .Where(voucher => voucher.IsActive
                && (voucher.StartsAt == null || voucher.StartsAt <= now)
                && (voucher.EndsAt == null || voucher.EndsAt > now)
                && (voucher.UsageLimit == null || voucher.UsedCount < voucher.UsageLimit))
            .OrderBy(voucher => voucher.Code)
            .Select(voucher => new OfferDto
            {
                Code = voucher.Code,
                DiscountType = voucher.DiscountType,
                DiscountValue = voucher.DiscountValue,
                MinOrderAmount = voucher.MinOrderAmount,
                MaxDiscount = voucher.MaxDiscount,
                EndsAt = voucher.EndsAt
            })
            .ToListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<ProductCardDto>> GetByIdsAsync(IReadOnlyList<int> ids, CancellationToken cancellationToken)
    {
        return LoadListedAsync(ids, cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        return await _db.Categories.AsNoTracking()
            .Where(category => category.IsActive)
            .OrderBy(category => category.SortOrder)
            .Select(category => new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Slug = category.Slug,
                Description = category.Description,
                ProductCount = category.Products.Count(link => link.Product.IsActive)
            })
            .ToListAsync(cancellationToken);
    }

    private IQueryable<Product> ApplyFilters(IQueryable<Product> products, ProductQuery query)
    {
        var search = query.Search?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(search))
        {
            products = products.Where(product => product.SearchText.Contains(search));
        }

        var brands = Split(query.Brand);
        if (brands.Length > 0)
        {
            products = products.Where(product => brands.Contains(product.Brand.Name) || brands.Contains(product.Brand.Slug));
        }

        var categories = Split(query.Category);
        if (categories.Length > 0)
        {
            products = products.Where(product => product.Categories.Any(link =>
                categories.Contains(link.Category.Name) || categories.Contains(link.Category.Slug)));
        }

        if (query.Featured == true)
        {
            products = products.Where(product => product.IsFeatured);
        }

        if (query.Deals == true)
        {
            products = products.Where(product => product.Variants.Any(variant =>
                variant.IsActive && variant.CompareAtPrice != null && variant.CompareAtPrice > variant.Price));
        }

        var cpus = Split(query.Cpu);
        var gpus = Split(query.Gpu);
        var rams = Split(query.Ram);
        var storages = Split(query.Storage);
        products = products.Where(product => product.Variants.Any(variant =>
            variant.IsActive &&
            (query.MinPrice == null || variant.Price >= query.MinPrice) &&
            (query.MaxPrice == null || variant.Price <= query.MaxPrice) &&
            (query.InStock != true || variant.StockQuantity > 0) &&
            (cpus.Length == 0 || variant.Specifications.Any(spec => spec.Attribute.Slug == "cpu" && cpus.Contains(spec.Value))) &&
            (gpus.Length == 0 || variant.Specifications.Any(spec => spec.Attribute.Slug == "gpu" && gpus.Contains(spec.Value))) &&
            (rams.Length == 0 || variant.Specifications.Any(spec => spec.Attribute.Slug == "ram" && rams.Contains(spec.Value))) &&
            (storages.Length == 0 || variant.Specifications.Any(spec => spec.Attribute.Slug == "storage" && storages.Contains(spec.Value)))));

        products = WhereProductSpec(products, "display-size", Split(query.DisplaySize));
        products = WhereProductSpec(products, "refresh-rate", Split(query.RefreshRate));
        products = WhereProductSpec(products, "os", Split(query.Os));
        return products;
    }

    private static IQueryable<Product> WhereProductSpec(IQueryable<Product> products, string slug, string[] values)
    {
        if (values.Length == 0)
        {
            return products;
        }

        return products.Where(product => product.Specifications.Any(spec => spec.Attribute.Slug == slug && values.Contains(spec.Value)));
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> products, string? sort)
    {
        return sort switch
        {
            "price-asc" => products.OrderBy(product => product.Variants.Where(variant => variant.IsActive).Min(variant => variant.Price)),
            "price-desc" => products.OrderByDescending(product => product.Variants.Where(variant => variant.IsActive).Min(variant => variant.Price)),
            "name" => products.OrderBy(product => product.Name),
            "rating" => products.OrderByDescending(product => product.Reviews.Where(review => review.IsVisible).Average(review => (double?)review.Rating) ?? 0),
            "best-selling" => products.OrderByDescending(product => product.Variants.SelectMany(variant => variant.OrderItems).Sum(item => (int?)item.Quantity) ?? 0),
            "popular" => products.OrderByDescending(product => product.IsFeatured).ThenByDescending(product => product.Reviews.Count(review => review.IsVisible)),
            _ => products.OrderByDescending(product => product.CreatedAt)
        };
    }

    private async Task<IReadOnlyList<ProductCardDto>> LoadListedAsync(IReadOnlyList<int> ids, CancellationToken cancellationToken)
    {
        var cards = await LoadCardsAsync(ids, cancellationToken);
        return ids.Where(cards.ContainsKey).Select(id => cards[id]).ToList();
    }

    private async Task<Dictionary<int, ProductCardDto>> LoadCardsAsync(IReadOnlyList<int> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var products = await _db.Products.AsNoTracking()
            .Where(product => ids.Contains(product.Id))
            .Include(product => product.Brand)
            .Include(product => product.Images)
            .Include(product => product.Variants).ThenInclude(variant => variant.Specifications).ThenInclude(spec => spec.Attribute)
            .Include(product => product.Variants).ThenInclude(variant => variant.OrderItems)
            .Include(product => product.Reviews)
            .ToListAsync(cancellationToken);

        return products.ToDictionary(product => product.Id, MapCard);
    }

    private static ProductCardDto MapCard(Product product)
    {
        var variant = product.Variants
            .Where(item => item.IsActive)
            .OrderBy(item => item.StockQuantity > 0 ? 0 : 1)
            .ThenBy(item => item.Price)
            .First();
        var reviews = product.Reviews.Where(review => review.IsVisible).ToList();
        var cpu = variant.Specifications.FirstOrDefault(spec => spec.Attribute.Slug == "cpu")?.Value;
        var ram = variant.Specifications.FirstOrDefault(spec => spec.Attribute.Slug == "ram")?.Value;
        var storage = variant.Specifications.FirstOrDefault(spec => spec.Attribute.Slug == "storage")?.Value;
        return new ProductCardDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            BrandName = product.Brand.Name,
            BrandSlug = product.Brand.Slug,
            ImageUrl = product.Images.OrderByDescending(image => image.IsPrimary).ThenBy(image => image.SortOrder).Select(image => image.Url).FirstOrDefault() ?? "",
            SpecLine = string.Join(" | ", new[] { cpu, ram, storage }.Where(value => !string.IsNullOrWhiteSpace(value))),
            Price = variant.Price,
            CompareAtPrice = variant.CompareAtPrice,
            VariantId = variant.Id,
            InStock = variant.StockQuantity > 0,
            IsNew = product.IsNew,
            IsFeatured = product.IsFeatured,
            Rating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(review => review.Rating), 1),
            ReviewCount = reviews.Count,
            SoldCount = product.Variants.SelectMany(item => item.OrderItems).Sum(item => item.Quantity)
        };
    }

    private static VariantDto MapVariant(ProductVariant variant)
    {
        return new VariantDto
        {
            Id = variant.Id,
            Sku = variant.Sku,
            ConfigurationName = variant.ConfigurationName,
            ColorName = variant.ColorName,
            ColorHex = variant.ColorHex,
            Price = variant.Price,
            CompareAtPrice = variant.CompareAtPrice,
            StockQuantity = variant.StockQuantity,
            IsActive = variant.IsActive,
            Specifications = variant.Specifications
                .OrderBy(spec => spec.Attribute.SortOrder)
                .Select(spec => new SpecValueDto
                {
                    Name = spec.Attribute.Name,
                    Slug = spec.Attribute.Slug,
                    Value = spec.Value
                })
                .ToList()
        };
    }

    private async Task<List<FilterOptionDto>> SpecOptionsAsync(string slug, bool variantScope, CancellationToken cancellationToken)
    {
        if (variantScope)
        {
            return await _db.VariantSpecifications.AsNoTracking()
                .Where(spec => spec.Attribute.Slug == slug && spec.Variant.IsActive && spec.Variant.Product.IsActive)
                .GroupBy(spec => spec.Value)
                .Select(group => new FilterOptionDto { Value = group.Key, Count = group.Select(spec => spec.Variant.ProductId).Distinct().Count() })
                .OrderBy(option => option.Value)
                .ToListAsync(cancellationToken);
        }

        return await _db.ProductSpecifications.AsNoTracking()
            .Where(spec => spec.Attribute.Slug == slug && spec.Product.IsActive)
            .GroupBy(spec => spec.Value)
            .Select(group => new FilterOptionDto { Value = group.Key, Count = group.Count() })
            .OrderBy(option => option.Value)
            .ToListAsync(cancellationToken);
    }

    private static string[] Split(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
