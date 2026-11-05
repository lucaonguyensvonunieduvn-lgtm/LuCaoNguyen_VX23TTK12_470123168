using LaptopStore.Domain.Catalog;
using LaptopStore.Domain.Commerce;
using LaptopStore.Domain.Content;
using LaptopStore.Infrastructure.Identity;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LaptopStore.Infrastructure.Catalog;

public static class CatalogSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await db.Products.AnyAsync())
        {
            return;
        }

        var attributes = await SeedAttributesAsync(db);
        var brands = SeedBrands();
        var categories = SeedCategories();
        db.Brands.AddRange(brands);
        db.Categories.AddRange(categories);
        await db.SaveChangesAsync();

        foreach (var seed in Products())
        {
            var brand = brands.First(item => item.Slug == seed.Brand);
            var product = new Product
            {
                Brand = brand,
                Name = seed.Name,
                Slug = seed.Slug,
                ShortDescription = seed.Short,
                Description = seed.Description,
                IsFeatured = seed.Featured,
                IsNew = seed.IsNew,
                IsHero = seed.Hero,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-seed.Age),
                UpdatedAt = DateTime.UtcNow,
                Images = [new ProductImage { Url = $"/catalog/{seed.Slug}.jpg", Alt = seed.Name, IsPrimary = true }]
            };
            foreach (var categorySlug in seed.Categories)
            {
                product.Categories.Add(new ProductCategory { Category = categories.First(item => item.Slug == categorySlug) });
            }

            foreach (var spec in seed.Specs)
            {
                product.Specifications.Add(new ProductSpecification { Attribute = attributes[spec.Key], Value = spec.Value });
            }

            foreach (var variant in seed.Variants)
            {
                var entity = new ProductVariant
                {
                    Sku = variant.Sku,
                    ConfigurationName = variant.Name,
                    ColorName = variant.Color,
                    ColorHex = variant.Hex,
                    Price = variant.Price,
                    CompareAtPrice = variant.Compare,
                    StockQuantity = variant.Stock,
                    IsActive = true
                };
                entity.Specifications.Add(new VariantSpecification { Attribute = attributes["cpu"], Value = variant.Cpu });
                entity.Specifications.Add(new VariantSpecification { Attribute = attributes["gpu"], Value = variant.Gpu });
                entity.Specifications.Add(new VariantSpecification { Attribute = attributes["ram"], Value = variant.Ram });
                entity.Specifications.Add(new VariantSpecification { Attribute = attributes["storage"], Value = variant.Storage });
                product.Variants.Add(entity);
            }

            product.SearchText = BuildSearch(product);
            db.Products.Add(product);
        }

        db.Vouchers.Add(new Voucher { Code = "SAVE10", DiscountType = DiscountTypes.Fixed, DiscountValue = 2_500_000, MinOrderAmount = 25_000_000, IsActive = true });
        db.Vouchers.Add(new Voucher { Code = "WELCOME10", DiscountType = DiscountTypes.Percent, DiscountValue = 10, MaxDiscount = 7_500_000, MinOrderAmount = 0, IsActive = true });
        db.ContentPages.AddRange(
            Page("about", "About Us", "LaptopStore helps you compare configurations before you buy. Prices and stock come from the database."),
            Page("privacy", "Privacy Policy", "We store your account, addresses, and orders so we can fulfill them. Passwords are hashed."),
            Page("terms", "Terms of Service", "An order is a request to buy. Online card payment is not available yet."),
            Page("returns", "Returns", "Contact support about a return. Cancelling a pending order restores stock automatically."),
            Page("warranty", "Warranty", "Warranty length is listed on each laptop specification."),
            Page("help", "Help Center", "Search by a chip name such as 4060 or i7. Filters stack. You can compare three configurations."));
        await db.SaveChangesAsync();
        await SeedOrdersAsync(scope.ServiceProvider, db);
    }

    private static async Task SeedOrdersAsync(IServiceProvider services, AppDbContext db)
    {
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var customer = await users.FindByEmailAsync("customer@laptopstore.local");
        var sarah = await users.FindByEmailAsync("sarah.chen@laptopstore.local");
        var michael = await users.FindByEmailAsync("michael.brown@laptopstore.local");
        if (customer is null || sarah is null || michael is null)
        {
            return;
        }

        var variants = await db.ProductVariants.Include(variant => variant.Product).ThenInclude(product => product.Brand).Include(variant => variant.Product).ThenInclude(product => product.Images).ToListAsync();
        Order Make(ApplicationUser user, string status, int daysAgo, params string[] skus)
        {
            var order = new Order
            {
                Code = $"LS-2026-{Random.Shared.Next(100000, 999999)}",
                UserId = user.Id,
                Status = status,
                PaymentStatus = "Unpaid",
                PaymentMethod = "Place order",
                RecipientName = user.FullName,
                Email = user.Email ?? "",
                Phone = "0901234567",
                AddressLine1 = "123 Main Street",
                City = "Ho Chi Minh City",
                State = "Ho Chi Minh",
                PostalCode = "70000",
                Country = "Vietnam",
                CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                UpdatedAt = DateTime.UtcNow.AddDays(-Math.Max(0, daysAgo - 1))
            };
            foreach (var sku in skus)
            {
                var variant = variants.First(item => item.Sku == sku);
                order.Items.Add(new OrderItem
                {
                    Variant = variant,
                    ProductId = variant.ProductId,
                    ProductName = variant.Product.Name,
                    BrandName = variant.Product.Brand.Name,
                    ConfigurationName = variant.ConfigurationName,
                    Sku = variant.Sku,
                    ImageUrl = variant.Product.Images.Select(image => image.Url).FirstOrDefault() ?? "",
                    UnitPrice = variant.Price,
                    Quantity = 1,
                    LineTotal = variant.Price
                });
            }

            order.Subtotal = order.Items.Sum(item => item.LineTotal);
            order.ShippingFee = 0;
            order.Total = order.Subtotal;
            return order;
        }

        var orders = new[]
        {
            Make(customer, OrderStatuses.Delivered, 20, "MBA-M3-8-256"),
            Make(customer, OrderStatuses.Shipped, 6, "XPS13-I7-16"),
            Make(sarah, OrderStatuses.Delivered, 12, "ROG-G16-32"),
            Make(michael, OrderStatuses.Processing, 3, "TP-X1-16"),
            Make(sarah, OrderStatuses.Confirmed, 1, "ZEN-14-16"),
            Make(michael, OrderStatuses.Delivered, 28, "LEGION-7-32")
        };
        db.Orders.AddRange(orders);
        await db.SaveChangesAsync();

        var air = await db.Products.FirstAsync(product => product.Slug == "apple-macbook-air-13-m3");
        var rog = await db.Products.FirstAsync(product => product.Slug == "asus-rog-strix-g16");
        db.ProductReviews.Add(new ProductReview
        {
            ProductId = air.Id,
            UserId = customer.Id,
            OrderId = orders[0].Id,
            Rating = 5,
            Comment = "Quiet, light, and the battery lasts through a class day.",
            AuthorName = customer.FullName,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        });
        db.ProductReviews.Add(new ProductReview
        {
            ProductId = rog.Id,
            UserId = sarah.Id,
            OrderId = orders[2].Id,
            Rating = 4,
            Comment = "The RTX 4070 configuration stays smooth in games. It is heavier than an ultrabook.",
            AuthorName = sarah.FullName,
            CreatedAt = DateTime.UtcNow.AddDays(-4)
        });
        await db.SaveChangesAsync();
    }

    private static async Task<Dictionary<string, SpecificationAttribute>> SeedAttributesAsync(AppDbContext db)
    {
        var definitions = new (string Group, string Name, string Slug, string Scope, bool Filter, int Order)[]
        {
            ("Performance", "CPU", "cpu", SpecScopes.Variant, true, 1),
            ("Performance", "GPU", "gpu", SpecScopes.Variant, true, 2),
            ("Performance", "RAM", "ram", SpecScopes.Variant, true, 3),
            ("Performance", "Storage", "storage", SpecScopes.Variant, true, 4),
            ("Display", "Display", "display-size", SpecScopes.Product, true, 5),
            ("Display", "Resolution", "resolution", SpecScopes.Product, false, 6),
            ("Display", "Refresh Rate", "refresh-rate", SpecScopes.Product, true, 7),
            ("Display", "Panel", "panel", SpecScopes.Product, false, 8),
            ("General", "Operating System", "os", SpecScopes.Product, true, 9),
            ("General", "Weight", "weight", SpecScopes.Product, false, 10),
            ("General", "Battery", "battery", SpecScopes.Product, false, 11),
            ("General", "Ports", "ports", SpecScopes.Product, false, 12),
            ("General", "Warranty", "warranty", SpecScopes.Product, false, 13)
        };
        var groups = definitions.Select(item => item.Group).Distinct().Select((name, index) => new SpecificationGroup { Name = name, SortOrder = index + 1 }).ToList();
        db.SpecificationGroups.AddRange(groups);
        await db.SaveChangesAsync();
        var attributes = definitions.Select(item => new SpecificationAttribute
        {
            GroupId = groups.First(group => group.Name == item.Group).Id,
            Name = item.Name,
            Slug = item.Slug,
            Scope = item.Scope,
            IsFilterable = item.Filter,
            SortOrder = item.Order
        }).ToList();
        db.SpecificationAttributes.AddRange(attributes);
        await db.SaveChangesAsync();
        return attributes.ToDictionary(attribute => attribute.Slug);
    }

    private static List<Brand> SeedBrands() =>
    [
        Brand("Apple", "apple", 1), Brand("Dell", "dell", 2), Brand("Lenovo", "lenovo", 3), Brand("ASUS", "asus", 4),
        Brand("HP", "hp", 5), Brand("Acer", "acer", 6), Brand("MSI", "msi", 7), Brand("Microsoft", "microsoft", 8)
    ];

    private static Brand Brand(string name, string slug, int order) => new() { Name = name, Slug = slug, Description = $"{name} laptops", IsActive = true, SortOrder = order };

    private static List<Category> SeedCategories() =>
    [
        Category("Laptop doanh nhân", "business", "Dành cho công việc", 1),
        Category("Laptop gaming", "gaming", "Chơi game không giới hạn", 2),
        Category("Laptop sinh viên", "student", "Học tập và sáng tạo", 3),
        Category("Laptop 2 trong 1", "2-in-1", "Linh hoạt cho mọi ý tưởng", 4),
        Category("Laptop sáng tạo", "creator", "Dành cho ý tưởng lớn", 5)
    ];

    private static Category Category(string name, string slug, string description, int order) => new() { Name = name, Slug = slug, Description = description, IsActive = true, SortOrder = order };

    private static ContentPage Page(string slug, string title, string body) => new() { Slug = slug, Title = title, Body = body, UpdatedAt = DateTime.UtcNow };

    private static string BuildSearch(Product product)
    {
        var parts = new List<string> { product.Name, product.Brand.Name, product.Slug };
        parts.AddRange(product.Categories.Select(link => link.Category.Name));
        parts.AddRange(product.Specifications.Select(spec => spec.Value));
        parts.AddRange(product.Variants.SelectMany(variant => new[] { variant.Sku, variant.ConfigurationName }.Concat(variant.Specifications.Select(spec => spec.Value))));
        return string.Join(' ', parts).ToLowerInvariant();
    }

    private static IEnumerable<ProductSeed> Products()
    {
        yield return Laptop("apple-macbook-air-13-m3", "Apple MacBook Air 13\" (M3)", "apple", ["business", "student"], true, true, false, 30,
            "The next generation MacBook Air with an M3 chip.",
            Specs("13.6 inch", "2560x1664", "60Hz", "Liquid Retina", "macOS", "1.24 kg", "Up to 18 hours", "2x Thunderbolt", "1 Year Limited Warranty"),
            Variant("MBA-M3-8-256", "M3 / 8GB / 256GB", "Space Gray", "#4b5563", 1099, 1199, 24, "Apple M3", "Integrated 10-core GPU", "8 GB", "256 GB SSD"),
            Variant("MBA-M3-16-512", "M3 / 16GB / 512GB", "Silver", "#d1d5db", 1399, null, 12, "Apple M3", "Integrated 10-core GPU", "16 GB", "512 GB SSD"));
        yield return Laptop("dell-xps-13-plus", "Dell XPS 13 Plus", "dell", ["business"], true, false, false, 24,
            "A compact business laptop with a clean keyboard deck.",
            Specs("13.4 inch", "1920x1200", "60Hz", "IPS", "Windows 11", "1.26 kg", "Up to 12 hours", "2x Thunderbolt 4", "1 Year Limited Warranty"),
            Variant("XPS13-I7-16", "Core i7 / 16GB / 512GB", "Platinum", "#9ca3af", 1299, null, 18, "Intel Core i7", "Intel Iris Xe", "16 GB", "512 GB SSD"),
            Variant("XPS13-I7-32", "Core i7 / 32GB / 1TB", "Graphite", "#111827", 1699, 1799, 7, "Intel Core i7", "Intel Iris Xe", "32 GB", "1 TB SSD"));
        yield return Laptop("asus-rog-strix-g16", "ASUS ROG Strix G16", "asus", ["gaming"], true, false, false, 18,
            "A 16-inch gaming laptop with an RTX 4070 option.",
            Specs("16 inch", "2560x1600", "240Hz", "IPS", "Windows 11", "2.50 kg", "Up to 6 hours", "USB-C, HDMI, Ethernet", "1 Year Limited Warranty"),
            Variant("ROG-G16-16", "Core i9 / 16GB / 1TB / RTX 4070", "Eclipse Gray", "#111827", 1799, 1999, 8, "Intel Core i9", "NVIDIA GeForce RTX 4070", "16 GB", "1 TB SSD"),
            Variant("ROG-G16-32", "Core i9 / 32GB / 1TB / RTX 4070", "Eclipse Gray", "#111827", 2099, null, 4, "Intel Core i9", "NVIDIA GeForce RTX 4070", "32 GB", "1 TB SSD"));
        yield return Laptop("lenovo-thinkpad-x1-carbon", "Lenovo ThinkPad X1 Carbon", "lenovo", ["business"], true, false, false, 40,
            "A light business laptop with a comfortable keyboard.",
            Specs("14 inch", "1920x1200", "60Hz", "IPS", "Windows 11", "1.12 kg", "Up to 15 hours", "2x Thunderbolt, HDMI", "1 Year Limited Warranty"),
            Variant("TP-X1-16", "Core i7 / 16GB / 512GB", "Black", "#111111", 1499, null, 15, "Intel Core i7", "Intel Iris Xe", "16 GB", "512 GB SSD"),
            Variant("TP-X1-32", "Core i7 / 32GB / 1TB", "Black", "#111111", 1899, null, 6, "Intel Core i7", "Intel Iris Xe", "32 GB", "1 TB SSD"));
        yield return Laptop("hp-spectre-x360-14", "HP Spectre x360 14", "hp", ["2-in-1", "creator"], false, true, false, 15,
            "A convertible laptop for notes and design work.",
            Specs("14 inch", "2880x1800", "120Hz", "OLED", "Windows 11", "1.36 kg", "Up to 16 hours", "2x Thunderbolt", "1 Year Limited Warranty"),
            Variant("SPECTRE-16", "Core i7 / 16GB / 1TB", "Nightfall", "#1f2937", 1399, null, 11, "Intel Core i7", "Intel Arc", "16 GB", "1 TB SSD"),
            Variant("SPECTRE-32", "Core i7 / 32GB / 1TB", "Nightfall", "#1f2937", 1699, null, 0, "Intel Core i7", "Intel Arc", "32 GB", "1 TB SSD"));
        yield return Laptop("acer-swift-go-14", "Acer Swift Go 14", "acer", ["student"], false, true, false, 12,
            "A student laptop with OLED and a low starting price.",
            Specs("14 inch", "2880x1800", "90Hz", "OLED", "Windows 11", "1.25 kg", "Up to 12 hours", "HDMI, USB-C, USB-A", "1 Year Limited Warranty"),
            Variant("SWIFT-I5-8", "Core i5 / 8GB / 512GB", "Silver", "#e5e7eb", 749, 799, 32, "Intel Core i5", "Intel Iris Xe", "8 GB", "512 GB SSD"),
            Variant("SWIFT-I5-16", "Core i5 / 16GB / 512GB", "Silver", "#e5e7eb", 849, null, 3, "Intel Core i5", "Intel Iris Xe", "16 GB", "512 GB SSD"));
        yield return Laptop("msi-katana-15", "MSI Katana 15", "msi", ["gaming"], false, false, false, 21,
            "A gaming laptop with an RTX 4060.",
            Specs("15.6 inch", "1920x1080", "144Hz", "IPS", "Windows 11", "2.25 kg", "Up to 6 hours", "HDMI, USB-A, Ethernet", "1 Year Limited Warranty"),
            Variant("KATANA-4060", "Core i7 / 16GB / 1TB / RTX 4060", "Black", "#111111", 1199, 1299, 6, "Intel Core i7", "NVIDIA GeForce RTX 4060", "16 GB", "1 TB SSD"));
        yield return Laptop("microsoft-surface-laptop-7", "Microsoft Surface Laptop 7", "microsoft", ["business", "student"], true, true, false, 9,
            "A slim everyday laptop.",
            Specs("13.8 inch", "2304x1536", "120Hz", "PixelSense", "Windows 11", "1.34 kg", "Up to 20 hours", "2x USB-C", "1 Year Limited Warranty"),
            Variant("SURFACE-16", "Snapdragon X / 16GB / 512GB", "Platinum", "#d1d5db", 1299, null, 14, "Snapdragon X Elite", "Qualcomm Adreno", "16 GB", "512 GB SSD"));
        yield return Laptop("apple-macbook-pro-14-m4", "MacBook Pro 14\" (M4)", "apple", ["creator", "business"], true, true, true, 8,
            "A pro laptop for long compile and edit sessions.",
            Specs("14.2 inch", "3024x1964", "120Hz", "Liquid Retina XDR", "macOS", "1.55 kg", "Up to 22 hours", "3x Thunderbolt, HDMI", "1 Year Limited Warranty"),
            Variant("MBP14-M4-16", "M4 / 16GB / 512GB", "Space Black", "#111827", 1599, null, 10, "Apple M4", "Integrated 10-core GPU", "16 GB", "512 GB SSD"),
            Variant("MBP14-M4-24", "M4 / 24GB / 1TB", "Silver", "#e5e7eb", 1999, null, 5, "Apple M4", "Integrated 10-core GPU", "24 GB", "1 TB SSD"));
        yield return Laptop("acer-predator-helios-16", "Acer Predator Helios 16", "acer", ["gaming"], false, false, false, 16,
            "A 16-inch gaming laptop with a 240Hz panel.",
            Specs("16 inch", "2560x1600", "240Hz", "IPS", "Windows 11", "2.60 kg", "Up to 5 hours", "HDMI, USB-A, Ethernet", "1 Year Limited Warranty"),
            Variant("HELIOS-4070", "Core i7 / 16GB / 1TB / RTX 4070", "Black", "#111111", 1699, null, 9, "Intel Core i7", "NVIDIA GeForce RTX 4070", "16 GB", "1 TB SSD"));
        yield return Laptop("lenovo-legion-7i", "Lenovo Legion 7i", "lenovo", ["gaming", "creator"], true, false, false, 11,
            "A quieter gaming laptop that also edits video.",
            Specs("16 inch", "2560x1600", "240Hz", "IPS", "Windows 11", "2.30 kg", "Up to 7 hours", "Thunderbolt, HDMI", "1 Year Limited Warranty"),
            Variant("LEGION-7-32", "Core i9 / 32GB / 1TB / RTX 4070", "Gray", "#374151", 1999, 2199, 7, "Intel Core i9", "NVIDIA GeForce RTX 4070", "32 GB", "1 TB SSD"));
        yield return Laptop("asus-zenbook-14-oled", "ASUS Zenbook 14 OLED", "asus", ["business", "creator"], false, true, false, 7,
            "A thin OLED laptop for writing and photo work.",
            Specs("14 inch", "2880x1800", "120Hz", "OLED", "Windows 11", "1.20 kg", "Up to 15 hours", "HDMI, USB-C, USB-A", "1 Year Limited Warranty"),
            Variant("ZEN-14-16", "Core Ultra 7 / 16GB / 512GB", "Foggy Silver", "#d1d5db", 1099, null, 16, "Intel Core Ultra 7", "Intel Arc", "16 GB", "512 GB SSD"));
    }

    private static ProductSeed Laptop(string slug, string name, string brand, string[] categories, bool featured, bool isNew, bool hero, int age, string description, Dictionary<string, string> specs, params VariantSeed[] variants)
    {
        return new ProductSeed(slug, name, brand, categories, description, description, featured, isNew, hero, age, specs, variants);
    }

    private static Dictionary<string, string> Specs(string display, string resolution, string refresh, string panel, string os, string weight, string battery, string ports, string warranty) => new()
    {
        ["display-size"] = display,
        ["resolution"] = resolution,
        ["refresh-rate"] = refresh,
        ["panel"] = panel,
        ["os"] = os,
        ["weight"] = weight,
        ["battery"] = battery,
        ["ports"] = ports,
        ["warranty"] = warranty
    };

    private static VariantSeed Variant(string sku, string name, string color, string hex, decimal price, decimal? compare, int stock, string cpu, string gpu, string ram, string storage)
        => new(sku, name, color, hex, price * 25_000m, compare * 25_000m, stock, cpu, gpu, ram, storage);

    private sealed record ProductSeed(string Slug, string Name, string Brand, string[] Categories, string Short, string Description, bool Featured, bool IsNew, bool Hero, int Age, Dictionary<string, string> Specs, VariantSeed[] Variants);
    private sealed record VariantSeed(string Sku, string Name, string Color, string Hex, decimal Price, decimal? Compare, int Stock, string Cpu, string Gpu, string Ram, string Storage);
}
