using LaptopStore.Application;
using LaptopStore.Application.Commerce;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Commerce;

public sealed class CheckoutService : ICheckoutService
{
    private readonly AppDbContext _db;

    public CheckoutService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OrderDto> PlaceAsync(string userId, PlaceOrderRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        var cart = await _db.Carts
            .Include(item => item.Items)
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken)
            ?? throw new ApiException(400, "Your cart is empty.");

        if (cart.Items.Count == 0)
        {
            throw new ApiException(400, "Your cart is empty.");
        }

        var variantIds = cart.Items.Select(item => item.VariantId).ToList();
        var variants = await _db.ProductVariants
            .Include(variant => variant.Product).ThenInclude(product => product.Brand)
            .Include(variant => variant.Product).ThenInclude(product => product.Images)
            .Where(variant => variantIds.Contains(variant.Id))
            .ToListAsync(cancellationToken);

        var order = new Order
        {
            Code = await NextCodeAsync(cancellationToken),
            UserId = userId,
            Status = OrderStatuses.Pending,
            PaymentStatus = "Unpaid",
            PaymentMethod = "Place order",
            RecipientName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            Phone = request.Phone.Trim(),
            AddressLine1 = request.AddressLine1.Trim(),
            AddressLine2 = Clean(request.AddressLine2),
            City = request.City.Trim(),
            State = request.State.Trim(),
            PostalCode = request.PostalCode.Trim(),
            Country = request.Country.Trim(),
            Note = Clean(request.Note),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var line in cart.Items)
        {
            var variant = variants.FirstOrDefault(item => item.Id == line.VariantId)
                ?? throw new ApiException(400, "A laptop in your cart is no longer available.");
            if (!variant.IsActive || !variant.Product.IsActive)
            {
                throw new ApiException(400, $"{variant.Product.Name} is no longer for sale.");
            }

            if (line.Quantity < 1 || line.Quantity > variant.StockQuantity)
            {
                throw new ApiException(400, $"Only {variant.StockQuantity} left for {variant.Product.Name}.");
            }

            var image = variant.Product.Images.OrderByDescending(item => item.IsPrimary).Select(item => item.Url).FirstOrDefault() ?? "";
            order.Items.Add(new OrderItem
            {
                VariantId = variant.Id,
                ProductId = variant.ProductId,
                ProductName = variant.Product.Name,
                BrandName = variant.Product.Brand.Name,
                ConfigurationName = variant.ConfigurationName,
                Sku = variant.Sku,
                ImageUrl = image,
                UnitPrice = variant.Price,
                Quantity = line.Quantity,
                LineTotal = variant.Price * line.Quantity
            });
            variant.StockQuantity -= line.Quantity;
        }

        order.Subtotal = order.Items.Sum(item => item.LineTotal);
        var code = string.IsNullOrWhiteSpace(request.VoucherCode) ? cart.VoucherCode : request.VoucherCode;
        if (!string.IsNullOrWhiteSpace(code))
        {
            var voucher = await _db.Vouchers.FirstOrDefaultAsync(item => item.Code == code.Trim().ToUpperInvariant(), cancellationToken);
            var quote = Pricing.QuoteVoucher(voucher, order.Subtotal);
            if (quote.Message is not null)
            {
                throw new ApiException(400, quote.Message);
            }

            if (voucher is not null && quote.Discount > 0)
            {
                voucher.UsedCount += 1;
                order.VoucherCode = voucher.Code;
                order.Discount = quote.Discount;
            }
        }

        order.ShippingFee = StoreRules.ShippingFeeFor(order.Subtotal);
        order.Total = order.Subtotal - order.Discount + order.ShippingFee;
        _db.Orders.Add(order);
        _db.CartItems.RemoveRange(cart.Items);
        cart.VoucherCode = null;

