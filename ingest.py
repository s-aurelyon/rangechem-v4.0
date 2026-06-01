import json
import sqlite3
import os

DB_PATH = "rangechem_catalog.db"
JSON_PATH = "rangechem_catalog.json"

def main():
    print("--- Starting Rangechem Catalog Database Ingestion ---")
    
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found!")
        return

    # 1. Connect to SQLite (creates file if not exists)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 2. Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 3. Create schema
    print("Creating database schema...")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_path TEXT,
        category_id INTEGER NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        stock_code TEXT,
        size_packaging TEXT NOT NULL,
        price_rand REAL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # Tables for quote request management
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quote_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id INTEGER NOT NULL,
        product_id INTEGER,
        stock_code TEXT,
        size_packaging TEXT,
        price_rand REAL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );
    """)

    conn.commit()

    # 4. Read JSON data
    print("Reading rangechem_catalog.json...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 5. Populate tables
    print("Ingesting categories, products, and variants...")
    category_count = 0
    product_count = 0
    variant_count = 0

    for cat_data in data:
        cat_name = cat_data.get("category", "").strip().upper()
        if not cat_name:
            continue

        # Insert category
        try:
            cursor.execute("INSERT INTO categories (name) VALUES (?)", (cat_name,))
            category_id = cursor.lastrowid
            category_count += 1
        except sqlite3.IntegrityError:
            # If already exists, grab ID
            cursor.execute("SELECT id FROM categories WHERE name = ?", (cat_name,))
            category_id = cursor.fetchone()[0]

        products = cat_data.get("products", [])
        for prod_data in products:
            title = prod_data.get("title", "").strip()
            description = prod_data.get("description")
            if description:
                description = description.strip()
            image_path = prod_data.get("image_path")
            if image_path:
                image_path = image_path.strip()

            if not title:
                continue

            # Insert product
            cursor.execute("""
                INSERT INTO products (title, description, image_path, category_id)
                VALUES (?, ?, ?, ?)
            """, (title, description, image_path, category_id))
            product_id = cursor.lastrowid
            product_count += 1

            variants = prod_data.get("variants", [])
            if not isinstance(variants, list):
                continue
            for var_data in variants:
                if not isinstance(var_data, dict):
                    continue
                
                stock_code = var_data.get("stock_code")
                if stock_code is not None:
                    stock_code = str(stock_code).strip()
                
                size_packaging = var_data.get("size_packaging")
                if size_packaging is not None:
                    size_packaging = str(size_packaging).strip()
                else:
                    size_packaging = ""
                    
                price_rand = var_data.get("price_rand")

                # Parse price to float or None
                if price_rand is not None:
                    try:
                        price_rand = float(price_rand)
                    except ValueError:
                        price_rand = None

                if not size_packaging:
                    continue

                # Insert variant
                cursor.execute("""
                    INSERT INTO product_variants (product_id, stock_code, size_packaging, price_rand)
                    VALUES (?, ?, ?, ?)
                """, (product_id, stock_code, size_packaging, price_rand))
                variant_count += 1

    conn.commit()
    conn.close()

    print("\n--- Ingestion Completed Successfully! ---")
    print(f"Categories Ingested : {category_count}")
    print(f"Products Ingested   : {product_count}")
    print(f"Variants Ingested   : {variant_count}")
    print(f"Database saved to   : {DB_PATH}")

if __name__ == "__main__":
    main()
