using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LaptopStore.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task ApplyMigrationsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Database");
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            logger.LogInformation("Applying SQL Server migrations...");
            await db.Database.MigrateAsync();
            logger.LogInformation("SQL Server database is ready.");
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Could not create or update the SQL Server database. Check ConnectionStrings:DefaultConnection and make sure SQL Server is running.");
            throw;
        }
    }
}
