using FluentValidation;
using LaptopStore.Application.Admin;
using LaptopStore.Application.Commerce;

namespace LaptopStore.Application.Commerce;

public sealed class PlaceOrderRequestValidator : AbstractValidator<PlaceOrderRequest>
{
    public PlaceOrderRequestValidator()
    {
        RuleFor(request => request.FullName).NotEmpty().MaximumLength(120);
        RuleFor(request => request.Email).NotEmpty().EmailAddress();
        RuleFor(request => request.Phone).NotEmpty().MaximumLength(30);
        RuleFor(request => request.AddressLine1).NotEmpty().MaximumLength(200);
        RuleFor(request => request.City).NotEmpty().MaximumLength(80);
        RuleFor(request => request.State).NotEmpty().MaximumLength(80);
        RuleFor(request => request.PostalCode).NotEmpty().MaximumLength(20);
        RuleFor(request => request.Country).NotEmpty().MaximumLength(80);
    }
}

public sealed class ContactWriteValidator : AbstractValidator<ContactWrite>
{
    public ContactWriteValidator()
    {
        RuleFor(request => request.Name).NotEmpty().MaximumLength(120);
        RuleFor(request => request.Email).NotEmpty().EmailAddress();
        RuleFor(request => request.Topic).NotEmpty().MaximumLength(80);
        RuleFor(request => request.Message).NotEmpty().MaximumLength(4000);
    }
}
