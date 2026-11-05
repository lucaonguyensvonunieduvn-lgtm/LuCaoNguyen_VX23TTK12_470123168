using System.Security.Claims;
using FluentValidation.Results;
using LaptopStore.Application;
using LaptopStore.Application.Auth;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace LaptopStore.Api;

public static class ApiResults
{
    public static string? UserId(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.NameIdentifier);

    public static IActionResult FromAuth(AuthOutcome outcome)
    {
        if (!outcome.IsSuccess)
        {
            return new ObjectResult(new { message = outcome.Message, errors = outcome.Errors }) { StatusCode = outcome.StatusCode };
        }

        return outcome.Session is null ? new OkObjectResult(new { message = outcome.Message }) : new OkObjectResult(outcome.Session);
    }

    public static IActionResult Invalid(string message, ValidationResult validation)
    {
        return new BadRequestObjectResult(new
        {
            message,
            errors = validation.Errors.GroupBy(error => Field(error.PropertyName))
                .ToDictionary(group => group.Key, group => group.Select(error => error.ErrorMessage).ToArray())
        });
    }

    public static void UseApiErrors(this WebApplication app)
    {
        app.UseExceptionHandler(handler =>
        {
            handler.Run(async context =>
            {
                var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
                var status = error is ApiException api ? api.StatusCode : StatusCodes.Status500InternalServerError;
                var message = error is ApiException known ? known.Message : "Something went wrong. Please try again.";
                context.Response.StatusCode = status;
                await context.Response.WriteAsJsonAsync(new { message });
            });
        });
    }

    private static string Field(string propertyName)
    {
        if (string.IsNullOrWhiteSpace(propertyName)) return "form";
        var leaf = propertyName.Split('.').Last();
        return char.ToLowerInvariant(leaf[0]) + leaf[1..];
    }
}
