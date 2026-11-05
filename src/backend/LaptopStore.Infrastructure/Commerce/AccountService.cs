using LaptopStore.Application;
using LaptopStore.Application.Catalog;
using LaptopStore.Application.Commerce;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Identity;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Commerce;

public sealed class AccountService : IAccountService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly ICatalogService _catalog;

    public AccountService(AppDbContext db, UserManager<ApplicationUser> users, ICatalogService catalog)
    {
        _db = db;
        _users = users;
        _catalog = catalog;
    }

    public async Task<ProfileDto> GetProfileAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await RequireAsync(userId);
        return await MapProfileAsync(user, cancellationToken);
    }

    public async Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await RequireAsync(userId);
        user.FullName = request.FullName.Trim();
        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new ApiException(400, "Could not update the profile.");
        }

        return await MapProfileAsync(user, cancellationToken);
    }

    public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await RequireAsync(userId);
        var result = await _users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new ApiException(400, "Current password is incorrect, or the new password does not meet the rules.");
        }
    }

    public async Task<IReadOnlyList<AddressDto>> GetAddressesAsync(string userId, CancellationToken cancellationToken)
    {
        var addresses = await _db.CustomerAddresses.AsNoTracking()
            .Where(address => address.UserId == userId)
            .OrderByDescending(address => address.IsDefault)
            .ToListAsync(cancellationToken);
        return addresses.Select(MapAddress).ToList();
    }

    public async Task<AddressDto> SaveAddressAsync(string userId, AddressDto request, CancellationToken cancellationToken)
    {
        CustomerAddress address;
        if (request.Id == 0)
        {
            address = new CustomerAddress { UserId = userId };
            _db.CustomerAddresses.Add(address);
        }
        else
        {
            address = await _db.CustomerAddresses.FirstOrDefaultAsync(item => item.Id == request.Id && item.UserId == userId, cancellationToken)
                ?? throw new ApiException(404, "Address not found.");
        }

        address.RecipientName = request.RecipientName.Trim();
        address.Phone = request.Phone.Trim();
        address.AddressLine1 = request.AddressLine1.Trim();
        address.AddressLine2 = string.IsNullOrWhiteSpace(request.AddressLine2) ? null : request.AddressLine2.Trim();
        address.City = request.City.Trim();
        address.State = request.State.Trim();
        address.PostalCode = request.PostalCode.Trim();
        address.Country = request.Country.Trim();
        address.IsDefault = request.IsDefault;
        if (address.IsDefault)
        {
            var others = await _db.CustomerAddresses.Where(item => item.UserId == userId && item.Id != address.Id).ToListAsync(cancellationToken);
            foreach (var other in others)
            {
                other.IsDefault = false;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return MapAddress(address);
    }

    public async Task DeleteAddressAsync(string userId, int id, CancellationToken cancellationToken)
    {
        var address = await _db.CustomerAddresses.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken)
            ?? throw new ApiException(404, "Address not found.");
        _db.CustomerAddresses.Remove(address);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProductCardDto>> GetWishlistAsync(string userId, CancellationToken cancellationToken)
    {
        var ids = await _db.WishlistItems.AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => item.ProductId)
            .ToListAsync(cancellationToken);
        return await _catalog.GetByIdsAsync(ids, cancellationToken);
    }

    public async Task AddWishlistAsync(string userId, int productId, CancellationToken cancellationToken)
    {
        var exists = await _db.Products.AnyAsync(product => product.Id == productId && product.IsActive, cancellationToken);
        if (!exists)
        {
            throw new ApiException(404, "Laptop not found.");
        }

        var already = await _db.WishlistItems.AnyAsync(item => item.UserId == userId && item.ProductId == productId, cancellationToken);
        if (!already)
        {
            _db.WishlistItems.Add(new WishlistItem { UserId = userId, ProductId = productId, CreatedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task RemoveWishlistAsync(string userId, int productId, CancellationToken cancellationToken)
    {
        var item = await _db.WishlistItems.FirstOrDefaultAsync(entry => entry.UserId == userId && entry.ProductId == productId, cancellationToken);
        if (item is not null)
        {
            _db.WishlistItems.Remove(item);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<ApplicationUser> RequireAsync(string userId)
    {
        return await _users.FindByIdAsync(userId) ?? throw new ApiException(401, "Please log in again.");
    }

    private async Task<ProfileDto> MapProfileAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        return new ProfileDto
        {
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            OrderCount = await _db.Orders.CountAsync(order => order.UserId == user.Id, cancellationToken),
            AddressCount = await _db.CustomerAddresses.CountAsync(address => address.UserId == user.Id, cancellationToken),
            WishlistCount = await _db.WishlistItems.CountAsync(item => item.UserId == user.Id, cancellationToken)
        };
    }

    private static AddressDto MapAddress(CustomerAddress address)
    {
        return new AddressDto
        {
            Id = address.Id,
            RecipientName = address.RecipientName,
            Phone = address.Phone,
            AddressLine1 = address.AddressLine1,
            AddressLine2 = address.AddressLine2,
            City = address.City,
            State = address.State,
            PostalCode = address.PostalCode,
            Country = address.Country,
            IsDefault = address.IsDefault
        };
    }
}
