import { z } from "zod";

export const ShippingSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  phone: z.string().min(7).max(20),
  postalCode: z.string().min(1).max(20),
});

export const CartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  id: z.string().optional(),
  name: z.string(),
  price: z.number().nonnegative(),
  imageUrl: z.string(),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
}).refine(data => data.variantId || data.id, { message: 'Either variantId or id is required', path: ['variantId'] });

export const CheckoutSchema = z.object({
  shipping: ShippingSchema,
  cart: z.array(CartItemSchema).min(1),
  user: z.object({
    id: z.string(),
  }),
});
