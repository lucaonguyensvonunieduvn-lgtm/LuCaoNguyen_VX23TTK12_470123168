using FluentValidation;
using LaptopStore.Application;
using LaptopStore.Application.Auth;
using LaptopStore.Application.Catalog;
using LaptopStore.Application.Commerce;
using LaptopStore.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LaptopStore.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IValidator<RegisterRequest> _register;
    private readonly IValidator<LoginRequest> _login;
    private readonly IValidator<ForgotPasswordRequest> _forgot;
    private readonly IValidator<ResetPasswordRequest> _reset;

    public AuthController(IAuthService auth, IValidator<RegisterRequest> register, IValidator<LoginRequest> login, IValidator<ForgotPasswordRequest> forgot, IValidator<ResetPasswordRequest> reset)
    {
        _auth = auth;
        _register = register;
        _login = login;
        _forgot = forgot;
        _reset = reset;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var validation = await _register.ValidateAsync(request, cancellationToken);
        return validation.IsValid ? ApiResults.FromAuth(await _auth.RegisterAsync(request, cancellationToken)) : ApiResults.Invalid("Check the registration form.", validation);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var validation = await _login.ValidateAsync(request, cancellationToken);
        return validation.IsValid ? ApiResults.FromAuth(await _auth.LoginAsync(request, cancellationToken)) : ApiResults.Invalid("Check the login form.", validation);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> Forgot(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var validation = await _forgot.ValidateAsync(request, cancellationToken);
        return validation.IsValid ? Ok(await _auth.ForgotPasswordAsync(request, cancellationToken)) : ApiResults.Invalid("Enter a valid email.", validation);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> Reset(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var validation = await _reset.ValidateAsync(request, cancellationToken);
        return validation.IsValid ? ApiResults.FromAuth(await _auth.ResetPasswordAsync(request, cancellationToken)) : ApiResults.Invalid("Check the new password.", validation);
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => NoContent();

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.UserId();
        if (userId is null) return Unauthorized(new { message = "Please log in." });
        var user = await _auth.GetCurrentUserAsync(userId, cancellationToken);
        return user is null ? Unauthorized(new { message = "Account not found." }) : Ok(user);
    }
}

[ApiController]
[Route("api")]
public class CatalogController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public CatalogController(ICatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("home")]
    public Task<HomeDto> Home(CancellationToken cancellationToken) => _catalog.GetHomeAsync(cancellationToken);

    [HttpGet("brands")]
    public Task<IReadOnlyList<BrandDto>> Brands(CancellationToken cancellationToken) => _catalog.GetBrandsAsync(cancellationToken);

    [HttpGet("offers")]
    public Task<IReadOnlyList<OfferDto>> Offers(CancellationToken cancellationToken) => _catalog.GetOffersAsync(cancellationToken);

    [HttpGet("categories")]
    public Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken cancellationToken) => _catalog.GetCategoriesAsync(cancellationToken);

    [HttpGet("filters")]
    public Task<CatalogFiltersDto> Filters(CancellationToken cancellationToken) => _catalog.GetFiltersAsync(cancellationToken);

    [HttpGet("products")]
    public Task<PagedResult<ProductCardDto>> Products([FromQuery] ProductQuery query, CancellationToken cancellationToken) => _catalog.GetProductsAsync(query, cancellationToken);

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> Product(string slug, CancellationToken cancellationToken)
    {
        var product = await _catalog.GetProductAsync(slug, User.UserId(), cancellationToken);
        return product is null ? NotFound(new { message = "Laptop not found." }) : Ok(product);
    }
}

[ApiController]
[Route("api/cart")]
public class CartController : ControllerBase
{
    private readonly ICartService _cart;

    public CartController(ICartService cart)
    {
        _cart = cart;
    }

    [HttpPost("quote")]
    public Task<CartDto> Quote(QuoteRequest request, CancellationToken cancellationToken) => _cart.QuoteAsync(request, cancellationToken);

    [Authorize]
    [HttpGet]
    public Task<CartDto> Get(CancellationToken cancellationToken) => _cart.GetAsync(RequiredUser(), cancellationToken);

    [Authorize]
    [HttpPost("items")]
    public Task<CartDto> Add(CartChangeRequest request, CancellationToken cancellationToken) => _cart.AddAsync(RequiredUser(), request, cancellationToken);

    [Authorize]
    [HttpPut("items/{id:int}")]
    public Task<CartDto> Update(int id, CartChangeRequest request, CancellationToken cancellationToken) => _cart.UpdateAsync(RequiredUser(), id, request.Quantity, cancellationToken);

    [Authorize]
    [HttpDelete("items/{id:int}")]
    public Task<CartDto> Remove(int id, CancellationToken cancellationToken) => _cart.RemoveAsync(RequiredUser(), id, cancellationToken);

    [Authorize]
    [HttpPost("merge")]
    public Task<CartDto> Merge(QuoteRequest request, CancellationToken cancellationToken) => _cart.MergeAsync(RequiredUser(), request, cancellationToken);

    [Authorize]
    [HttpPost("voucher")]
    public Task<CartDto> Voucher(VoucherRequest request, CancellationToken cancellationToken) => _cart.ApplyVoucherAsync(RequiredUser(), request.Code, cancellationToken);

    private string RequiredUser() => User.UserId() ?? throw new ApiException(401, "Please log in.");
}

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly ICheckoutService _checkout;
    private readonly IValidator<PlaceOrderRequest> _validator;

    public OrdersController(ICheckoutService checkout, IValidator<PlaceOrderRequest> validator)
    {
        _checkout = checkout;
        _validator = validator;
    }

    [HttpPost]
    public async Task<IActionResult> Place(PlaceOrderRequest request, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return ApiResults.Invalid("Check the checkout form.", validation);
        return Ok(await _checkout.PlaceAsync(User.UserId()!, request, cancellationToken));
    }

    [HttpGet]
    public Task<IReadOnlyList<OrderDto>> Mine([FromQuery] string? status, CancellationToken cancellationToken) => _checkout.ListMineAsync(User.UserId()!, status, cancellationToken);

    [HttpGet("{code}")]
    public async Task<IActionResult> Detail(string code, CancellationToken cancellationToken)
    {
        var order = await _checkout.GetMineAsync(User.UserId()!, code, cancellationToken);
        return order is null ? NotFound(new { message = "Order not found." }) : Ok(order);
    }

    [HttpPost("{code}/cancel")]
    public Task<OrderDto> Cancel(string code, CancellationToken cancellationToken) => _checkout.CancelMineAsync(User.UserId()!, code, cancellationToken);
}
