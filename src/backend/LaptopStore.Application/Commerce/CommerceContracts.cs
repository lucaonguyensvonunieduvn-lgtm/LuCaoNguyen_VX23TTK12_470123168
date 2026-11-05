using LaptopStore.Application.Catalog;

namespace LaptopStore.Application.Commerce;

public sealed class CartLineDto
{
    public int? ItemId { get; set; }
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public int StockQuantity { get; set; }
    public decimal LineTotal { get; set; }
}

public sealed class CartDto
{
    public List<CartLineDto> Items { get; set; } = [];
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string? VoucherCode { get; set; }
    public string? VoucherMessage { get; set; }
}

public sealed class QuoteItemRequest
{
    public int VariantId { get; set; }
    public int Quantity { get; set; }
}

public sealed class QuoteRequest
{
    public List<QuoteItemRequest> Items { get; set; } = [];
    public string? VoucherCode { get; set; }
}

public sealed class CartChangeRequest
{
    public int VariantId { get; set; }
    public int Quantity { get; set; }
}

public sealed class VoucherRequest
{
    public string? Code { get; set; }
}

public sealed class PlaceOrderRequest
{
    public string FullName { get; set; } = string.Empty;
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
    public bool SaveAddress { get; set; }
    public List<QuoteItemRequest>? Items { get; set; }
}

public sealed class OrderItemDto
{
    public string ProductName { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string ConfigurationName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
    public string Slug { get; set; } = string.Empty;
}

public sealed class OrderDto
{
    public string Code { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string? VoucherCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderItemDto> Items { get; set; } = [];
    public string[] NextStatuses { get; set; } = [];
}

public sealed class AddressDto
{
    public int Id { get; set; }
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

public sealed class ProfileDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public int AddressCount { get; set; }
    public int WishlistCount { get; set; }
}

public sealed class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class CreateReviewRequest
{
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public interface ICartService
{
    Task<CartDto> GetAsync(string userId, CancellationToken cancellationToken);
    Task<CartDto> QuoteAsync(QuoteRequest request, CancellationToken cancellationToken);
    Task<CartDto> AddAsync(string userId, CartChangeRequest request, CancellationToken cancellationToken);
    Task<CartDto> UpdateAsync(string userId, int itemId, int quantity, CancellationToken cancellationToken);
    Task<CartDto> RemoveAsync(string userId, int itemId, CancellationToken cancellationToken);
    Task<CartDto> MergeAsync(string userId, QuoteRequest request, CancellationToken cancellationToken);
    Task<CartDto> ApplyVoucherAsync(string userId, string? code, CancellationToken cancellationToken);
}

public interface ICheckoutService
{
    Task<OrderDto> PlaceAsync(string userId, PlaceOrderRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<OrderDto>> ListMineAsync(string userId, string? status, CancellationToken cancellationToken);
    Task<OrderDto?> GetMineAsync(string userId, string code, CancellationToken cancellationToken);
    Task<OrderDto> CancelMineAsync(string userId, string code, CancellationToken cancellationToken);
}

public interface IAccountService
{
    Task<ProfileDto> GetProfileAsync(string userId, CancellationToken cancellationToken);
    Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken);
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AddressDto>> GetAddressesAsync(string userId, CancellationToken cancellationToken);
    Task<AddressDto> SaveAddressAsync(string userId, AddressDto request, CancellationToken cancellationToken);
    Task DeleteAddressAsync(string userId, int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductCardDto>> GetWishlistAsync(string userId, CancellationToken cancellationToken);
    Task AddWishlistAsync(string userId, int productId, CancellationToken cancellationToken);
    Task RemoveWishlistAsync(string userId, int productId, CancellationToken cancellationToken);
}

public sealed class AdminReviewRow
{
    public int Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class ReviewVisibilityRequest
{
    public bool IsVisible { get; set; }
}

public interface IReviewService
{
    Task<ReviewDto> CreateAsync(string userId, string slug, CreateReviewRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminReviewRow>> ListAsync(CancellationToken cancellationToken);
    Task SetVisibilityAsync(int id, bool isVisible, CancellationToken cancellationToken);
}
