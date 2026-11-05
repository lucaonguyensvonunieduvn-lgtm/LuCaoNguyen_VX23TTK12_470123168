namespace LaptopStore.Infrastructure.Auth;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int ExpiresHours { get; set; } = 12;
}

public sealed class FrontendSettings
{
    public const string SectionName = "Frontend";
    public string Url { get; set; } = "http://localhost:5174";
}
