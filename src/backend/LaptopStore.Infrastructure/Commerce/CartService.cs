using LaptopStore.Application;
using LaptopStore.Application.Commerce;
using LaptopStore.Domain.Catalog;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Commerce;

public static class Pricing
{
    public static (decimal Discount, string? Message) QuoteVoucher(Voucher? voucher, decimal subtotal)
    {
        if (voucher is null)
        {
            return (0, null);
        }

        var now = DateTime.UtcNow;
        if (!voucher.IsActive)
        {
            return (0, "Mã này chưa được bật.");
        }

        if (voucher.StartsAt is not null && voucher.StartsAt > now)
        {
            return (0, "Mã này chưa đến hạn dùng.");
        }

        if (voucher.EndsAt is not null && voucher.EndsAt < now)
        {
            return (0, "Mã này đã hết hạn.");
        }

        if (voucher.UsageLimit is not null && voucher.UsedCount >= voucher.UsageLimit)
        {
            return (0, "Mã này đã hết lượt dùng.");
        }

        if (subtotal < voucher.MinOrderAmount)
        {
            var minimum = voucher.MinOrderAmount.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("vi-VN"));
            return (0, $"Đơn tối thiểu {minimum} ₫ mới dùng được mã này.");
        }

        var discount = voucher.DiscountType == DiscountTypes.Percent
            ? Math.Round(subtotal * voucher.DiscountValue / 100m, 2)
            : voucher.DiscountValue;
        if (voucher.MaxDiscount is not null)
        {
            discount = Math.Min(discount, voucher.MaxDiscount.Value);
        }

        discount = Math.Min(discount, subtotal);
        return (discount, null);
    }

    public static CartDto Build(IEnumerable<CartLineDto> lines, string? code, decimal discount, string? message)
    {
        var items = lines.ToList();
        var subtotal = items.Sum(line => line.LineTotal);
        var shipping = items.Count == 0 ? 0 : StoreRules.ShippingFeeFor(subtotal);
        return new CartDto
        {
            Items = items,
            Subtotal = subtotal,
            ShippingFee = shipping,
            Discount = discount,
            Total = Math.Max(0, subtotal - discount) + shipping,
            VoucherCode = string.IsNullOrWhiteSpace(message) ? code : null,
            VoucherMessage = message
        };
    }
}

public sealed class CartService : ICartService
{
    private readonly AppDbContext _db;

    public CartService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CartDto> GetAsync(string userId, CancellationToken cancellationToken)
    {
        var cart = await LoadCartAsync(userId, cancellationToken);
        return await ToDtoAsync(cart, cancellationToken);
    }

    public async Task<CartDto> QuoteAsync(QuoteRequest request, CancellationToken cancellationToken)
    {
        return await QuoteItemsAsync(request.Items, request.VoucherCode, cancellationToken);
    }

    public async Task<CartDto> AddAsync(string userId, CartChangeRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity < 1)
        {
            throw new ApiException(400, "Quantity must be at least 1.");
        }

        var variant = await ActiveVariantAsync(request.VariantId, cancellationToken);
        var cart = await EnsureCartAsync(userId, cancellationToken);
        var line = cart.Items.FirstOrDefault(item => item.VariantId == variant.Id);
        var next = (line?.Quantity ?? 0) + request.Quantity;
        if (next > variant.StockQuantity)
        {
            throw new ApiException(400, $"Only {variant.StockQuantity} left in stock.");
        }

