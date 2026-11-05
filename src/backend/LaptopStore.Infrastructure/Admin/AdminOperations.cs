using LaptopStore.Application;
using LaptopStore.Application.Admin;
using LaptopStore.Application.Commerce;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Commerce;
using LaptopStore.Infrastructure.Identity;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Admin;

public sealed class AdminOrderService : IAdminOrderService
{
    private readonly AppDbContext _db;

    public AdminOrderService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OrderBoardDto> BoardAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Orders.AsNoTracking()
            .GroupBy(order => order.Status)
            .Select(group => new { Status = group.Key, Count = group.Count(), Total = group.Sum(order => order.Total) })
            .ToListAsync(cancellationToken);
        int count(string status) => rows.FirstOrDefault(row => row.Status == status)?.Count ?? 0;
        return new OrderBoardDto
        {
            Pending = count(OrderStatuses.Pending),
            Confirmed = count(OrderStatuses.Confirmed),
            Processing = count(OrderStatuses.Processing),
            Shipped = count(OrderStatuses.Shipped),
            Delivered = count(OrderStatuses.Delivered),
            Cancelled = count(OrderStatuses.Cancelled),
            Total = rows.Sum(row => row.Count),
            Revenue = rows.Where(row => OrderStatuses.CountsAsRevenue(row.Status)).Sum(row => row.Total)
        };
    }

    public async Task<PagedResult<OrderDto>> ListAsync(string? search, string? status, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = _db.Orders.AsNoTracking().Include(order => order.Items).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(order => order.Status == status);
        if (from is not null) query = query.Where(order => order.CreatedAt >= from);
        if (to is not null) query = query.Where(order => order.CreatedAt < to);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(order => order.Code.ToLower().Contains(term) || order.RecipientName.ToLower().Contains(term) || order.Email.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, page);
        var size = pageSize is 20 or 50 ? pageSize : 10;
        var orders = await query.OrderByDescending(order => order.CreatedAt).Skip((pageNumber - 1) * size).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<OrderDto>
        {
            Items = orders.Select(order => CheckoutService.Map(order, Next(order.Status))).ToList(),
            Page = pageNumber,
            PageSize = size,
            Total = total
        };
    }

    public async Task<OrderDto?> GetAsync(string code, CancellationToken cancellationToken)
    {
        var order = await _db.Orders.AsNoTracking().Include(item => item.Items).FirstOrDefaultAsync(item => item.Code == code, cancellationToken);
        return order is null ? null : CheckoutService.Map(order, Next(order.Status));
    }

    public async Task<OrderDto> UpdateStatusAsync(string code, string status, CancellationToken cancellationToken)
    {
        var order = await _db.Orders.Include(item => item.Items).FirstOrDefaultAsync(item => item.Code == code, cancellationToken)
            ?? throw new ApiException(404, "Order not found.");
        if (!Next(order.Status).Contains(status))
        {
            throw new ApiException(400, $"Cannot move an order from {order.Status} to {status}.");
        }

        if (status == OrderStatuses.Cancelled)
        {
            await CheckoutService.RestoreStockAsync(_db, order, cancellationToken);
        }

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return CheckoutService.Map(order, Next(order.Status));
    }

    private static string[] Next(string status) => OrderStatuses.Next.TryGetValue(status, out var next) ? next : [];
}

