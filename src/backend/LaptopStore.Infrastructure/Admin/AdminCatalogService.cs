using LaptopStore.Application;
using LaptopStore.Application.Admin;
using LaptopStore.Application.Catalog;
using LaptopStore.Domain.Catalog;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Admin;

public sealed class AdminCatalogService : IAdminCatalogService
{
    private readonly AppDbContext _db;

    public AdminCatalogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AdminStatsDto> StatsAsync(CancellationToken cancellationToken)
    {
        var products = _db.Products.AsNoTracking();
        return new AdminStatsDto
        {
            Total = await products.CountAsync(cancellationToken),
            Active = await products.CountAsync(product => product.IsActive, cancellationToken),
            Drafts = await products.CountAsync(product => !product.IsActive, cancellationToken),
            OutOfStock = await products.CountAsync(product => product.IsActive && product.Variants.All(variant => variant.StockQuantity == 0), cancellationToken)
        };
    }

    public async Task<PagedResult<AdminProductRow>> ProductsAsync(string? search, string? brand, string? category, string? status, int page, CancellationToken cancellationToken)
    {
        var query = _db.Products.AsNoTracking().Include(product => product.Brand).Include(product => product.Categories).ThenInclude(link => link.Category)
            .Include(product => product.Images).Include(product => product.Variants).ThenInclude(variant => variant.Specifications).ThenInclude(spec => spec.Attribute)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(product => product.SearchText.Contains(term) || product.Name.ToLower().Contains(term) || product.Variants.Any(variant => variant.Sku.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(brand))
        {
            query = query.Where(product => product.Brand.Slug == brand || product.Brand.Name == brand);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(product => product.Categories.Any(link => link.Category.Slug == category || link.Category.Name == category));
        }

        if (status == "active") query = query.Where(product => product.IsActive);
        if (status == "draft") query = query.Where(product => !product.IsActive);
        if (status == "out") query = query.Where(product => product.Variants.All(variant => variant.StockQuantity == 0));

        var total = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, page);
        var products = await query.OrderByDescending(product => product.UpdatedAt).Skip((pageNumber - 1) * 8).Take(8).ToListAsync(cancellationToken);
        return new PagedResult<AdminProductRow>
        {
            Items = products.Select(MapRow).ToList(),
            Page = pageNumber,
            PageSize = 8,
            Total = total
        };
    }

