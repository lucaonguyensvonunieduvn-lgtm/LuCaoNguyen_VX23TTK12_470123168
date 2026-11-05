namespace LaptopStore.Application.Auth;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
    public static readonly string[] All = [Admin, Customer];
}

public sealed class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class ForgotPasswordResponse
{
    public string Message { get; set; } = string.Empty;
    public string? ResetUrl { get; set; }
}

public sealed class AuthSession
{
    public string? Token { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string[] Roles { get; set; } = [];
}

public sealed class AuthOutcome
{
    public bool IsSuccess { get; init; }
    public int StatusCode { get; init; }
    public string Message { get; init; } = string.Empty;
    public AuthSession? Session { get; init; }
    public Dictionary<string, string[]>? Errors { get; init; }

    public static AuthOutcome Success(AuthSession session) => new() { IsSuccess = true, StatusCode = 200, Session = session };
    public static AuthOutcome SuccessMessage(string message) => new() { IsSuccess = true, StatusCode = 200, Message = message };
    public static AuthOutcome Failure(int statusCode, string message, Dictionary<string, string[]>? errors = null) =>
        new() { IsSuccess = false, StatusCode = statusCode, Message = message, Errors = errors };
}

public interface IAuthService
{
    Task<AuthOutcome> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthOutcome> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthSession?> GetCurrentUserAsync(string userId, CancellationToken cancellationToken);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken);
    Task<AuthOutcome> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
}