        if (request.SaveAddress)
        {
            var hasDefault = await _db.CustomerAddresses.AnyAsync(address => address.UserId == userId && address.IsDefault, cancellationToken);
            _db.CustomerAddresses.Add(new CustomerAddress
            {
                UserId = userId,
                RecipientName = order.RecipientName,
                Phone = order.Phone,
                AddressLine1 = order.AddressLine1,
                AddressLine2 = order.AddressLine2,
                City = order.City,
                State = order.State,
                PostalCode = order.PostalCode,
                Country = order.Country,
                IsDefault = !hasDefault
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(order, []);
    }

    public async Task<IReadOnlyList<OrderDto>> ListMineAsync(string userId, string? status, CancellationToken cancellationToken)
    {
        var orders = await Query().Where(order => order.UserId == userId && (status == null || status == "" || order.Status == status))
            .OrderByDescending(order => order.CreatedAt)
            .ToListAsync(cancellationToken);
        return orders.Select(order => Map(order, [])).ToList();
    }

    public async Task<OrderDto?> GetMineAsync(string userId, string code, CancellationToken cancellationToken)
    {
        var order = await Query().FirstOrDefaultAsync(item => item.UserId == userId && item.Code == code, cancellationToken);
        return order is null ? null : Map(order, CustomerNext(order.Status));
    }

    public async Task<OrderDto> CancelMineAsync(string userId, string code, CancellationToken cancellationToken)
    {
        var order = await _db.Orders.Include(item => item.Items).FirstOrDefaultAsync(item => item.UserId == userId && item.Code == code, cancellationToken)
            ?? throw new ApiException(404, "Order not found.");
        if (order.Status != OrderStatuses.Pending)
        {
            throw new ApiException(400, "Only pending orders can be cancelled here.");
        }

        await RestoreStockAsync(order, cancellationToken);
        order.Status = OrderStatuses.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Map(order, []);
    }

    public static async Task RestoreStockAsync(AppDbContext db, Order order, CancellationToken cancellationToken)
    {
        foreach (var line in order.Items.Where(item => item.VariantId is not null))
        {
            var variant = await db.ProductVariants.FirstOrDefaultAsync(item => item.Id == line.VariantId, cancellationToken);
            if (variant is not null)
            {
                variant.StockQuantity += line.Quantity;
            }
        }
    }

    private async Task RestoreStockAsync(Order order, CancellationToken cancellationToken)
    {
        await RestoreStockAsync(_db, order, cancellationToken);
    }

    private IQueryable<Order> Query()
    {
        return _db.Orders.AsNoTracking().Include(order => order.Items);
    }

    private async Task<string> NextCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var code = $"LS-{DateTime.UtcNow.Year}-{Random.Shared.Next(100000, 999999)}";
            if (!await _db.Orders.AnyAsync(order => order.Code == code, cancellationToken))
            {
                return code;
            }
        }

        return $"LS-{DateTime.UtcNow:yyyyMMddHHmmss}";
    }

    public static OrderDto Map(Order order, string[] next)
    {
        return new OrderDto
        {
            Code = order.Code,
            Status = order.Status,
            PaymentStatus = order.PaymentStatus,
            PaymentMethod = order.PaymentMethod,
            RecipientName = order.RecipientName,
            Email = order.Email,
            Phone = order.Phone,
            AddressLine1 = order.AddressLine1,
            AddressLine2 = order.AddressLine2,
            City = order.City,
            State = order.State,
            PostalCode = order.PostalCode,
            Country = order.Country,
            Subtotal = order.Subtotal,
            ShippingFee = order.ShippingFee,
            Discount = order.Discount,
            Total = order.Total,
            VoucherCode = order.VoucherCode,
            CreatedAt = order.CreatedAt,
            NextStatuses = next,
            Items = order.Items.Select(item => new OrderItemDto
            {
                ProductName = item.ProductName,
                BrandName = item.BrandName,
                ConfigurationName = item.ConfigurationName,
                Sku = item.Sku,
                ImageUrl = item.ImageUrl,
                UnitPrice = item.UnitPrice,
                Quantity = item.Quantity,
                LineTotal = item.LineTotal
            }).ToList()
        };
    }

    private static string[] CustomerNext(string status) => status == OrderStatuses.Pending ? [OrderStatuses.Cancelled] : [];

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