    public async Task<ProductWriteRequest> GetProductAsync(int id, CancellationToken cancellationToken)
    {
        var product = await LoadAsync(id, cancellationToken);
        return new ProductWriteRequest
        {
            Name = product.Name,
            Slug = product.Slug,
            BrandId = product.BrandId,
            CategoryIds = product.Categories.Select(link => link.CategoryId).ToList(),
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            IsFeatured = product.IsFeatured,
            IsNew = product.IsNew,
            IsActive = product.IsActive,
            ImageUrls = product.Images.OrderBy(image => image.SortOrder).Select(image => image.Url).ToList(),
            Specifications = product.Specifications.Select(spec => new SpecWrite { Slug = spec.Attribute.Slug, Value = spec.Value }).ToList(),
            Variants = product.Variants.Select(variant => new VariantWrite
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
                Specifications = variant.Specifications.Select(spec => new SpecWrite { Slug = spec.Attribute.Slug, Value = spec.Value }).ToList()
            }).ToList()
        };
    }

    public async Task<int> SaveProductAsync(int? id, ProductWriteRequest request, CancellationToken cancellationToken)
    {
        if (request.Variants.Count == 0)
        {
            throw new ApiException(400, "Add at least one configuration.");
        }

        var brand = await _db.Brands.FirstOrDefaultAsync(item => item.Id == request.BrandId, cancellationToken)
            ?? throw new ApiException(400, "Choose a brand.");
        var product = id is null ? new Product { CreatedAt = DateTime.UtcNow } : await LoadAsync(id.Value, cancellationToken);
        if (id is null)
        {
            _db.Products.Add(product);
        }

        product.Name = request.Name.Trim();
        product.Slug = await UniqueSlugAsync(string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug), product.Id, cancellationToken);
        product.BrandId = brand.Id;
        product.ShortDescription = request.ShortDescription.Trim();
        product.Description = request.Description.Trim();
        product.IsFeatured = request.IsFeatured;
        product.IsNew = request.IsNew;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        product.Categories.Clear();
        foreach (var categoryId in request.CategoryIds.Distinct())
        {
            product.Categories.Add(new ProductCategory { CategoryId = categoryId });
        }

        product.Images.Clear();
        var order = 0;
        foreach (var url in request.ImageUrls.Where(url => !string.IsNullOrWhiteSpace(url)))
        {
            product.Images.Add(new ProductImage { Url = url.Trim(), Alt = product.Name, SortOrder = order, IsPrimary = order == 0 });
            order++;
        }

        await ReplaceSpecsAsync(product, request, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        product.SearchText = await BuildSearchTextAsync(product.Id, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return product.Id;
    }

    public async Task DeleteProductAsync(int id, CancellationToken cancellationToken)
    {
        var product = await _db.Products.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiException(404, "Laptop not found.");
        var used = await _db.OrderItems.AnyAsync(item => item.ProductId == id, cancellationToken);
        if (used)
        {
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.Products.Remove(product);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BrandDto>> BrandsAsync(CancellationToken cancellationToken)
    {
        return await _db.Brands.AsNoTracking().OrderBy(brand => brand.SortOrder).Select(brand => new BrandDto
        {
            Id = brand.Id,
            Name = brand.Name,
            Slug = brand.Slug,
            Description = brand.Description,
            ProductCount = brand.Products.Count(),
            IsActive = brand.IsActive
        }).ToListAsync(cancellationToken);
    }

    public async Task SaveBrandAsync(int? id, NameWriteRequest request, CancellationToken cancellationToken)
    {
        var brand = id is null ? new Brand() : await _db.Brands.FirstOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw new ApiException(404, "Brand not found.");
        if (id is null) _db.Brands.Add(brand);
        brand.Name = request.Name.Trim();
        brand.Slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        brand.Description = request.Description?.Trim();
        brand.IsActive = request.IsActive;
        brand.SortOrder = request.SortOrder;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteBrandAsync(int id, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands.Include(item => item.Products).FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiException(404, "Brand not found.");
        if (brand.Products.Count > 0)
        {
            brand.IsActive = false;
        }
        else
        {
            _db.Brands.Remove(brand);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryDto>> CategoriesAsync(CancellationToken cancellationToken)
    {
        return await _db.Categories.AsNoTracking().OrderBy(category => category.SortOrder).Select(category => new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            Description = category.Description,
            ProductCount = category.Products.Count(),
            IsActive = category.IsActive
        }).ToListAsync(cancellationToken);
    }

    public async Task SaveCategoryAsync(int? id, NameWriteRequest request, CancellationToken cancellationToken)
    {
        var category = id is null ? new Category() : await _db.Categories.FirstOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw new ApiException(404, "Category not found.");
        if (id is null) _db.Categories.Add(category);
        category.Name = request.Name.Trim();
        category.Slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        category.Description = request.Description?.Trim() ?? "";
        category.IsActive = request.IsActive;
        category.SortOrder = request.SortOrder;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteCategoryAsync(int id, CancellationToken cancellationToken)
    {
        var category = await _db.Categories.Include(item => item.Products).FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiException(404, "Category not found.");
        if (category.Products.Count > 0)
        {
            category.IsActive = false;
        }
        else
        {
            _db.Categories.Remove(category);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SpecWrite>> AttributesAsync(CancellationToken cancellationToken)
    {
        return await _db.SpecificationAttributes.AsNoTracking().OrderBy(attribute => attribute.SortOrder)
            .Select(attribute => new SpecWrite { Slug = attribute.Slug, Value = attribute.Name })
            .ToListAsync(cancellationToken);
    }

    private async Task<Product> LoadAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Products
            .Include(product => product.Categories)
            .Include(product => product.Images)
            .Include(product => product.Specifications).ThenInclude(spec => spec.Attribute)
            .Include(product => product.Variants).ThenInclude(variant => variant.Specifications)
            .FirstOrDefaultAsync(product => product.Id == id, cancellationToken)
            ?? throw new ApiException(404, "Laptop not found.");
    }

    private async Task ReplaceSpecsAsync(Product product, ProductWriteRequest request, CancellationToken cancellationToken)
    {
        var attributes = await _db.SpecificationAttributes.ToListAsync(cancellationToken);
        product.Specifications.Clear();
        foreach (var spec in request.Specifications.Where(item => !string.IsNullOrWhiteSpace(item.Value)))
        {
            var attribute = attributes.FirstOrDefault(item => item.Slug == spec.Slug) ?? throw new ApiException(400, $"Unknown specification {spec.Slug}.");
            product.Specifications.Add(new ProductSpecification { AttributeId = attribute.Id, Value = spec.Value.Trim() });
        }

        var kept = new List<int>();
        foreach (var write in request.Variants)
        {
            var variant = write.Id is null ? null : product.Variants.FirstOrDefault(item => item.Id == write.Id);
            if (variant is null)
            {
                variant = new ProductVariant();
                product.Variants.Add(variant);
            }

            variant.Sku = write.Sku.Trim();
            variant.ConfigurationName = write.ConfigurationName.Trim();
            variant.ColorName = write.ColorName.Trim();
            variant.ColorHex = string.IsNullOrWhiteSpace(write.ColorHex) ? "#111111" : write.ColorHex;
            variant.Price = write.Price;
            variant.CompareAtPrice = write.CompareAtPrice;
            variant.StockQuantity = write.StockQuantity;
            variant.IsActive = write.IsActive;
            variant.Specifications.Clear();
            foreach (var spec in write.Specifications.Where(item => !string.IsNullOrWhiteSpace(item.Value)))
            {
                var attribute = attributes.FirstOrDefault(item => item.Slug == spec.Slug) ?? throw new ApiException(400, $"Unknown specification {spec.Slug}.");
                variant.Specifications.Add(new VariantSpecification { AttributeId = attribute.Id, Value = spec.Value.Trim() });
            }

            if (variant.Id != 0) kept.Add(variant.Id);
        }

        var removed = product.Variants.Where(variant => variant.Id != 0 && request.Variants.All(write => write.Id != variant.Id)).ToList();
        foreach (var variant in removed)
        {
            var used = await _db.OrderItems.AnyAsync(item => item.VariantId == variant.Id, cancellationToken);
            if (used) variant.IsActive = false;
            else _db.ProductVariants.Remove(variant);
        }

        _ = kept;
    }

    private async Task<string> BuildSearchTextAsync(int productId, CancellationToken cancellationToken)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(item => item.Brand)
            .Include(item => item.Categories).ThenInclude(link => link.Category)
            .Include(item => item.Specifications)
            .Include(item => item.Variants).ThenInclude(variant => variant.Specifications)
            .FirstAsync(item => item.Id == productId, cancellationToken);
        var parts = new List<string> { product.Name, product.Brand.Name, product.Slug };
        parts.AddRange(product.Categories.Select(link => link.Category.Name));
        parts.AddRange(product.Specifications.Select(spec => spec.Value));
        parts.AddRange(product.Variants.SelectMany(variant => new[] { variant.Sku, variant.ConfigurationName }.Concat(variant.Specifications.Select(spec => spec.Value))));
        var text = string.Join(' ', parts).ToLowerInvariant();
        return text.Length <= 4000 ? text : text[..4000];
    }

    private async Task<string> UniqueSlugAsync(string slug, int currentId, CancellationToken cancellationToken)
    {
        var candidate = slug;
        var suffix = 2;
        while (await _db.Products.AnyAsync(product => product.Slug == candidate && product.Id != currentId, cancellationToken))
        {
            candidate = $"{slug}-{suffix++}";
        }

        return candidate;
    }

    private static AdminProductRow MapRow(Product product)
    {
        var variant = product.Variants.OrderBy(item => item.Price).FirstOrDefault();
        var stock = product.Variants.Sum(item => item.StockQuantity);
        var spec = variant is null ? "" : string.Join(" | ", variant.Specifications.OrderBy(item => item.Attribute.SortOrder).Take(3).Select(item => item.Value));
        return new AdminProductRow
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            BrandName = product.Brand.Name,
            CategoryName = product.Categories.Select(link => link.Category.Name).FirstOrDefault() ?? "",
            Sku = variant?.Sku ?? "",
            SpecLine = spec,
            ImageUrl = product.Images.OrderByDescending(image => image.IsPrimary).Select(image => image.Url).FirstOrDefault() ?? "",
            Price = variant?.Price ?? 0,
            CompareAtPrice = variant?.CompareAtPrice,
            Stock = stock,
            StockLabel = stock == 0 ? "Out of stock" : stock <= StoreRules.LowStockThreshold ? "Low stock" : "In stock",
            IsActive = product.IsActive
        };
    }

    public static string Slugify(string value)
    {
        var chars = value.Trim().ToLowerInvariant().Select(character => char.IsLetterOrDigit(character) ? character : '-').ToArray();
        var slug = new string(chars);
        while (slug.Contains("--", StringComparison.Ordinal)) slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return slug.Trim('-');
    }
}
