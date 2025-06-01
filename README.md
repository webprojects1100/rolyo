# ROLYO - Modern E-Commerce Store

Welcome to ROLYO, a full-stack e-commerce platform built with modern web technologies. This project aims to provide a seamless shopping experience for users and a manageable backend for administrators.

## Features

**For Customers:**
*   **Product Browsing & Discovery:**
    *   View a collection of products.
    *   Products displayed with name, description, price, and images.
    *   (Implied) Product categories or filtering (e.g., status 'collection', 'archive').
    *   (Implied) View product status (e.g., 'collection', 'archive').
*   **Product Details:**
    *   View detailed information for each product, including multiple images and available sizes.
    *   Stock information per size.
*   **Shopping Cart:**
    *   Add products (with specific sizes) to a persistent shopping cart.
    *   Adjust quantity of items in the cart.
    *   View cart summary.
*   **User Accounts & Authentication:**
    *   Secure user sign-up and login.
    *   Persistent user sessions.
    *   Account dashboard to view and manage profile information.
*   **Profile Management:**
    *   Update personal details: Name, Address, Phone Number, Postal Code.
    *   View email address (non-editable).
*   **Checkout Process:**
    *   Shipping information form, pre-filled with authenticated user's profile data.
    *   Ability to edit shipping information or link to account page to update profile before checkout.
    *   Order summary displayed during checkout.
    *   (Implied) Payment integration (though not explicitly built yet in our interactions).
*   **Order History:**
    *   View a list of past orders with details like order ID, date, and status.
*   **Email Subscriptions:**
    *   Users can subscribe with their email for newsletters or updates.

**For Administrators (Admin Dashboard):**
*   **(Implied by `admin/products` route & `isAdmin` util)** Secure admin section.
*   **Product Management:**
    *   (Implied) Create, view, update, and delete products.
    *   (Implied) Manage product details including name, description, price, status (collection/archive).
    *   (Implied) Manage product images (up to 3 per product, with a primary image).
    *   (Implied) Manage stock levels for different product sizes.
*   **(Implied) Order Management:**
    *   View and manage customer orders.
    *   Update order statuses (e.g., pending, shipped, delivered).
*   **(Implied) User Management:**
    *   View and manage users.
    *   Ability to designate users as administrators.

## Tech Stack

*   **Frontend:**
    *   [Next.js](https://nextjs.org/) - React framework for server-side rendering and static site generation.
    *   [React](https://reactjs.org/) - JavaScript library for building user interfaces.
    *   [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for rapid UI development.
    *   [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript.
*   **Backend & Database:**
    *   [Supabase](https://supabase.io/) - Open source Firebase alternative.
        *   PostgreSQL Database for data storage.
        *   Authentication for user management.
        *   (Implied) Storage for product images.
*   **State Management:**
    *   React Context API (e.g., `useCart` hook).
    *   React `useState` and `useEffect` hooks for component-level state and side effects.
*   **Deployment:**
    *   (Planned) [Vercel](https://vercel.com/) - For seamless deployment of Next.js applications.

## Getting Started

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm, yarn, or pnpm

### Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd my-store
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

3.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.io/).
    *   In your Supabase project, go to the SQL Editor and run the table creation scripts found in the project (or that you used to set up your database, e.g., the schema we've been working with).
    *   Find your Supabase Project URL and Anon Key in your Supabase project settings (Project Settings > API).

4.  **Environment Variables:**
    *   Create a `.env.local` file in the root of your `my-store` directory.
    *   Add your Supabase credentials to it:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
        ```
        Replace `your_supabase_project_url` and `your_supabase_anon_key` with your actual Supabase credentials.

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    # or
    # pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

(Optional: Add guidelines if you plan to have others contribute)

---

This README provides a good starting point. You can expand on any section as your project grows or as you implement more specific features.