        if (line is null)
        {
            cart.Items.Add(new CartItem { VariantId = variant.Id, Quantity = next });
        }
        else
        {
            line.Quantity = next;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    public async Task<CartDto> UpdateAsync(string userId, int itemId, int quantity, CancellationToken cancellationToken)
    {
        var cart = await LoadCartAsync(userId, cancellationToken);
        var line = cart.Items.FirstOrDefault(item => item.Id == itemId) ?? throw new ApiException(404, "That cart item was not found.");
        if (quantity < 1)
        {
            _db.CartItems.Remove(line);
        }
        else
        {
            if (quantity > line.Variant.StockQuantity)
            {
                throw new ApiException(400, $"Only {line.Variant.StockQuantity} left in stock.");
            }

            line.Quantity = quantity;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    public async Task<CartDto> RemoveAsync(string userId, int itemId, CancellationToken cancellationToken)
    {
        return await UpdateAsync(userId, itemId, 0, cancellationToken);
    }

    public async Task<CartDto> MergeAsync(string userId, QuoteRequest request, CancellationToken cancellationToken)
    {
        var cart = await EnsureCartAsync(userId, cancellationToken);
        foreach (var incoming in request.Items)
        {
            var variant = await _db.ProductVariants.FirstOrDefaultAsync(item => item.Id == incoming.VariantId && item.IsActive, cancellationToken);
            if (variant is null || incoming.Quantity < 1)
            {
                continue;
            }

            var line = cart.Items.FirstOrDefault(item => item.VariantId == variant.Id);
            var next = Math.Min(variant.StockQuantity, (line?.Quantity ?? 0) + incoming.Quantity);
            if (next < 1)
            {
                continue;
            }

            if (line is null)
            {
                cart.Items.Add(new CartItem { VariantId = variant.Id, Quantity = next });
            }
            else
            {
                line.Quantity = next;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.VoucherCode))
        {
            cart.VoucherCode = request.VoucherCode.Trim().ToUpperInvariant();
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    public async Task<CartDto> ApplyVoucherAsync(string userId, string? code, CancellationToken cancellationToken)
    {
        var cart = await EnsureCartAsync(userId, cancellationToken);
        cart.VoucherCode = string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant();
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    private async Task<CartDto> QuoteItemsAsync(IEnumerable<QuoteItemRequest> items, string? code, CancellationToken cancellationToken)
    {
        var lines = new List<CartLineDto>();
        foreach (var item in items)
        {
            var variant = await _db.ProductVariants.AsNoTracking()
                .Include(entry => entry.Product).ThenInclude(product => product.Brand)
                .Include(entry => entry.Product).ThenInclude(product => product.Images)
                .FirstOrDefaultAsync(entry => entry.Id == item.VariantId && entry.IsActive && entry.Product.IsActive, cancellationToken);
            if (variant is null)
            {
                continue;
            }

            var quantity = Math.Clamp(item.Quantity, 1, Math.Max(1, variant.StockQuantity));
            if (variant.StockQuantity < 1)
            {
                continue;
            }

            lines.Add(MapLine(null, variant, quantity));
        }

        var subtotal = lines.Sum(line => line.LineTotal);
        var voucher = await FindVoucherAsync(code, cancellationToken);
        var quote = Pricing.QuoteVoucher(voucher, subtotal);
        return Pricing.Build(lines, voucher?.Code, quote.Discount, quote.Message);
    }

    private async Task<CartDto> ToDtoAsync(Cart cart, CancellationToken cancellationToken)
    {
        var lines = cart.Items
            .Where(item => item.Variant.IsActive && item.Variant.Product.IsActive && item.Variant.StockQuantity > 0)
            .Select(item => MapLine(item.Id, item.Variant, Math.Min(item.Quantity, item.Variant.StockQuantity)))
            .ToList();
        var subtotal = lines.Sum(line => line.LineTotal);
        var voucher = await FindVoucherAsync(cart.VoucherCode, cancellationToken);
        var quote = Pricing.QuoteVoucher(voucher, subtotal);
        return Pricing.Build(lines, string.IsNullOrWhiteSpace(quote.Message) ? cart.VoucherCode : null, quote.Discount, quote.Message);
    }

    private async Task<Cart> LoadCartAsync(string userId, CancellationToken cancellationToken)
    {
        return await _db.Carts
            .Include(cart => cart.Items).ThenInclude(item => item.Variant).ThenInclude(variant => variant.Product).ThenInclude(product => product.Brand)
            .Include(cart => cart.Items).ThenInclude(item => item.Variant).ThenInclude(variant => variant.Product).ThenInclude(product => product.Images)
            .FirstOrDefaultAsync(cart => cart.UserId == userId, cancellationToken)
            ?? new Cart { UserId = userId };
    }

    private async Task<Cart> EnsureCartAsync(string userId, CancellationToken cancellationToken)
    {
        var cart = await _db.Carts.Include(item => item.Items).FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (cart is not null)
        {
            return cart;
        }

        cart = new Cart { UserId = userId };
        _db.Carts.Add(cart);
        await _db.SaveChangesAsync(cancellationToken);
        return cart;
    }

    private async Task<ProductVariant> ActiveVariantAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.ProductVariants.FirstOrDefaultAsync(variant => variant.Id == id && variant.IsActive && variant.Product.IsActive, cancellationToken)
            ?? throw new ApiException(404, "That configuration is not available.");
    }

    private async Task<Voucher?> FindVoucherAsync(string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var normalized = code.Trim().ToUpperInvariant();
        return await _db.Vouchers.FirstOrDefaultAsync(voucher => voucher.Code == normalized, cancellationToken);
    }

    private static CartLineDto MapLine(int? itemId, ProductVariant variant, int quantity)
    {
        var image = variant.Product.Images.OrderByDescending(item => item.IsPrimary).ThenBy(item => item.SortOrder).Select(item => item.Url).FirstOrDefault() ?? "";
        return new CartLineDto
        {
            ItemId = itemId,
            VariantId = variant.Id,
            ProductId = variant.ProductId,
            ProductName = variant.Product.Name,
            Slug = variant.Product.Slug,
            BrandName = variant.Product.Brand.Name,
            ConfigurationName = variant.ConfigurationName,
            ImageUrl = image,
            UnitPrice = variant.Price,
            Quantity = quantity,
            StockQuantity = variant.StockQuantity,
            LineTotal = variant.Price * quantity
        };
    }
}
