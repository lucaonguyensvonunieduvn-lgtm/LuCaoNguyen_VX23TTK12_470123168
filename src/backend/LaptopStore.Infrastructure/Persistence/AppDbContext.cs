using LaptopStore.Domain.Catalog;
using LaptopStore.Domain.Commerce;
using LaptopStore.Domain.Content;
using LaptopStore.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<SpecificationGroup> SpecificationGroups => Set<SpecificationGroup>();
    public DbSet<SpecificationAttribute> SpecificationAttributes => Set<SpecificationAttribute>();
    public DbSet<ProductSpecification> ProductSpecifications => Set<ProductSpecification>();
    public DbSet<VariantSpecification> VariantSpecifications => Set<VariantSpecification>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<ContentPage> ContentPages => Set<ContentPage>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Brand>().HasIndex(brand => brand.Slug).IsUnique();
        builder.Entity<Brand>().Property(brand => brand.Name).HasMaxLength(120);
        builder.Entity<Brand>().Property(brand => brand.Slug).HasMaxLength(140);

        builder.Entity<Category>().HasIndex(category => category.Slug).IsUnique();
        builder.Entity<Category>().Property(category => category.Name).HasMaxLength(120);
        builder.Entity<Category>().Property(category => category.Slug).HasMaxLength(140);

        builder.Entity<Product>().HasIndex(product => product.Slug).IsUnique();
        builder.Entity<Product>().Property(product => product.Name).HasMaxLength(180);
        builder.Entity<Product>().Property(product => product.Slug).HasMaxLength(180);
        builder.Entity<Product>().Property(product => product.SearchText).HasMaxLength(4000);
        builder.Entity<Product>().HasOne(product => product.Brand).WithMany(brand => brand.Products).HasForeignKey(product => product.BrandId).OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ProductCategory>().HasKey(link => new { link.ProductId, link.CategoryId });
        builder.Entity<ProductCategory>().HasOne(link => link.Product).WithMany(product => product.Categories).HasForeignKey(link => link.ProductId);
        builder.Entity<ProductCategory>().HasOne(link => link.Category).WithMany(category => category.Products).HasForeignKey(link => link.CategoryId);

        builder.Entity<ProductImage>().Property(image => image.Url).HasMaxLength(400);

        builder.Entity<ProductVariant>().HasIndex(variant => variant.Sku).IsUnique();
        builder.Entity<ProductVariant>().Property(variant => variant.Price).HasPrecision(18, 2);
        builder.Entity<ProductVariant>().Property(variant => variant.CompareAtPrice).HasPrecision(18, 2);
        builder.Entity<ProductVariant>().Property(variant => variant.Sku).HasMaxLength(80);
        builder.Entity<ProductVariant>().HasOne(variant => variant.Product).WithMany(product => product.Variants).HasForeignKey(variant => variant.ProductId);

        builder.Entity<SpecificationAttribute>().HasIndex(attribute => attribute.Slug).IsUnique();
        builder.Entity<SpecificationAttribute>().Property(attribute => attribute.Slug).HasMaxLength(80);
        builder.Entity<SpecificationAttribute>().HasOne(attribute => attribute.Group).WithMany(group => group.Attributes).HasForeignKey(attribute => attribute.GroupId);

        builder.Entity<ProductSpecification>().HasKey(spec => new { spec.ProductId, spec.AttributeId });
        builder.Entity<ProductSpecification>().Property(spec => spec.Value).HasMaxLength(300);
        builder.Entity<ProductSpecification>().HasOne(spec => spec.Product).WithMany(product => product.Specifications).HasForeignKey(spec => spec.ProductId);
        builder.Entity<ProductSpecification>().HasOne(spec => spec.Attribute).WithMany().HasForeignKey(spec => spec.AttributeId).OnDelete(DeleteBehavior.Restrict);

        builder.Entity<VariantSpecification>().HasKey(spec => new { spec.VariantId, spec.AttributeId });
        builder.Entity<VariantSpecification>().Property(spec => spec.Value).HasMaxLength(300);
        builder.Entity<VariantSpecification>().HasOne(spec => spec.Variant).WithMany(variant => variant.Specifications).HasForeignKey(spec => spec.VariantId);
        builder.Entity<VariantSpecification>().HasOne(spec => spec.Attribute).WithMany().HasForeignKey(spec => spec.AttributeId).OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ProductReview>().HasIndex(review => new { review.ProductId, review.UserId }).IsUnique();
        builder.Entity<ProductReview>().Property(review => review.Comment).HasMaxLength(2000);
        builder.Entity<ProductReview>().HasOne(review => review.Product).WithMany(product => product.Reviews).HasForeignKey(review => review.ProductId);

        builder.Entity<CustomerAddress>().HasIndex(address => address.UserId);
        builder.Entity<Cart>().HasIndex(cart => cart.UserId).IsUnique();
        builder.Entity<CartItem>().HasIndex(item => new { item.CartId, item.VariantId }).IsUnique();
        builder.Entity<CartItem>().HasOne(item => item.Cart).WithMany(cart => cart.Items).HasForeignKey(item => item.CartId);
        builder.Entity<CartItem>().HasOne(item => item.Variant).WithMany().HasForeignKey(item => item.VariantId).OnDelete(DeleteBehavior.Restrict);

        builder.Entity<WishlistItem>().HasIndex(item => new { item.UserId, item.ProductId }).IsUnique();
        builder.Entity<WishlistItem>().HasOne(item => item.Product).WithMany().HasForeignKey(item => item.ProductId);

        builder.Entity<Voucher>().HasIndex(voucher => voucher.Code).IsUnique();
        builder.Entity<Voucher>().Property(voucher => voucher.Code).HasMaxLength(40);
        builder.Entity<Voucher>().Property(voucher => voucher.DiscountValue).HasPrecision(18, 2);
        builder.Entity<Voucher>().Property(voucher => voucher.MinOrderAmount).HasPrecision(18, 2);
        builder.Entity<Voucher>().Property(voucher => voucher.MaxDiscount).HasPrecision(18, 2);

        builder.Entity<Order>().HasIndex(order => order.Code).IsUnique();
        builder.Entity<Order>().Property(order => order.Code).HasMaxLength(40);
        builder.Entity<Order>().Property(order => order.Subtotal).HasPrecision(18, 2);
        builder.Entity<Order>().Property(order => order.ShippingFee).HasPrecision(18, 2);
        builder.Entity<Order>().Property(order => order.Discount).HasPrecision(18, 2);
        builder.Entity<Order>().Property(order => order.Total).HasPrecision(18, 2);
        builder.Entity<Order>().HasIndex(order => order.CreatedAt);

        builder.Entity<OrderItem>().Property(item => item.UnitPrice).HasPrecision(18, 2);
        builder.Entity<OrderItem>().Property(item => item.LineTotal).HasPrecision(18, 2);
        builder.Entity<OrderItem>().HasOne(item => item.Order).WithMany(order => order.Items).HasForeignKey(item => item.OrderId);
        builder.Entity<OrderItem>().HasOne(item => item.Variant).WithMany(variant => variant.OrderItems).HasForeignKey(item => item.VariantId).OnDelete(DeleteBehavior.SetNull);

        builder.Entity<ContentPage>().HasIndex(page => page.Slug).IsUnique();
        builder.Entity<ContactMessage>().Property(message => message.Message).HasMaxLength(4000);
    }
}
