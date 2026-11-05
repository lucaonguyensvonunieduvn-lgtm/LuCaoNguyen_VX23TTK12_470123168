using FluentValidation;
using LaptopStore.Application.Admin;
using LaptopStore.Application.Auth;
using LaptopStore.Application.Commerce;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LaptopStore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly IAccountService _account;

    public AccountController(IAccountService account)
    {
        _account = account;
    }

    [HttpGet]
    public Task<ProfileDto> Profile(CancellationToken cancellationToken) => _account.GetProfileAsync(User.UserId()!, cancellationToken);

    [HttpPut]
    public Task<ProfileDto> Update(UpdateProfileRequest request, CancellationToken cancellationToken) => _account.UpdateProfileAsync(User.UserId()!, request, cancellationToken);

    [HttpPost("password")]
    public async Task<IActionResult> Password(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await _account.ChangePasswordAsync(User.UserId()!, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("addresses")]
    public Task<IReadOnlyList<AddressDto>> Addresses(CancellationToken cancellationToken) => _account.GetAddressesAsync(User.UserId()!, cancellationToken);

    [HttpPost("addresses")]
    public Task<AddressDto> SaveAddress(AddressDto request, CancellationToken cancellationToken) => _account.SaveAddressAsync(User.UserId()!, request, cancellationToken);

    [HttpDelete("addresses/{id:int}")]
    public async Task<IActionResult> DeleteAddress(int id, CancellationToken cancellationToken)
    {
        await _account.DeleteAddressAsync(User.UserId()!, id, cancellationToken);
        return NoContent();
    }

    [HttpGet("wishlist")]
    public Task<IReadOnlyList<Application.Catalog.ProductCardDto>> Wishlist(CancellationToken cancellationToken) => _account.GetWishlistAsync(User.UserId()!, cancellationToken);

    [HttpPost("wishlist/{productId:int}")]
    public async Task<IActionResult> AddWish(int productId, CancellationToken cancellationToken)
    {
        await _account.AddWishlistAsync(User.UserId()!, productId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("wishlist/{productId:int}")]
    public async Task<IActionResult> RemoveWish(int productId, CancellationToken cancellationToken)
    {
        await _account.RemoveWishlistAsync(User.UserId()!, productId, cancellationToken);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/products/{slug}/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;

    public ReviewsController(IReviewService reviews)
    {
        _reviews = reviews;
    }

    [HttpPost]
    public Task<Application.Catalog.ReviewDto> Create(string slug, CreateReviewRequest request, CancellationToken cancellationToken)
        => _reviews.CreateAsync(User.UserId()!, slug, request, cancellationToken);
}

[ApiController]
[Route("api/pages")]
public class ContentController : ControllerBase
{
    private readonly IContentService _content;
    private readonly IValidator<ContactWrite> _validator;

    public ContentController(IContentService content, IValidator<ContactWrite> validator)
    {
        _content = content;
        _validator = validator;
    }

    [HttpGet]
    public Task<IReadOnlyList<ContentPageDto>> List(CancellationToken cancellationToken) => _content.ListAsync(cancellationToken);

    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug, CancellationToken cancellationToken)
    {
        var page = await _content.GetAsync(slug, cancellationToken);
        return page is null ? NotFound(new { message = "Page not found." }) : Ok(page);
    }

    [HttpPost("contact")]
    public async Task<IActionResult> Contact(ContactWrite request, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return ApiResults.Invalid("Check the message.", validation);
        await _content.SaveMessageAsync(request, cancellationToken);
        return Ok(new { message = "Đã nhận tin. Cửa hàng lưu lại để xem. Website chưa gửi email." });
    }
}

[ApiController]
[Authorize(Roles = AppRoles.Admin)]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminCatalogService _catalog;
    private readonly IAdminOrderService _orders;
    private readonly IAdminCustomerService _customers;
    private readonly IAdminVoucherService _vouchers;
    private readonly IDashboardService _dashboard;
    private readonly IReviewService _reviews;

    public AdminController(IAdminCatalogService catalog, IAdminOrderService orders, IAdminCustomerService customers, IAdminVoucherService vouchers, IDashboardService dashboard, IReviewService reviews)
    {
        _catalog = catalog;
        _orders = orders;
        _customers = customers;
        _vouchers = vouchers;
        _dashboard = dashboard;
        _reviews = reviews;
    }

    [HttpGet("access")]
    public IActionResult Access() => Ok(new { role = AppRoles.Admin });

    [HttpGet("stats")]
    public Task<AdminStatsDto> Stats(CancellationToken cancellationToken) => _catalog.StatsAsync(cancellationToken);

    [HttpGet("products")]
    public Task<Application.PagedResult<AdminProductRow>> Products([FromQuery] string? search, [FromQuery] string? brand, [FromQuery] string? category, [FromQuery] string? status, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
        => _catalog.ProductsAsync(search, brand, category, status, page, cancellationToken);

    [HttpGet("products/{id:int}")]
    public Task<ProductWriteRequest> Product(int id, CancellationToken cancellationToken) => _catalog.GetProductAsync(id, cancellationToken);

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct(ProductWriteRequest request, CancellationToken cancellationToken)
        => Ok(new { id = await _catalog.SaveProductAsync(null, request, cancellationToken) });

    [HttpPut("products/{id:int}")]
    public async Task<IActionResult> UpdateProduct(int id, ProductWriteRequest request, CancellationToken cancellationToken)
        => Ok(new { id = await _catalog.SaveProductAsync(id, request, cancellationToken) });

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        await _catalog.DeleteProductAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("brands")]
    public Task<IReadOnlyList<Application.Catalog.BrandDto>> Brands(CancellationToken cancellationToken) => _catalog.BrandsAsync(cancellationToken);

    [HttpPost("brands")]
    public async Task<IActionResult> CreateBrand(NameWriteRequest request, CancellationToken cancellationToken)
    {
        await _catalog.SaveBrandAsync(null, request, cancellationToken);
        return NoContent();
    }

    [HttpPut("brands/{id:int}")]
    public async Task<IActionResult> UpdateBrand(int id, NameWriteRequest request, CancellationToken cancellationToken)
    {
        await _catalog.SaveBrandAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("brands/{id:int}")]
    public async Task<IActionResult> DeleteBrand(int id, CancellationToken cancellationToken)
    {
        await _catalog.DeleteBrandAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("categories")]
    public Task<IReadOnlyList<Application.Catalog.CategoryDto>> Categories(CancellationToken cancellationToken) => _catalog.CategoriesAsync(cancellationToken);

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(NameWriteRequest request, CancellationToken cancellationToken)
    {
        await _catalog.SaveCategoryAsync(null, request, cancellationToken);
        return NoContent();
    }

    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, NameWriteRequest request, CancellationToken cancellationToken)
    {
        await _catalog.SaveCategoryAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken cancellationToken)
    {
        await _catalog.DeleteCategoryAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("attributes")]
    public Task<IReadOnlyList<SpecWrite>> Attributes(CancellationToken cancellationToken) => _catalog.AttributesAsync(cancellationToken);

    [HttpGet("orders/board")]
    public Task<OrderBoardDto> OrderBoard(CancellationToken cancellationToken) => _orders.BoardAsync(cancellationToken);

    [HttpGet("orders")]
    public Task<Application.PagedResult<OrderDto>> Orders([FromQuery] string? search, [FromQuery] string? status, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
        => _orders.ListAsync(search, status, from, to, page, pageSize, cancellationToken);

    [HttpGet("orders/{code}")]
    public async Task<IActionResult> Order(string code, CancellationToken cancellationToken)
    {
        var order = await _orders.GetAsync(code, cancellationToken);
        return order is null ? NotFound(new { message = "Order not found." }) : Ok(order);
    }

    [HttpPut("orders/{code}/status")]
    public Task<OrderDto> Status(string code, StatusChangeRequest request, CancellationToken cancellationToken) => _orders.UpdateStatusAsync(code, request.Status, cancellationToken);

    [HttpGet("customers")]
    public Task<IReadOnlyList<CustomerRow>> Customers([FromQuery] string? search, CancellationToken cancellationToken) => _customers.ListAsync(search, cancellationToken);

    [HttpPost("customers/{id}/lock")]
    public async Task<IActionResult> Lock(string id, CancellationToken cancellationToken)
    {
        await _customers.SetLockAsync(id, true, cancellationToken);
        return NoContent();
    }

    [HttpPost("customers/{id}/unlock")]
    public async Task<IActionResult> Unlock(string id, CancellationToken cancellationToken)
    {
        await _customers.SetLockAsync(id, false, cancellationToken);
        return NoContent();
    }

    [HttpGet("vouchers")]
    public Task<IReadOnlyList<VoucherDto>> Vouchers(CancellationToken cancellationToken) => _vouchers.ListAsync(cancellationToken);

    [HttpPost("vouchers")]
    public async Task<IActionResult> CreateVoucher(VoucherWriteRequest request, CancellationToken cancellationToken)
    {
        await _vouchers.SaveAsync(null, request, cancellationToken);
        return NoContent();
    }

    [HttpPut("vouchers/{id:int}")]
    public async Task<IActionResult> UpdateVoucher(int id, VoucherWriteRequest request, CancellationToken cancellationToken)
    {
        await _vouchers.SaveAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("vouchers/{id:int}")]
    public async Task<IActionResult> DeleteVoucher(int id, CancellationToken cancellationToken)
    {
        await _vouchers.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("reviews")]
    public Task<IReadOnlyList<AdminReviewRow>> Reviews(CancellationToken cancellationToken) => _reviews.ListAsync(cancellationToken);

    [HttpPut("reviews/{id:int}/visibility")]
    public async Task<IActionResult> ReviewVisibility(int id, ReviewVisibilityRequest request, CancellationToken cancellationToken)
    {
        await _reviews.SetVisibilityAsync(id, request.IsVisible, cancellationToken);
        return NoContent();
    }

    [HttpGet("dashboard")]
    public Task<DashboardDto> Dashboard([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken) => _dashboard.GetAsync(from, to, cancellationToken);

    [HttpGet("reports")]
    public Task<DashboardDto> Reports([FromQuery] ReportQuery query, CancellationToken cancellationToken) => _dashboard.ReportAsync(query, cancellationToken);

    [HttpPost("uploads")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0) return BadRequest(new { message = "Choose an image." });
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".svg"))
        {
            return BadRequest(new { message = "Use JPG, PNG, WEBP, or SVG." });
        }

        var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(folder);
        var name = $"{Guid.NewGuid():N}{extension}";
        await using var stream = System.IO.File.Create(Path.Combine(folder, name));
        await file.CopyToAsync(stream, cancellationToken);
        return Ok(new { url = $"/uploads/{name}" });
    }
}
