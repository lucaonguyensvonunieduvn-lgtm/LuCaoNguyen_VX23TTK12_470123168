-- Convert seeded USD amounts to VND (x 25,000). Safe to run once.
IF (SELECT MAX(Price) FROM ProductVariants) < 100000
BEGIN
    UPDATE ProductVariants
    SET Price = Price * 25000,
        CompareAtPrice = CompareAtPrice * 25000;

    UPDATE OrderItems
    SET UnitPrice = UnitPrice * 25000,
        LineTotal = LineTotal * 25000
    WHERE UnitPrice < 100000;

    UPDATE Orders
    SET Subtotal = Subtotal * 25000,
        Discount = Discount * 25000,
        ShippingFee = ShippingFee * 25000,
        Total = Total * 25000
    WHERE Total < 1000000;

    UPDATE Vouchers
    SET DiscountValue = CASE WHEN DiscountType = 'Fixed' THEN DiscountValue * 25000 ELSE DiscountValue END,
        MinOrderAmount = MinOrderAmount * 25000,
        MaxDiscount = MaxDiscount * 25000
    WHERE (DiscountType = 'Fixed' AND DiscountValue < 100000)
       OR MinOrderAmount > 0 AND MinOrderAmount < 100000
       OR (MaxDiscount IS NOT NULL AND MaxDiscount < 100000);
END

SELECT TOP 3 Sku, Price, CompareAtPrice FROM ProductVariants ORDER BY Price;
SELECT Code, DiscountType, DiscountValue, MinOrderAmount, MaxDiscount FROM Vouchers;