public sealed class AdminCustomerService : IAdminCustomerService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public AdminCustomerService(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    public async Task<IReadOnlyList<CustomerRow>> ListAsync(string? search, CancellationToken cancellationToken)
    {
        var customers = await _users.GetUsersInRoleAsync(Application.Auth.AppRoles.Customer);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            customers = customers.Where(user => user.Email!.Contains(term, StringComparison.OrdinalIgnoreCase) || user.FullName.Contains(term, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var ids = customers.Select(user => user.Id).ToList();
        var counts = await _db.Orders.Where(order => ids.Contains(order.UserId)).GroupBy(order => order.UserId)
            .Select(group => new { group.Key, Count = group.Count() }).ToListAsync(cancellationToken);
        return customers.OrderByDescending(user => user.CreatedAt).Select(user => new CustomerRow
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? "",
            OrderCount = counts.FirstOrDefault(item => item.Key == user.Id)?.Count ?? 0,
            IsLocked = user.LockoutEnd is not null && user.LockoutEnd > DateTimeOffset.UtcNow,
            CreatedAt = user.CreatedAt
        }).ToList();
    }

    public async Task SetLockAsync(string id, bool locked, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _users.FindByIdAsync(id) ?? throw new ApiException(404, "Customer not found.");
        await _users.SetLockoutEnabledAsync(user, true);
        await _users.SetLockoutEndDateAsync(user, locked ? DateTimeOffset.UtcNow.AddYears(100) : null);
    }
}

public sealed class AdminVoucherService : IAdminVoucherService
{
    private readonly AppDbContext _db;

    public AdminVoucherService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<VoucherDto>> ListAsync(CancellationToken cancellationToken)
    {
        return await _db.Vouchers.AsNoTracking().OrderBy(voucher => voucher.Code).Select(voucher => new VoucherDto
        {
            Id = voucher.Id,
            Code = voucher.Code,
            DiscountType = voucher.DiscountType,
            DiscountValue = voucher.DiscountValue,
            MinOrderAmount = voucher.MinOrderAmount,
            MaxDiscount = voucher.MaxDiscount,
            StartsAt = voucher.StartsAt,
            EndsAt = voucher.EndsAt,
            UsageLimit = voucher.UsageLimit,
            UsedCount = voucher.UsedCount,
            IsActive = voucher.IsActive
        }).ToListAsync(cancellationToken);
    }

    public async Task SaveAsync(int? id, VoucherWriteRequest request, CancellationToken cancellationToken)
    {
        var voucher = id is null ? new Voucher() : await _db.Vouchers.FirstOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw new ApiException(404, "Voucher not found.");
        if (id is null) _db.Vouchers.Add(voucher);
        voucher.Code = request.Code.Trim().ToUpperInvariant();
        voucher.DiscountType = request.DiscountType == DiscountTypes.Percent ? DiscountTypes.Percent : DiscountTypes.Fixed;
        voucher.DiscountValue = request.DiscountValue;
        voucher.MinOrderAmount = request.MinOrderAmount;
        voucher.MaxDiscount = request.MaxDiscount;
        voucher.StartsAt = request.StartsAt;
        voucher.EndsAt = request.EndsAt;
        voucher.UsageLimit = request.UsageLimit;
        voucher.IsActive = request.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var voucher = await _db.Vouchers.FirstOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw new ApiException(404, "Voucher not found.");
        if (voucher.UsedCount > 0)
        {
            voucher.IsActive = false;
        }
        else
        {
            _db.Vouchers.Remove(voucher);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public Task<DashboardDto> GetAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken)
    {
        return ReportAsync(new ReportQuery { From = from, To = to }, cancellationToken);
    }

    public async Task<DashboardDto> ReportAsync(ReportQuery query, CancellationToken cancellationToken)
    {
        var from = query.From ?? DateTime.UtcNow.Date.AddDays(-29);
        var to = query.To ?? DateTime.UtcNow.Date.AddDays(1);
        var orders = _db.Orders.AsNoTracking().Include(order => order.Items).ThenInclude(item => item.Variant).ThenInclude(variant => variant!.Product).ThenInclude(product => product.Brand)
            .Include(order => order.Items).ThenInclude(item => item.Variant).ThenInclude(variant => variant!.Product).ThenInclude(product => product.Categories).ThenInclude(link => link.Category)
            .Where(order => order.CreatedAt >= from && order.CreatedAt < to);
        if (!string.IsNullOrWhiteSpace(query.Status)) orders = orders.Where(order => order.Status == query.Status);
        var list = await orders.ToListAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(query.Brand))
        {
            list = list.Where(order => order.Items.Any(item => item.BrandName == query.Brand)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            list = list.Where(order => order.Items.Any(item => item.Variant?.Product.Categories.Any(link => link.Category.Name == query.Category || link.Category.Slug == query.Category) == true)).ToList();
        }

        var revenueOrders = list.Where(order => OrderStatuses.CountsAsRevenue(order.Status)).ToList();
        var low = await _db.ProductVariants.AsNoTracking()
            .Include(variant => variant.Product).ThenInclude(product => product.Images)
            .Include(variant => variant.Product).ThenInclude(product => product.Categories).ThenInclude(link => link.Category)
            .Where(variant => variant.IsActive && variant.StockQuantity <= StoreRules.LowStockThreshold)
            .OrderBy(variant => variant.StockQuantity)
            .Take(5)
            .ToListAsync(cancellationToken);

        return new DashboardDto
        {
            Revenue = revenueOrders.Sum(order => order.Total),
            Orders = list.Count,
            Customers = await _db.Users.CountAsync(cancellationToken),
            LowStock = await _db.ProductVariants.CountAsync(variant => variant.IsActive && variant.StockQuantity <= StoreRules.LowStockThreshold, cancellationToken),
            Trend = Enumerable.Range(0, Math.Max(1, (to.Date - from.Date).Days)).Select(offset => from.Date.AddDays(offset)).Select(day => new TrendPoint
            {
                Date = day.ToString("yyyy-MM-dd"),
                Revenue = revenueOrders.Where(order => order.CreatedAt.Date == day).Sum(order => order.Total),
                Orders = list.Count(order => order.CreatedAt.Date == day)
            }).ToList(),
            RevenueByBrand = revenueOrders.SelectMany(order => order.Items).GroupBy(item => item.BrandName)
                .Select(group => new SharePoint { Name = group.Key, Revenue = group.Sum(item => item.LineTotal) })
                .OrderByDescending(point => point.Revenue).Take(6).ToList(),
            RecentOrders = list.OrderByDescending(order => order.CreatedAt).Take(5).Select(order => CheckoutService.Map(order, [])).ToList(),
            LowStockProducts = low.Select(variant => new LowStockRow
            {
                Name = variant.Product.Name,
                Category = variant.Product.Categories.Select(link => link.Category.Name).FirstOrDefault() ?? "",
                ImageUrl = variant.Product.Images.Select(image => image.Url).FirstOrDefault() ?? "",
                Stock = variant.StockQuantity
            }).ToList(),
            TopProducts = revenueOrders.SelectMany(order => order.Items).GroupBy(item => item.ProductName)
                .Select(group => new TopProductRow
                {
                    Name = group.Key,
                    ImageUrl = group.Select(item => item.ImageUrl).FirstOrDefault(url => !string.IsNullOrWhiteSpace(url)) ?? "",
                    Price = group.First().UnitPrice,
                    Sold = group.Sum(item => item.Quantity),
                    Revenue = group.Sum(item => item.LineTotal)
                })
                .OrderByDescending(row => row.Sold).Take(5).ToList()
        };
    }
}

public sealed class ContentService : IContentService
{
    private readonly AppDbContext _db;

    public ContentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ContentPageDto?> GetAsync(string slug, CancellationToken cancellationToken)
    {
        return await _db.ContentPages.AsNoTracking().Where(page => page.Slug == slug)
            .Select(page => new ContentPageDto { Slug = page.Slug, Title = page.Title, Body = page.Body })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContentPageDto>> ListAsync(CancellationToken cancellationToken)
    {
        return await _db.ContentPages.AsNoTracking().OrderBy(page => page.Title)
            .Select(page => new ContentPageDto { Slug = page.Slug, Title = page.Title, Body = page.Body })
            .ToListAsync(cancellationToken);
    }

    public async Task SaveMessageAsync(ContactWrite request, CancellationToken cancellationToken)
    {
        _db.ContactMessages.Add(new Domain.Content.ContactMessage
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Topic = request.Topic.Trim(),
            Message = request.Message.Trim(),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
    }
}
