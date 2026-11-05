using LaptopStore.Application;
using LaptopStore.Application.Catalog;
using LaptopStore.Application.Commerce;
using LaptopStore.Domain.Commerce;
using LaptopStore.Infrastructure.Identity;
using LaptopStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LaptopStore.Infrastructure.Commerce;

public sealed class ReviewService : IReviewService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public ReviewService(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    public async Task<ReviewDto> CreateAsync(string userId, string slug, CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var product = await _db.Products.FirstOrDefaultAsync(item => item.Slug == slug && item.IsActive, cancellationToken)
            ?? throw new ApiException(404, "Laptop not found.");
        var user = await _users.FindByIdAsync(userId) ?? throw new ApiException(401, "Please log in again.");
        var already = await _db.ProductReviews.AnyAsync(review => review.ProductId == product.Id && review.UserId == userId, cancellationToken);
        if (already)
        {
            throw new ApiException(400, "You already reviewed this laptop.");
        }

        var order = await _db.Orders.AsNoTracking()
            .Where(item => item.UserId == userId && item.Status == OrderStatuses.Delivered && item.Items.Any(line => line.ProductId == product.Id))
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ApiException(400, "You can review this laptop after a delivered order.");

        var review = new Domain.Catalog.ProductReview
        {
            ProductId = product.Id,
            UserId = userId,
            OrderId = order.Id,
            Rating = request.Rating,
            Comment = request.Comment.Trim(),
            AuthorName = user.FullName,
            IsVisible = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.ProductReviews.Add(review);
        await _db.SaveChangesAsync(cancellationToken);
        return new ReviewDto
        {
            Id = review.Id,
            AuthorName = review.AuthorName,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }

    public async Task<IReadOnlyList<AdminReviewRow>> ListAsync(CancellationToken cancellationToken)
    {
        return await _db.ProductReviews.AsNoTracking()
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new AdminReviewRow
            {
                Id = review.Id,
                ProductName = review.Product.Name,
                AuthorName = review.AuthorName,
                Rating = review.Rating,
                Comment = review.Comment,
                IsVisible = review.IsVisible,
                CreatedAt = review.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task SetVisibilityAsync(int id, bool isVisible, CancellationToken cancellationToken)
    {
        var review = await _db.ProductReviews.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiException(404, "Review not found.");
        review.IsVisible = isVisible;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
