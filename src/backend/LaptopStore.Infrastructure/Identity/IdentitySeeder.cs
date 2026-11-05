using LaptopStore.Application.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LaptopStore.Infrastructure.Identity;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("IdentitySeed");
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var role in AppRoles.All)
        {
            if (!await roles.RoleExistsAsync(role))
            {
                await roles.CreateAsync(new IdentityRole(role));
            }
        }

        await EnsureAsync(users, "admin@laptopstore.local", "Admin@123", "Admin", AppRoles.Admin);
        await EnsureAsync(users, "customer@laptopstore.local", "Customer@123", "Alex Johnson", AppRoles.Customer);
        await EnsureAsync(users, "sarah.chen@laptopstore.local", "Customer@123", "Sarah Chen", AppRoles.Customer);
        await EnsureAsync(users, "michael.brown@laptopstore.local", "Customer@123", "Michael Brown", AppRoles.Customer);
        logger.LogInformation("Demo accounts are ready.");
    }

    private static async Task EnsureAsync(UserManager<ApplicationUser> users, string email, string password, string fullName, string role)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = fullName,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow
            };
            var result = await users.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"Could not seed {email}: {string.Join(", ", result.Errors.Select(error => error.Description))}");
            }
        }

        if (!await users.IsInRoleAsync(user, role))
        {
            await users.AddToRoleAsync(user, role);
        }
    }
}
