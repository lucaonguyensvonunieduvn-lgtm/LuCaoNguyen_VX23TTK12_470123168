using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LaptopStore.Application.Auth;
using LaptopStore.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LaptopStore.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly JwtSettings _jwt;
    private readonly FrontendSettings _frontend;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles,
        SignInManager<ApplicationUser> signIn,
        IOptions<JwtSettings> jwt,
        IOptions<FrontendSettings> frontend,
        ILogger<AuthService> logger)
    {
        _users = users;
        _roles = roles;
        _signIn = signIn;
        _jwt = jwt.Value;
        _frontend = frontend.Value;
        _logger = logger;
    }

    public async Task<AuthOutcome> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var email = request.Email.Trim();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return AuthOutcome.Failure(400, "Could not create the account.", MapErrors(result));
        }

        if (!await _roles.RoleExistsAsync(AppRoles.Customer))
        {
            await _roles.CreateAsync(new IdentityRole(AppRoles.Customer));
        }

        await _users.AddToRoleAsync(user, AppRoles.Customer);
        return AuthOutcome.Success(await CreateSessionAsync(user));
    }

    public async Task<AuthOutcome> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return AuthOutcome.Failure(401, "Email or password is incorrect.");
        }

        var signIn = await _signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (signIn.IsLockedOut)
        {
            return AuthOutcome.Failure(401, "This account is locked. Try again later.");
        }

        if (!signIn.Succeeded)
        {
            return AuthOutcome.Failure(401, "Email or password is incorrect.");
        }

        return AuthOutcome.Success(await CreateSessionAsync(user));
    }

    public async Task<AuthSession?> GetCurrentUserAsync(string userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _users.FindByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return null;
        }

        var roles = await _users.GetRolesAsync(user);
        return new AuthSession { Email = user.Email, FullName = user.FullName, Roles = roles.ToArray() };
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        const string message = "If this email is registered, the reset link appears below. This demo does not send email.";
        var user = await _users.FindByEmailAsync(request.Email.Trim());
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return new ForgotPasswordResponse { Message = message };
        }

        var token = await _users.GeneratePasswordResetTokenAsync(user);
        var resetUrl = $"{_frontend.Url.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";
        _logger.LogInformation("Password reset link for {Email}: {ResetUrl}", user.Email, resetUrl);
        return new ForgotPasswordResponse { Message = message, ResetUrl = resetUrl };
    }

    public async Task<AuthOutcome> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return AuthOutcome.Failure(400, "This reset link is no longer valid.");
        }

        var result = await _users.ResetPasswordAsync(user, request.Token, request.Password);
        if (!result.Succeeded)
        {
            return AuthOutcome.Failure(400, "Could not reset the password.", MapErrors(result));
        }

        return AuthOutcome.SuccessMessage("Password updated. You can log in.");
    }

    private async Task<AuthSession> CreateSessionAsync(ApplicationUser user)
    {
        var roles = await _users.GetRolesAsync(user);
        return new AuthSession
        {
            Token = CreateToken(user, roles),
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles.ToArray()
        };
    }

    private string CreateToken(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("fullName", user.FullName)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_jwt.ExpiresHours),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static Dictionary<string, string[]> MapErrors(IdentityResult result)
    {
        return result.Errors
            .GroupBy(error => error.Code is "DuplicateUserName" or "DuplicateEmail" ? "email" : "password")
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Code switch
                {
                    "DuplicateUserName" or "DuplicateEmail" => "This email is already registered.",
                    "PasswordTooShort" => "Use at least 8 characters.",
                    "PasswordRequiresDigit" => "Include a number.",
                    "PasswordRequiresLower" => "Include a lowercase letter.",
                    "PasswordRequiresUpper" => "Include an uppercase letter.",
                    "PasswordRequiresNonAlphanumeric" => "Include a symbol.",
                    _ => "Check the account details and try again."
                }).Distinct().ToArray());
    }
}
