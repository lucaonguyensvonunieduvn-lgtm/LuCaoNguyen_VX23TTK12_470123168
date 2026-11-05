using LaptopStore.Domain.Commerce;

namespace LaptopStore.Domain.Catalog;

public class Brand
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public ICollection<ProductCategory> Products { get; set; } = new List<ProductCategory>();
}

public class Product
{
    public int Id { get; set; }
    public int BrandId { get; set; }
    public Brand Brand { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public bool IsNew { get; set; }
    public bool IsHero { get; set; }
    public bool IsActive { get; set; } = true;
    public string SearchText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<ProductCategory> Categories { get; set; } = new List<ProductCategory>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductSpecification> Specifications { get; set; } = new List<ProductSpecification>();
    public ICollection<ProductReview> Reviews { get; set; } = new List<ProductReview>();
}

public class ProductCategory
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
}

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Url { get; set; } = string.Empty;
    public string Alt { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
}

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Sku { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#111111";
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<VariantSpecification> Specifications { get; set; } = new List<VariantSpecification>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

public class SpecificationGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ICollection<SpecificationAttribute> Attributes { get; set; } = new List<SpecificationAttribute>();
}

public class SpecificationAttribute
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public SpecificationGroup Group { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Scope { get; set; } = SpecScopes.Product;
    public bool IsFilterable { get; set; }
    public int SortOrder { get; set; }
}

public static class SpecScopes
{
    public const string Product = "Product";
    public const string Variant = "Variant";
}

public class ProductSpecification
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int AttributeId { get; set; }
    public SpecificationAttribute Attribute { get; set; } = null!;
    public string Value { get; set; } = string.Empty;
}

public class VariantSpecification
{
    public int VariantId { get; set; }
    public ProductVariant Variant { get; set; } = null!;
    public int AttributeId { get; set; }
    public SpecificationAttribute Attribute { get; set; } = null!;
    public string Value { get; set; } = string.Empty;
}

public class ProductReview
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public bool IsVisible { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
