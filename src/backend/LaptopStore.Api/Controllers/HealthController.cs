using LaptopStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace LaptopStore.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var canConnect = await _db.Database.CanConnectAsync(cancellationToken);
        return Ok(new
        {
            status = "ok",
            database = canConnect ? "connected" : "unavailable"
        });
    }
}
