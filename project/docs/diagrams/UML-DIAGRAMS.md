# ELECTRO-POS — UML Diagrams

These diagrams document the current architecture and core flows of ELECTRO-POS
as of commit `833b2cb` (2026-09-08). They are generated directly from the
Supabase schema (`supabase/migrations/`) and the client application
(`src/lib`, `src/pages`) — nothing here is speculative.

They render natively on GitHub (Mermaid support). To view or edit them
elsewhere, paste a block into the [Mermaid Live Editor](https://mermaid.live).

## Contents

1. [Class Diagram — Domain Model](#class-diagram--domain-model)
2. [Sequence Diagram — In-Store Checkout (POS)](#sequence-diagram--in-store-checkout-pos)
3. [Sequence Diagram — Online Self-Checkout (Customer Store)](#sequence-diagram--online-self-checkout-customer-store)
4. [Sequence Diagram — Authentication](#sequence-diagram--authentication)

---

## Class Diagram — Domain Model

Reflects the five Postgres tables (`categories`, `products`, `customers`,
`sales`, `sale_items`) and the client-side types in `src/lib/supabase.ts`,
plus the two service classes every page goes through: the Supabase client
facade and the auth service exposed by `AuthProvider`/`useAuth`.

```mermaid
classDiagram
    class Category {
        +string id
        +string name
        +string description
        +datetime created_at
        +string created_by
    }

    class Product {
        +string id
        +string name
        +string sku
        +string barcode
        +number price
        +number cost
        +number stock
        +number min_stock
        +string category_id
        +string image_url
        +boolean is_active
        +datetime created_at
        +datetime updated_at
    }

    class Customer {
        +string id
        +string name
        +string email
        +string phone
        +string address
        +number loyalty_points
        +string notes
        +datetime created_at
    }

    class Sale {
        +string id
        +number subtotal
        +number tax_amount
        +number discount_amount
        +number total
        +string payment_method
        +number amount_paid
        +number amount_due
        +number change_due
        +string customer_id
        +string cashier_id
        +string status
        +string payment_status
        +string sale_type
        +boolean is_online_order
        +string delivery_method
        +number delivery_fee
        +string note
        +datetime created_at
    }

    class SaleItem {
        +string id
        +string sale_id
        +string product_id
        +string product_name
        +number quantity
        +number unit_price
        +number line_total
    }

    class CartItem {
        <<client-only>>
        +Product product
        +number quantity
    }

    class SupabaseClient {
        <<facade>>
        +from(table) QueryBuilder
        +auth AuthGoTrueClient
    }

    class AuthService {
        <<AuthProvider / useAuth>>
        +session Session
        +user User
        +signIn(email, password) Promise
        +signUp(email, password, role) Promise
        +signOut() Promise
    }

    Category "1" --> "0..*" Product : categorizes
    Customer "1" --> "0..*" Sale : places
    Sale "1" --> "1..*" SaleItem : contains
    Product "1" --> "0..*" SaleItem : sold as
    Product "1" --> "0..1" CartItem : held in cart as
    AuthService ..> SupabaseClient : wraps supabase.auth
    Sale ..> SupabaseClient : persisted via
    SaleItem ..> SupabaseClient : persisted via
    SaleItem ..> Product : decrements stock on insert (DB trigger)
```

**Notes**

- `created_by` (categories/products/customers) and `cashier_id` (sales)
  default to `auth.uid()` in Postgres — every row is attributed to the
  authenticated staff member who created it.
- `SaleItem → Product` is more than a foreign key: a Postgres trigger
  (`decrement_stock`) fires `AFTER INSERT ON sale_items` and atomically
  decrements `products.stock`, raising an exception if stock would go
  negative. A matching `restore_stock` trigger runs `AFTER DELETE` to undo it.
- `CartItem` only exists in the browser (`POSPage` / `CustomerStorePage`
  component state) — it's never persisted as its own table.

---

## Sequence Diagram — In-Store Checkout (POS)

The cashier-facing flow in `src/pages/POSPage.tsx` (`completeSale`).

```mermaid
sequenceDiagram
    actor Cashier
    participant POS as POSPage (UI)
    participant SB as Supabase Client
    participant DB as Postgres (sales / sale_items)

    Cashier->>POS: Search / tap products
    POS->>POS: addToCart() / updateQty()
    Cashier->>POS: Click "Checkout"
    POS->>Cashier: Show sale type, delivery, payment options
    Cashier->>POS: Choose payment method, enter amount received
    POS->>POS: Compute subtotal, discount, tax, total, amountDue, changeDue
    Cashier->>POS: Click "Complete Sale"
    POS->>POS: completeSale(): check each cart line against product.stock

    alt cart quantity exceeds stock
        POS-->>Cashier: Show "Not enough stock for X" error
    else stock is sufficient
        POS->>SB: insert sales row (totals, payment_method, sale_type, ...)
        SB->>DB: INSERT INTO sales
        DB-->>SB: sale (id, created_at)
        SB-->>POS: sale

        POS->>SB: insert sale_items (one row per cart line)
        SB->>DB: INSERT INTO sale_items
        DB->>DB: trigger decrement_stock() per row

        alt insert fails (e.g. stock raced to zero)
            DB-->>SB: error
            SB-->>POS: itemsError
            POS->>SB: delete sales row (rollback header)
            SB->>DB: DELETE FROM sales WHERE id
            POS-->>Cashier: Show error message
        else success
            DB-->>SB: sale_items rows
            SB-->>POS: success
            POS->>POS: Build receipt, clear cart
            POS->>SB: reload products / categories / customers
            POS-->>Cashier: Show receipt modal (print / new sale)
        end
    end
```

---

## Sequence Diagram — Online Self-Checkout (Customer Store)

The shopper-facing flow in `src/pages/CustomerStorePage.tsx`, used when a
signed-up `customer`-role account (or the "Customer View" toggle) places an
order for pickup or delivery.

```mermaid
sequenceDiagram
    actor Customer
    participant Store as CustomerStorePage (UI)
    participant SB as Supabase Client
    participant DB as Postgres

    Customer->>Store: Browse in-stock products, add to cart
    Customer->>Store: Open checkout, enter name / phone / address, delivery + payment method
    Customer->>Store: Submit order
    Store->>Store: Validate required fields (name, phone, address if delivery)

    Store->>SB: select customers where phone = entered phone
    SB->>DB: SELECT * FROM customers WHERE phone = ...
    DB-->>SB: existing row, or none

    alt customer already exists
        Store->>SB: update customers (name, address)
        SB->>DB: UPDATE customers
    else new customer
        Store->>SB: insert customers (name, phone, address)
        SB->>DB: INSERT INTO customers
        DB-->>SB: new customer id
    end

    Store->>SB: insert sales (sale_type='online', is_online_order=true, ...)
    SB->>DB: INSERT INTO sales
    DB-->>SB: sale

    Store->>SB: insert sale_items
    SB->>DB: INSERT INTO sale_items
    DB->>DB: trigger decrement_stock()

    alt insert fails
        DB-->>SB: error
        SB-->>Store: itemsError
        Store->>SB: delete sales row (rollback header)
        SB->>DB: DELETE FROM sales WHERE id
        Store-->>Customer: Show error message
    else success
        SB-->>Store: success
        Store->>Store: Clear cart, show confirmation
        Store->>SB: reload products
        Store-->>Customer: "Order #ABCD1234 placed successfully"
    end
```

Note the difference from the POS flow: a walk-in cashier sale already knows
the customer (or leaves it as "Walk-in"), while an online order has to
find-or-create the `customers` row from the phone number first, since the
shopper isn't picked from an existing list.

---

## Sequence Diagram — Authentication

`src/lib/auth.tsx` (`AuthProvider`) wraps Supabase Auth and gates the whole
app in `App.tsx`: no `session` → `LoginPage`; `role === 'customer'` →
`CustomerStorePage`; otherwise the admin `Layout` with POS/Products/etc.

```mermaid
sequenceDiagram
    actor User
    participant Login as LoginPage
    participant Auth as AuthProvider (useAuth)
    participant SB as Supabase Auth
    participant App as App.tsx

    User->>Login: Enter email + password, choose Sign In / Sign Up
    alt Sign Up
        Login->>Auth: signUp(email, password, role)
        Auth->>SB: auth.signUp({ email, password, options: { data: { role } } })
        SB-->>Auth: user created (or error)
        Auth-->>Login: { error }
        Login->>Login: Switch to Sign In mode, show "Account created"
    else Sign In
        Login->>Auth: signIn(email, password)
        Auth->>SB: auth.signInWithPassword({ email, password })
        SB-->>Auth: session (or error)
        Auth-->>Login: { error }
    end

    SB-->>Auth: onAuthStateChange(session)
    Auth->>Auth: setSession / setUser
    Auth-->>App: session, user (via context)

    alt no session
        App->>User: Render LoginPage
    else user_metadata.role === 'customer'
        App->>User: Render CustomerStorePage
    else staff account
        App->>User: Render admin Layout (Dashboard / POS / Products / Customers / Sales)
    end
```
