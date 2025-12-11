import { APIRequirements } from "../src/types.js";

export const ecommerceRequirements: APIRequirements = {
  description: "E-commerce API for an online store",
  endpoints: [
    "Product catalog with search and filtering",
    "Shopping cart management",
    "Checkout process",
    "Payment processing",
    "User authentication and profile management"
  ],
  features: [
    "JWT authentication",
    "Product variants (size, color)",
    "Inventory tracking",
    "Multiple payment methods",
    "Address management",
    "Price calculations with tax"
  ]
};