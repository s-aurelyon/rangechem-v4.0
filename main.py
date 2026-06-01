from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import sqlite3
import os

app = FastAPI(
    title="Rangechem Catalog & Quoting API",
    description="Offline REST API backend for Rangechem Industrial Cleaning Solutions. Serves dynamic catalogs and logs quote requests into SQLite.",
    version="1.0.0"
)

DB_PATH = "rangechem_catalog.db"

# --- PYDANTIC SCHEMAS FOR VALIDATION ---

class CartItem(BaseModel):
    productId: int
    stockCode: Optional[str] = None
    size: str
    price: Optional[float] = None
    quantity: int

class QuoteRequest(BaseModel):
    name: str
    company: str
    email: EmailStr
    phone: Optional[str] = None
    message: Optional[str] = None
    cart: List[CartItem]

# --- DB HELPERS ---

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found. Run ingest.py first.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- API ENDPOINTS ---

@app.get("/api/products")
def get_products():
    """Fetches all products grouped by category with their variants (nested schema)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Grab all categories
    cursor.execute("SELECT id, name FROM categories ORDER BY name ASC")
    categories = [dict(row) for row in cursor.fetchall()]
    
    result = []
    for cat in categories:
        # 2. Grab products in this category
        cursor.execute("""
            SELECT id, title, description, image_path 
            FROM products 
            WHERE category_id = ?
            ORDER BY title ASC
        """, (cat['id'],))
        products = [dict(row) for row in cursor.fetchall()]
        
        # 3. Grab variants for each product
        for prod in products:
            cursor.execute("""
                SELECT id, stock_code, size_packaging, price_rand 
                FROM product_variants 
                WHERE product_id = ?
            """, (prod['id'],))
            prod['variants'] = [dict(row) for row in cursor.fetchall()]
            
        result.append({
            "category": cat['name'],
            "products": products
        })
        
    conn.close()
    return result

@app.get("/api/products/flat")
def get_flat_products():
    """Fetches a flat list of all products with their category names and variants"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.id, p.title, p.description, p.image_path, c.name as category 
        FROM products p
        JOIN categories c ON p.category_id = c.id
        ORDER BY p.title ASC
    """)
    products = [dict(row) for row in cursor.fetchall()]
    
    for prod in products:
        cursor.execute("""
            SELECT id, stock_code, size_packaging, price_rand 
            FROM product_variants 
            WHERE product_id = ?
        """, (prod['id'],))
        prod['variants'] = [dict(row) for row in cursor.fetchall()]
        
    conn.close()
    return products

@app.get("/api/categories")
def get_categories():
    """Fetches a list of all categories with their product counts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.id, c.name, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
    """)
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return categories

@app.post("/api/quote")
def create_quote(quote: QuoteRequest):
    """Submits a custom quote request, saving it directly to SQLite tables"""
    if not quote.cart:
        raise HTTPException(status_code=400, detail="Quote request cart cannot be empty.")

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Insert into quotes table
        cursor.execute("""
            INSERT INTO quotes (name, company, email, phone, message)
            VALUES (?, ?, ?, ?, ?)
        """, (quote.name, quote.company, quote.email, quote.phone, quote.message))
        quote_id = cursor.lastrowid
        
        # 2. Insert line items
        for item in quote.cart:
            cursor.execute("""
                INSERT INTO quote_items (quote_id, product_id, stock_code, size_packaging, price_rand, quantity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (quote_id, item.productId, item.stockCode, item.size, item.price, item.quantity))
            
        conn.commit()
        return {
            "status": "success",
            "message": "Quote request successfully recorded offline in database.",
            "quote_id": quote_id
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error while saving quote: {str(e)}")
    finally:
        conn.close()

@app.get("/api/quotes")
def list_quotes():
    """Lists all offline-logged quote requests with their respective item details (Swagger-friendly validation)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM quotes ORDER BY created_at DESC")
    quotes = [dict(row) for row in cursor.fetchall()]
    
    for q in quotes:
        cursor.execute("""
            SELECT qi.*, p.title as product_title 
            FROM quote_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.quote_id = ?
        """, (q['id'],))
        q['items'] = [dict(row) for row in cursor.fetchall()]
        
    conn.close()
    return quotes

# --- SERVE FRONNTEND STATIC FILES & HTML PAGES ---

# Mount asset directories
if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# Serve primary HTML files at explicit routes
@app.get("/")
def serve_homepage():
    return FileResponse("index.html")

@app.get("/index.html")
def serve_index():
    return FileResponse("index.html")

@app.get("/products.html")
def serve_products():
    return FileResponse("products.html")

@app.get("/categories.html")
def serve_categories():
    return FileResponse("categories.html")

@app.get("/category.html")
def serve_category():
    return FileResponse("category.html")

@app.get("/quote-request.html")
def serve_quote_request():
    return FileResponse("quote-request.html")

@app.get("/search_results.html")
def serve_search_results():
    return FileResponse("search_results.html")
