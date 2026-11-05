using LaptopStore.Domain.Catalog;

namespace LaptopStore.Domain.Commerce;

public class CustomerAddress
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class Cart
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? VoucherCode { get; set; }
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}

public class CartItem
{
    public int Id { get; set; }
    public int CartId { get; set; }
    public Cart Cart { get; set; } = null!;
    public int VariantId { get; set; }
    public ProductVariant Variant { get; set; } = null!;
    public int Quantity { get; set; }
}

public class WishlistItem
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

public class Voucher
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = DiscountTypes.Fixed;
    public decimal DiscountValue { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscount { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;
}

public static class DiscountTypes
{
    public const string Percent = "Percent";
    public const string Fixed = "Fixed";
}

public class Order
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = OrderStatuses.Pending;
    public string PaymentStatus { get; set; } = "Unpaid";
    public string PaymentMethod { get; set; } = "Place order";
    public string RecipientName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? VoucherCode { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public static class OrderStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Processing = "Processing";
    public const string Shipped = "Shipped";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All =
    [
        Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
    ];

    public static readonly IReadOnlyDictionary<string, string[]> Next = new Dictionary<string, string[]>
    {
        [Pending] = [Confirmed, Cancelled],
        [Confirmed] = [Processing, Cancelled],
        [Processing] = [Shipped, Cancelled],
        [Shipped] = [Delivered, Cancelled],
        [Delivered] = [],
        [Cancelled] = []
    };

    public static bool CountsAsRevenue(string status) =>
        status is Confirmed or Processing or Shipped or Delivered;
}

public static class StoreRules
{
    public const decimal FreeShippingThreshold = 1_250_000m;
    public const decimal StandardShippingFee = 375_000m;
    public const int LowStockThreshold = 5;
    public const int MaxCompare = 3;

    public static decimal ShippingFeeFor(decimal subtotal) =>
        subtotal >= FreeShippingThreshold ? 0 : StandardShippingFee;
}
