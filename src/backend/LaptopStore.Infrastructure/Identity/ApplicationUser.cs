using Microsoft.AspNetCore.Identity;

namespace LaptopStore.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
