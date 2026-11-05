using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace LaptopStore.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<Auth.RegisterRequestValidator>();
        return services;
    }
}
