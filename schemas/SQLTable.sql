-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users (Supabase Auth handles this — do NOT recreate)
-- Supabase manages the 'auth.users' table by default

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  status text check (status in ('collection', 'archive')) not null default 'collection',
  created_at timestamp with time zone default now()
);


-- Sizes table — Stock per size per product
create table if not exists sizes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  size text check (size in ('S', 'M', 'L', 'XL', 'XXL', 'XXXL')) not null,
  stock integer not null check (stock >= 0),
  unique (product_id, size)
);

-- Images table — 3 images per product
create table if not exists images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  image_url text not null,
  position integer check (position >= 1 and position <= 3), -- 1 = primary image
  unique (product_id, position)
);

-- Cart table — Each user's shopping cart
create table if not exists cart (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null, -- Supabase Auth UID
  product_id uuid references products(id) on delete cascade,
  size text check (size in ('S', 'M', 'L', 'XL', 'XXL', 'XXXL')) not null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default now(),
  unique (user_id, product_id, size)
);

-- Subscriptions table
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamp with time zone default now()
);

-- Orders table: stores each placed order, including shipping info, cart items, timestamp, and status.
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  shipping jsonb not null,
  items jsonb not null,
  created_at timestamp with time zone default now(),
  status text not null default 'pending'
);

-- Create an admins table linked to Supabase Auth users
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- To make a user an admin, insert their user ID from auth.users:
-- insert into admins (id) values ('<user-uuid>');

-- Create a profiles table to store extra user info
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  phone text not null,
  postalCode text not null,
  created_at timestamp with time zone default now()
);

-- Reload Supabase schema cache
NOTIFY pgrst, 'reload schema';



