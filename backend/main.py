from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3
import os
import uuid
import json
import urllib.parse

app = FastAPI(title="CarpetCRM", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/room_visuals", exist_ok=True)
os.makedirs("uploads/install_photos", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_db():
    conn = sqlite3.connect("carpetcrm.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        source TEXT,
        status TEXT DEFAULT 'lead',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_contact TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        price_per_sqm REAL,
        cost_per_sqm REAL,
        stock INTEGER DEFAULT 0,
        image TEXT,
        texture_image TEXT,
        description TEXT,
        active INTEGER DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        quote_token TEXT UNIQUE,
        room_name TEXT,
        room_width REAL,
        room_length REAL,
        area_sqm REAL,
        product_id INTEGER,
        product_price REAL,
        underlay_price REAL,
        fitting_price REAL,
        disposal_price REAL,
        extras_price REAL,
        total REAL,
        margin REAL,
        status TEXT DEFAULT 'draft',
        financing_months INTEGER,
        monthly_payment REAL,
        room_visual TEXT,
        shared_at TIMESTAMP,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        product_id INTEGER,
        taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        follow_up_1_sent INTEGER DEFAULT 0,
        follow_up_1_date TIMESTAMP,
        follow_up_1_message TEXT,
        follow_up_2_sent INTEGER DEFAULT 0,
        follow_up_2_date TIMESTAMP,
        follow_up_2_message TEXT,
        returned INTEGER DEFAULT 0,
        converted INTEGER DEFAULT 0,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        quote_id INTEGER,
        type TEXT,
        fitter_name TEXT,
        fitter_phone TEXT,
        scheduled_date TIMESTAMP,
        duration_minutes INTEGER DEFAULT 120,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        customer_notified INTEGER DEFAULT 0,
        reminder_sent INTEGER DEFAULT 0,
        photos_created INTEGER DEFAULT 0,
        balance_paid INTEGER DEFAULT 0,
        amount_due REAL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );
    
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        type TEXT,
        channel TEXT DEFAULT 'sms',
        content TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        appointment_id INTEGER,
        rating INTEGER,
        comment TEXT,
        platform TEXT DEFAULT 'google',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        type TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id INTEGER,
        supplier_name TEXT,
        supplier_phone TEXT,
        items TEXT,
        total_cost REAL,
        status TEXT DEFAULT 'pending',
        ordered_at TIMESTAMP,
        delivered_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );
    
    CREATE TABLE IF NOT EXISTS job_checklists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER,
        quote_id INTEGER,
        customer_id INTEGER,
        items TEXT,
        completed_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_progress',
        notes TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),
        FOREIGN KEY (quote_id) REFERENCES quotes(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        quote_id INTEGER,
        room_name TEXT,
        product_name TEXT,
        total REAL,
        deposit_paid REAL DEFAULT 0,
        balance_due REAL,
        status TEXT DEFAULT 'confirmed',
        fitter_name TEXT,
        scheduled_date TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );
    
    CREATE TABLE IF NOT EXISTS warranties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        quote_id INTEGER,
        product_name TEXT,
        supplier TEXT,
        warranty_years INTEGER DEFAULT 10,
        starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        document_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );
    
    CREATE TABLE IF NOT EXISTS visualizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    ''')
    conn.commit()
    
    cursor = conn.execute("SELECT COUNT(*) as count FROM products")
    if cursor.fetchone()["count"] == 0:
        demo_products = [
            ("Karndean Baltic Oak", "Luxury Vinyl", 45.00, 22.50, 50, "A warm, natural oak plank design with authentic grain details.", "https://images.unsplash.com/photo-1581092921461-eab62e97a2aa?w=300&h=300&fit=crop"),
            ("Cormar Primo Ultra", "Carpet", 28.00, 14.00, 120, "Soft touch, bleach cleanable twist pile.", "https://images.unsplash.com/photo-1558618666-fcd25c85f82d?w=300&h=300&fit=crop"),
            ("Polyflor Expona Bevel", "Luxury Vinyl", 38.50, 19.00, 35, "Stone and wood designs with bevelled edges.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"),
            ("Abingdon Stainfree", "Carpet", 32.00, 16.00, 80, "Stain-resistant polypropylene, family friendly.", "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=300&fit=crop"),
            ("Moduleo Transform", "LVT", 42.00, 21.00, 45, "Wood and stone designs, rigid core.", "https://images.unsplash.com/photo-1581858726768-7582c3a6ef86?w=300&h=300&fit=crop"),
            ("Wilton Royal Windsor", "Wilton", 55.00, 27.50, 20, "80% wool, traditional woven Wilton carpet.", "https://images.unsplash.com/photo-1558618666-fcd25c85f82d?w=300&h=300&fit=crop"),
        ]
        for name, cat, price, cost, stock, desc, img in demo_products:
            conn.execute('''
                INSERT INTO products (name, category, price_per_sqm, cost_per_sqm, stock, description, image)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, cat, price, cost, stock, desc, img))
        conn.commit()
    conn.close()

init_db()

def generate_quote_token():
    return str(uuid.uuid4())[:8].upper()

def format_phone_uk(phone):
    cleaned = ''.join(c for c in phone if c.isdigit())
    if cleaned.startswith('0'):
        cleaned = '44' + cleaned[1:]
    return cleaned

def log_activity(conn, customer_id, type_, desc):
    conn.execute("INSERT INTO activities (customer_id, type, description) VALUES (?, ?, ?)",
                 (customer_id, type_, desc))

# ─── MODELS ───

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""
    notes: str = ""
    source: str = "walk-in"

class QuoteCreate(BaseModel):
    customer_id: int
    room_name: str = "Living Room"
    room_width: float = 4.0
    room_length: float = 5.0
    product_id: int
    underlay_price: float = 0
    fitting_price: float = 0
    disposal_price: float = 0
    extras_price: float = 0
    financing_months: int = 0

class AppointmentCreate(BaseModel):
    customer_id: int
    quote_id: Optional[int] = None
    type: str = "measure"
    fitter_name: str = ""
    fitter_phone: str = ""
    scheduled_date: str
    duration_minutes: int = 120
    notes: str = ""
    photos_created: Optional[int] = 0
    balance_paid: Optional[int] = 0
    amount_due: Optional[float] = None

# ─── ENDPOINTS ───

@app.get("/api/dashboard")
def get_dashboard():
    conn = get_db()
    total_customers = conn.execute("SELECT COUNT(*) as c FROM customers").fetchone()["c"]
    total_quotes = conn.execute("SELECT COUNT(*) as c FROM quotes").fetchone()["c"]
    total_value = conn.execute("SELECT COALESCE(SUM(total), 0) as c FROM quotes WHERE status IN ('accepted', 'paid')").fetchone()["c"]
    month_value = conn.execute("SELECT COALESCE(SUM(total), 0) as c FROM quotes WHERE status IN ('accepted', 'paid') AND date(created_at) >= date('now', 'start of month')").fetchone()["c"]
    samples_out = conn.execute("SELECT COUNT(*) as c FROM samples WHERE returned = 0").fetchone()["c"]
    samples_needing_followup = conn.execute('''
        SELECT COUNT(*) as c FROM samples 
        WHERE returned = 0 
        AND ((follow_up_1_sent = 0) OR (follow_up_2_sent = 0 AND follow_up_1_sent = 1))
    ''').fetchone()["c"]
    upcoming_apps = conn.execute("SELECT COUNT(*) as c FROM appointments WHERE date(scheduled_date) >= date('now') AND status = 'scheduled'").fetchone()["c"]
    pending_reviews = conn.execute("SELECT COUNT(*) as c FROM reviews WHERE completed_at IS NULL").fetchone()["c"]
    
    hot_leads = conn.execute('''
        SELECT c.*, MAX(a.created_at) as last_activity,
               (SELECT COUNT(*) FROM samples s WHERE s.customer_id = c.id AND s.converted = 0) as sample_count,
               (SELECT COUNT(*) FROM quotes q WHERE q.customer_id = c.id) as quote_count
        FROM customers c
        LEFT JOIN activities a ON a.customer_id = c.id
        WHERE c.status IN ('lead', 'hot')
        GROUP BY c.id
        ORDER BY last_activity DESC
        LIMIT 5
    ''').fetchall()
    
    conn.close()
    return {
        "stats": {
            "customers": total_customers,
            "quotes": total_quotes,
            "sales_value": round(total_value, 2),
            "month_value": round(month_value, 2),
            "samples_out": samples_out,
            "samples_needing_followup": samples_needing_followup,
            "upcoming_appointments": upcoming_apps,
            "pending_reviews": pending_reviews
        },
        "hot_leads": [dict(row) for row in hot_leads]
    }

@app.get("/api/customers")
def get_customers(search: str = ""):
    conn = get_db()
    if search:
        rows = conn.execute("SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC",
                           (f"%{search}%", f"%{search}%")).fetchall()
    else:
        rows = conn.execute("SELECT * FROM customers ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/customers")
def create_customer(cust: CustomerCreate):
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO customers (name, phone, email, address, notes, source)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (cust.name, cust.phone, cust.email, cust.address, cust.notes, cust.source))
    conn.commit()
    customer_id = cursor.lastrowid
    log_activity(conn, customer_id, 'created', 'Customer added to CRM')
    conn.commit()
    row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int):
    conn = get_db()
    customer = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if not customer:
        conn.close()
        raise HTTPException(404, "Customer not found")
    quotes = conn.execute("SELECT q.*, p.name as product_name FROM quotes q JOIN products p ON q.product_id = p.id WHERE q.customer_id = ? ORDER BY q.created_at DESC", (customer_id,)).fetchall()
    samples = conn.execute('''
        SELECT s.*, p.name as product_name, p.image as product_image 
        FROM samples s 
        JOIN products p ON s.product_id = p.id 
        WHERE s.customer_id = ? ORDER BY s.taken_at DESC
    ''', (customer_id,)).fetchall()
    activities = conn.execute("SELECT * FROM activities WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,)).fetchall()
    appointments = conn.execute("SELECT * FROM appointments WHERE customer_id = ? ORDER BY scheduled_date DESC", (customer_id,)).fetchall()
    messages = conn.execute("SELECT * FROM messages WHERE customer_id = ? ORDER BY sent_at DESC", (customer_id,)).fetchall()
    reviews = conn.execute("SELECT * FROM reviews WHERE customer_id = ? ORDER BY requested_at DESC", (customer_id,)).fetchall()
    conn.close()
    return {
        "customer": dict(customer),
        "quotes": [dict(row) for row in quotes],
        "samples": [dict(row) for row in samples],
        "activities": [dict(row) for row in activities],
        "appointments": [dict(row) for row in appointments],
        "messages": [dict(row) for row in messages],
        "reviews": [dict(row) for row in reviews]
    }

@app.get("/api/products")
def get_products():
    conn = get_db()
    rows = conn.execute("SELECT * FROM products WHERE active = 1 ORDER BY category, name").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/products/{product_id}/recommendations")
def get_product_recommendations(product_id: int):
    conn = get_db()
    target = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not target:
        conn.close()
        return []
    
    # Find same category, similar price, exclude the picked product
    rows = conn.execute('''
        SELECT * FROM products 
        WHERE category = ? 
          AND id != ? 
          AND active = 1
        ORDER BY ABS(price_per_sqm - ?) ASC
        LIMIT 2
    ''', (target["category"], product_id, target["price_per_sqm"])).fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/quotes")
def get_all_quotes():
    conn = get_db()
    rows = conn.execute('''
        SELECT q.*, c.name as customer_name, p.name as product_name
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN products p ON q.product_id = p.id
        ORDER BY q.created_at DESC
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/quotes")
def create_quote(q: QuoteCreate):
    conn = get_db()
    product = conn.execute("SELECT * FROM products WHERE id = ?", (q.product_id,)).fetchone()
    if not product:
        conn.close()
        raise HTTPException(404, "Product not found")
    
    area = q.room_width * q.room_length
    product_total = area * product["price_per_sqm"]
    total = product_total + q.underlay_price + q.fitting_price + q.disposal_price + q.extras_price
    cost_total = area * product["cost_per_sqm"] + q.underlay_price * 0.5 + q.fitting_price * 0.4
    margin = total - cost_total
    
    monthly = 0
    if q.financing_months > 0:
        monthly = total / q.financing_months * 1.12
    
    token = generate_quote_token()
    cursor = conn.execute('''
        INSERT INTO quotes (customer_id, quote_token, room_name, room_width, room_length, area_sqm, product_id,
                          product_price, underlay_price, fitting_price, disposal_price, extras_price,
                          total, margin, status, financing_months, monthly_payment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    ''', (q.customer_id, token, q.room_name, q.room_width, q.room_length, area, q.product_id,
          product_total, q.underlay_price, q.fitting_price, q.disposal_price, q.extras_price,
          total, margin, q.financing_months, round(monthly, 2)))
    quote_id = cursor.lastrowid
    log_activity(conn, q.customer_id, 'quote', f'Quote #{token} created for {q.room_name}')
    conn.commit()
    row = conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()
    conn.close()
    return dict(row)

@app.post("/api/quotes/{quote_id}/visual")
def upload_room_visual(quote_id: int, file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"uploads/room_visuals/{filename}"
    with open(filepath, "wb") as f:
        f.write(file.file.read())
    
    conn = get_db()
    conn.execute("UPDATE quotes SET room_visual = ? WHERE id = ?", (f"/uploads/room_visuals/{filename}", quote_id))
    conn.commit()
    row = conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/quotes/{quote_id}/status")
def update_quote_status(quote_id: int, status: str = Form(...)):
    conn = get_db()
    conn.execute("UPDATE quotes SET status = ? WHERE id = ?", (status, quote_id))
    if status in ('accepted', 'paid'):
        conn.execute("UPDATE quotes SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?", (quote_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/quotes")
def get_all_quotes():
    conn = get_db()
    rows = conn.execute('''
        SELECT q.*, c.name as customer_name, p.name as product_name
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN products p ON q.product_id = p.id
        ORDER BY q.created_at DESC
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/quotes/{quote_id}/share")
def get_quote_share(quote_id: int):
    conn = get_db()
    quote = conn.execute('''
        SELECT q.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
               p.name as product_name, p.image as product_image, p.description as product_description
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN products p ON q.product_id = p.id
        WHERE q.id = ?
    ''', (quote_id,)).fetchone()
    conn.close()
    if not quote:
        raise HTTPException(404, "Quote not found")
    return dict(quote)

@app.post("/api/quotes/{quote_id}/share")
def share_quote(quote_id: int, method: str = Form("whatsapp")):
    conn = get_db()
    quote = conn.execute("SELECT q.*, c.name, c.phone FROM quotes q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?", (quote_id,)).fetchone()
    if not quote:
        conn.close()
        raise HTTPException(404, "Quote not found")
    
    conn.execute("UPDATE quotes SET shared_at = CURRENT_TIMESTAMP WHERE id = ?", (quote_id,))
    
    share_url = f"http://localhost:5005/quote/{quote['quote_token']}"
    message = f"Hi {quote['name']}, here's your flooring quote for {quote['room_name']}: £{quote['total']}. View it here: {share_url}"
    
    conn.execute("INSERT INTO messages (customer_id, type, channel, content, status) VALUES (?, 'quote_share', ?, ?, 'sent')",
                   (quote['customer_id'], method, message))
    log_activity(conn, quote['customer_id'], 'shared', f'Quote shared via {method}')
    conn.commit()
    conn.close()
    
    return {"success": True, "share_url": share_url, "message": message}

@app.post("/api/quotes/{quote_token}/accept")
def accept_quote(quote_token: str):
    conn = get_db()
    quote = conn.execute("SELECT * FROM quotes WHERE quote_token = ?", (quote_token,)).fetchone()
    if not quote:
        conn.close()
        raise HTTPException(404, "Quote not found")
    
    conn.execute("UPDATE quotes SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE quote_token = ?", (quote_token,))
    log_activity(conn, quote['customer_id'], 'accepted', f'Quote #{quote_token} accepted by customer')
    conn.commit()
    conn.close()
    return {"success": True, "message": "Quote accepted!"}

# ─── SAMPLE FOLLOW-UP ENGINE ───

@app.post("/api/samples")
def create_sample(data: dict):
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO samples (customer_id, product_id)
        VALUES (?, ?)
    ''', (data.get('customer_id'), data.get('product_id')))
    conn.commit()
    sample_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/samples")
def get_samples():
    conn = get_db()
    rows = conn.execute('''
        SELECT s.*, c.name as customer_name, p.name as product_name, p.image as product_image
        FROM samples s
        JOIN customers c ON s.customer_id = c.id
        JOIN products p ON s.product_id = p.id
        ORDER BY s.taken_at DESC
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/samples/pending-followup")
def get_pending_followups():
    conn = get_db()
    rows = conn.execute('''
        SELECT s.*, c.name as customer_name, c.phone as customer_phone,
               p.name as product_name, p.image as product_image
        FROM samples s
        JOIN customers c ON s.customer_id = c.id
        JOIN products p ON s.product_id = p.id
        WHERE s.returned = 0
          AND ((s.follow_up_1_sent = 0 AND date(s.follow_up_1_date) <= date('now'))
               OR (s.follow_up_2_sent = 0 AND s.follow_up_1_sent = 1 AND date(s.follow_up_2_date) <= date('now')))
        ORDER BY s.follow_up_1_date
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/samples/{sample_id}/follow-up")
def send_follow_up(sample_id: int, follow_up_number: int = Form(...)):
    conn = get_db()
    sample = conn.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    if not sample:
        conn.close()
        raise HTTPException(404, "Sample not found")
    
    conn.execute(f"UPDATE samples SET follow_up_{follow_up_number}_sent = 1, follow_up_{follow_up_number}_date = CURRENT_TIMESTAMP WHERE id = ?", (sample_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    conn.close()
    return dict(row)

# ─── APPOINTMENTS ───
    log_activity(conn, sample['customer_id'], 'follow_up', f'Sample follow-up #{stage} sent')
    conn.commit()
    conn.close()
    return {"success": True, "message": message}

# ─── APPOINTMENTS ───

@app.post("/api/appointments")
def create_appointment(appt: AppointmentCreate):
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO appointments (customer_id, quote_id, type, fitter_name, fitter_phone, scheduled_date, duration_minutes, notes, photos_created, balance_paid, amount_due)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (appt.customer_id, appt.quote_id, appt.type, appt.fitter_name, appt.fitter_phone, appt.scheduled_date, appt.duration_minutes, appt.notes, appt.photos_created or 0, appt.balance_paid or 0, appt.amount_due))
    
    customer = conn.execute("SELECT * FROM customers WHERE id = ?", (appt.customer_id,)).fetchone()
    if customer:
        msg = f"Hi {customer['name']}, your {appt.type} is booked for {appt.scheduled_date}. Your fitter {appt.fitter_name} will arrive within the time slot. Reply YES to confirm or call us if you need to reschedule."
        conn.execute("INSERT INTO messages (customer_id, type, channel, content, status) VALUES (?, 'appointment_confirmation', 'sms', ?, 'sent')",
                       (appt.customer_id, msg))
    
    log_activity(conn, appt.customer_id, 'appointment', f'{appt.type.capitalize()} appointment scheduled')
    conn.commit()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/calendar")
def get_calendar(start: str, end: str):
    conn = get_db()
    rows = conn.execute('''
        SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE date(a.scheduled_date) BETWEEN ? AND ?
        ORDER BY a.scheduled_date
    ''', (start, end)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/appointments/{appointment_id}/complete")
def complete_appointment(appointment_id: int, install_photo: Optional[UploadFile] = None):
    conn = get_db()
    appt = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not appt:
        conn.close()
        raise HTTPException(404, "Appointment not found")
    
    photo_path = None
    if install_photo:
        ext = install_photo.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = f"uploads/install_photos/{filename}"
        os.makedirs("uploads/install_photos", exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(install_photo.file.read())
        photo_path = f"/uploads/install_photos/{filename}"
    
    conn.execute("UPDATE appointments SET status = 'completed' WHERE id = ?", (appointment_id,))
    
    conn.execute('''
        INSERT INTO reviews (customer_id, appointment_id, platform, requested_at)
        VALUES (?, ?, 'google', CURRENT_TIMESTAMP)
    ''', (appt['customer_id'], appointment_id))
    
    customer = conn.execute("SELECT * FROM customers WHERE id = ?", (appt['customer_id'],)).fetchone()
    if customer:
        review_msg = f"Hi {customer['name']}, thanks for choosing us! We'd love your feedback. Please leave us a review: https://g.page/your-shop/review"
        conn.execute("INSERT INTO messages (customer_id, type, channel, content, status) VALUES (?, 'review_request', 'sms', ?, 'sent')",
                       (appt['customer_id'], review_msg))
    
    log_activity(conn, appt['customer_id'], 'completed', f'{appt["type"].capitalize()} completed')
    conn.commit()
    conn.close()
    return {"success": True, "photo_path": photo_path}

# ─── APPOINTMENT MANAGEMENT ───

@app.put("/api/appointments/{appointment_id}")
def update_appointment(appointment_id: int, appt: AppointmentCreate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Appointment not found")
    
    conn.execute('''
        UPDATE appointments 
        SET customer_id = ?, quote_id = ?, type = ?, fitter_name = ?, fitter_phone = ?, 
            scheduled_date = ?, duration_minutes = ?, notes = ?, photos_created = ?, balance_paid = ?, amount_due = ?
        WHERE id = ?
    ''', (appt.customer_id, appt.quote_id, appt.type, appt.fitter_name, appt.fitter_phone,
          appt.scheduled_date, appt.duration_minutes, appt.notes, appt.photos_created or 0, appt.balance_paid or 0, appt.amount_due, appointment_id))
    
    log_activity(conn, appt.customer_id, 'appointment_updated', f'Appointment updated to {appt.scheduled_date}')
    conn.commit()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int):
    conn = get_db()
    appt = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not appt:
        conn.close()
        raise HTTPException(404, "Appointment not found")
    
    conn.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
    log_activity(conn, appt['customer_id'], 'appointment_deleted', 'Appointment cancelled')
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/appointments/{appointment_id}")
def get_appointment(appointment_id: int):
    conn = get_db()
    row = conn.execute('''
        SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.id = ?
    ''', (appointment_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Appointment not found")
    return dict(row)

# ─── FITTER MANAGEMENT ───

class FitterCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    notes: str = ""
    active: int = 1

@app.get("/api/fitters")
def get_fitters():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS fitters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    rows = conn.execute("SELECT * FROM fitters WHERE active = 1 ORDER BY name").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/fitters")
def create_fitter(fitter: FitterCreate):
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS fitters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor = conn.execute('''
        INSERT INTO fitters (name, phone, email, notes, active)
        VALUES (?, ?, ?, ?, ?)
    ''', (fitter.name, fitter.phone, fitter.email, fitter.notes, fitter.active))
    conn.commit()
    row = conn.execute("SELECT * FROM fitters WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)

@app.put("/api/fitters/{fitter_id}")
def update_fitter(fitter_id: int, fitter: FitterCreate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM fitters WHERE id = ?", (fitter_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Fitter not found")
    
    conn.execute('''
        UPDATE fitters SET name = ?, phone = ?, email = ?, notes = ?, active = ?
        WHERE id = ?
    ''', (fitter.name, fitter.phone, fitter.email, fitter.notes, fitter.active, fitter_id))
    conn.commit()
    row = conn.execute("SELECT * FROM fitters WHERE id = ?", (fitter_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/fitters/{fitter_id}")
def delete_fitter(fitter_id: int):
    conn = get_db()
    fitter = conn.execute("SELECT * FROM fitters WHERE id = ?", (fitter_id,)).fetchone()
    if not fitter:
        conn.close()
        raise HTTPException(404, "Fitter not found")
    
    conn.execute("UPDATE fitters SET active = 0 WHERE id = ?", (fitter_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ─── SHOWROOM SAMPLES & CARPETS ───

class ShowroomItemCreate(BaseModel):
    name: str
    category: str = "carpet"
    supplier: str = ""
    price_retail: float = 0
    price_trade: float = 0
    width_m: float = 4.0
    roll_length_m: float = 30.0
    pile_weight: str = ""
    backing: str = ""
    colour: str = ""
    pattern: str = ""
    durability_rating: str = ""
    stain_resistant: int = 0
    bleach_cleanable: int = 0
    suitable_for: str = ""
    notes: str = ""
    active: int = 1

@app.get("/api/showroom")
def get_showroom_items(category: str = None):
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS showroom_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'carpet',
            supplier TEXT,
            price_retail REAL DEFAULT 0,
            price_trade REAL DEFAULT 0,
            width_m REAL DEFAULT 4.0,
            roll_length_m REAL DEFAULT 30.0,
            pile_weight TEXT,
            backing TEXT,
            colour TEXT,
            pattern TEXT,
            durability_rating TEXT,
            stain_resistant INTEGER DEFAULT 0,
            bleach_cleanable INTEGER DEFAULT 0,
            suitable_for TEXT,
            image TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    
    if category:
        rows = conn.execute("SELECT * FROM showroom_items WHERE active = 1 AND category = ? ORDER BY name", (category,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM showroom_items WHERE active = 1 ORDER BY category, name").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/showroom")
def create_showroom_item(
    name: str = Form(...),
    category: str = Form("carpet"),
    supplier: str = Form(""),
    price_retail: float = Form(0),
    price_trade: float = Form(0),
    width_m: float = Form(4.0),
    roll_length_m: float = Form(30.0),
    pile_weight: str = Form(""),
    backing: str = Form(""),
    colour: str = Form(""),
    pattern: str = Form(""),
    durability_rating: str = Form(""),
    stain_resistant: int = Form(0),
    bleach_cleanable: int = Form(0),
    suitable_for: str = Form(""),
    notes: str = Form(""),
    image: Optional[UploadFile] = None
):
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS showroom_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'carpet',
            supplier TEXT,
            price_retail REAL DEFAULT 0,
            price_trade REAL DEFAULT 0,
            width_m REAL DEFAULT 4.0,
            roll_length_m REAL DEFAULT 30.0,
            pile_weight TEXT,
            backing TEXT,
            colour TEXT,
            pattern TEXT,
            durability_rating TEXT,
            stain_resistant INTEGER DEFAULT 0,
            bleach_cleanable INTEGER DEFAULT 0,
            suitable_for TEXT,
            image TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    image_path = None
    if image:
        ext = image.filename.split(".")[-1]
        filename = f"showroom_{uuid.uuid4()}.{ext}"
        filepath = f"uploads/{filename}"
        with open(filepath, "wb") as f:
            f.write(image.file.read())
        image_path = f"/uploads/{filename}"
    
    cursor = conn.execute('''
        INSERT INTO showroom_items 
        (name, category, supplier, price_retail, price_trade, width_m, roll_length_m, 
         pile_weight, backing, colour, pattern, durability_rating, stain_resistant, 
         bleach_cleanable, suitable_for, image, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, category, supplier, price_retail, price_trade, width_m, roll_length_m,
          pile_weight, backing, colour, pattern, durability_rating, stain_resistant,
          bleach_cleanable, suitable_for, image_path, notes))
    
    conn.commit()
    row = conn.execute("SELECT * FROM showroom_items WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)

@app.put("/api/showroom/{item_id}")
def update_showroom_item(
    item_id: int,
    name: str = Form(...),
    category: str = Form("carpet"),
    supplier: str = Form(""),
    price_retail: float = Form(0),
    price_trade: float = Form(0),
    width_m: float = Form(4.0),
    roll_length_m: float = Form(30.0),
    pile_weight: str = Form(""),
    backing: str = Form(""),
    colour: str = Form(""),
    pattern: str = Form(""),
    durability_rating: str = Form(""),
    stain_resistant: int = Form(0),
    bleach_cleanable: int = Form(0),
    suitable_for: str = Form(""),
    notes: str = Form(""),
    image: Optional[UploadFile] = None
):
    conn = get_db()
    existing = conn.execute("SELECT * FROM showroom_items WHERE id = ?", (item_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Item not found")
    
    image_path = existing['image']
    if image:
        ext = image.filename.split(".")[-1]
        filename = f"showroom_{uuid.uuid4()}.{ext}"
        filepath = f"uploads/{filename}"
        with open(filepath, "wb") as f:
            f.write(image.file.read())
        image_path = f"/uploads/{filename}"
    
    conn.execute('''
        UPDATE showroom_items SET
            name = ?, category = ?, supplier = ?, price_retail = ?, price_trade = ?,
            width_m = ?, roll_length_m = ?, pile_weight = ?, backing = ?, colour = ?,
            pattern = ?, durability_rating = ?, stain_resistant = ?, bleach_cleanable = ?,
            suitable_for = ?, image = ?, notes = ?
        WHERE id = ?
    ''', (name, category, supplier, price_retail, price_trade, width_m, roll_length_m,
          pile_weight, backing, colour, pattern, durability_rating, stain_resistant,
          bleach_cleanable, suitable_for, image_path, notes, item_id))
    
    conn.commit()
    row = conn.execute("SELECT * FROM showroom_items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/showroom/{item_id}")
def delete_showroom_item(item_id: int):
    conn = get_db()
    item = conn.execute("SELECT * FROM showroom_items WHERE id = ?", (item_id,)).fetchone()
    if not item:
        conn.close()
        raise HTTPException(404, "Item not found")
    
    conn.execute("UPDATE showroom_items SET active = 0 WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ─── REVIEWS ───

@app.get("/api/reviews/pending")
def get_pending_reviews():
    conn = get_db()
    rows = conn.execute('''
        SELECT r.*, c.name as customer_name, c.phone as customer_phone
        FROM reviews r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.completed_at IS NULL
        ORDER BY r.requested_at DESC
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/reviews/{review_id}/complete")
def complete_review(review_id: int, rating: int = Form(...), comment: str = Form("")):
    conn = get_db()
    conn.execute("UPDATE reviews SET rating = ?, comment = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                   (rating, comment, review_id))
    conn.commit()
    conn.close()
    return {"success": True}

# ─── REACTIVATION ENGINE ───

@app.get("/api/reactivation/opportunities")
def get_reactivation_opportunities():
    conn = get_db()
    rows = conn.execute('''
        SELECT DISTINCT c.*, 
               MAX(q.created_at) as last_purchase,
               MAX(q.total) as last_value,
               (SELECT name FROM products WHERE id = (
                   SELECT product_id FROM quotes WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1
               )) as last_product
        FROM customers c
        JOIN quotes q ON c.id = q.customer_id
        WHERE q.status IN ('accepted', 'paid')
          AND date(q.created_at) <= date('now', '-30 days')
          AND c.id NOT IN (
              SELECT customer_id FROM messages 
              WHERE type = 'reactivation' 
              AND date(sent_at) >= date('now', '-90 days')
          )
        GROUP BY c.id
        ORDER BY last_purchase DESC
        LIMIT 20
    ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/reactivation/send")
def send_reactivation(customer_id: int = Form(...), message: str = Form(...)):
    conn = get_db()
    conn.execute("INSERT INTO messages (customer_id, type, channel, content, status) VALUES (?, 'reactivation', 'sms', ?, 'sent')",
                   (customer_id, message))
    log_activity(conn, customer_id, 'reactivation', 'Reactivation message sent')
    conn.commit()
    conn.close()
    return {"success": True}

# ─── MESSAGES ───

@app.get("/api/messages")
def get_messages(limit: int = 50):
    conn = get_db()
    rows = conn.execute('''
        SELECT m.*, c.name as customer_name, c.phone as customer_phone
        FROM messages m
        JOIN customers c ON m.customer_id = c.id
        ORDER BY m.sent_at DESC
        LIMIT ?
    ''', (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/messages/whatsapp-link")
def get_whatsapp_link(customer_id: int, message: str = ""):
    conn = get_db()
    customer = conn.execute("SELECT phone FROM customers WHERE id = ?", (customer_id,)).fetchone()
    conn.close()
    if not customer:
        raise HTTPException(404, "Customer not found")
    phone = format_phone_uk(customer['phone'])
    encoded = urllib.parse.quote(message)
    return {"link": f"https://wa.me/{phone}?text={encoded}"}

# ─── PUBLIC QUOTE PAGE ───

@app.get("/quote/{token}", response_class=HTMLResponse)
def public_quote_page(token: str):
    conn = get_db()
    quote = conn.execute('''
        SELECT q.*, c.name as customer_name, p.name as product_name, 
               p.image as product_image, p.description as product_description
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN products p ON q.product_id = p.id
        WHERE q.quote_token = ?
    ''', (token,)).fetchone()
    conn.close()
    
    if not quote:
        return HTMLResponse(content="<h1>Quote Not Found</h1>", status_code=404)
    
    room_visual_html = ""
    if quote["room_visual"]:
        room_visual_html = f'<img src="{quote["room_visual"]}" class="room-visual" alt="Room visualisation">'
    
    financing_html = ""
    if quote["financing_months"]:
        financing_html = f"<p style='color:#f59e0b;font-size:1.1rem'>Or £{round(quote['monthly_payment'])}/month over {quote['financing_months']} months</p>"
    
    accepted_html = ""
    action_html = ""
    if quote["status"] == "accepted":
        accepted_html = '<div class="status status-accepted">&#10003; Quote Accepted</div>'
    else:
        action_html = '''<button class="btn btn-accept" onclick="acceptQuote()">Accept Quote</button>
    <a href="tel:+441234567890" class="btn btn-call">Call Shop to Discuss</a>'''
    
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Quote — """ + quote['customer_name'] + """</title>
<style>
    body { font-family: -apple-system, Inter, sans-serif; margin:0; padding:20px; background:#0f0f0f; color:#e5e5e5; }
    .container { max-width:480px; margin:0 auto; }
    .header { text-align:center; padding:30px 0; }
    .header h1 { margin:0; font-size:1.5rem; }
    .header p { color:#999; margin-top:8px; }
    .card { background:#1a1a1a; border-radius:20px; padding:24px; margin-bottom:16px; border:1px solid rgba(255,255,255,0.06); }
    .product-img { width:100%; border-radius:12px; margin-bottom:16px; }
    .room-visual { width:100%; border-radius:12px; margin-bottom:16px; border:2px solid #f59e0b; }
    .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
    .row:last-child { border:none; }
    .label { color:#999; font-size:0.9rem; }
    .value { font-weight:600; }
    .total { font-size:1.8rem; font-weight:800; color:#f59e0b; text-align:center; margin:20px 0; }
    .btn { display:block; width:100%; padding:16px; border-radius:14px; border:none; font-size:1rem; font-weight:700; cursor:pointer; text-align:center; text-decoration:none; margin-bottom:12px; }
    .btn-accept { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
    .btn-pay { background:linear-gradient(135deg,#f59e0b,#d97706); color:#000; }
    .btn-call { background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.1); }
    .badge { display:inline-block; background:rgba(245,158,11,0.15); color:#f59e0b; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; }
    .status { text-align:center; padding:16px; border-radius:12px; margin:16px 0; }
    .status-accepted { background:rgba(34,197,94,0.15); color:#4ade80; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <span class="badge">QUOTE #""" + token + """</span>
        <h1 style="margin-top:12px">""" + quote['room_name'] + """</h1>
        <p>Prepared for """ + quote['customer_name'] + """</p>
    </div>
    
    <div class="card">
        """ + room_visual_html + """
        <img src=""" + quote['product_image'] + """ class="product-img" alt=""" + quote['product_name'] + """>
        <h2 style="margin:0 0 8px 0">""" + quote['product_name'] + """</h2>
        <p style="color:#999; margin:0; font-size:0.9rem">""" + (quote['product_description'] or '') + """</p>
    </div>
    
    <div class="card">
        <div class="row"><span class="label">Room Dimensions</span><span class="value">""" + str(quote['room_width']) + """m x """ + str(quote['room_length']) + """m</span></div>
        <div class="row"><span class="label">Area</span><span class="value">""" + str(round(quote['area_sqm'], 1)) + """ m²</span></div>
        <div class="row"><span class="label">Flooring</span><span class="value">£""" + str(round(quote['product_price'])) + """</span></div>
        <div class="row"><span class="label">Underlay</span><span class="value">£""" + str(round(quote['underlay_price'])) + """</span></div>
        <div class="row"><span class="label">Fitting</span><span class="value">£""" + str(round(quote['fitting_price'])) + """</span></div>
        <div class="row"><span class="label">Disposal</span><span class="value">£""" + str(round(quote['disposal_price'])) + """</span></div>
        <div class="row"><span class="label">Extras</span><span class="value">£""" + str(round(quote['extras_price'])) + """</span></div>
        <div style="border-top:2px solid rgba(255,255,255,0.1); margin-top:12px; padding-top:16px;">
            <div class="total">£""" + str(round(quote['total'])) + """</div>
            """ + financing_html + """
        </div>
    </div>
    
    """ + accepted_html + action_html + """
</div>

<script>
async function acceptQuote() {
    const res = await fetch('/api/quotes/""" + token + """/accept', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
        alert("Quote accepted! We'll be in touch to arrange fitting.");
        location.reload();
    }
}
</script>
</body>
</html>"""
    
    return HTMLResponse(content=html)

# ─── ANALYTICS ───

@app.get("/api/analytics")
def get_analytics():
    conn = get_db()
    
    # Weekly sales trend (last 8 weeks)
    weekly = conn.execute('''
        SELECT strftime('%Y-W%W', created_at) as week,
               COALESCE(SUM(total), 0) as revenue,
               COUNT(*) as quote_count
        FROM quotes
        WHERE status IN ('accepted', 'paid')
          AND created_at >= date('now', '-56 days')
        GROUP BY week
        ORDER BY week DESC
        LIMIT 8
    ''').fetchall()
    
    # Top products by revenue
    top_products = conn.execute('''
        SELECT p.name,
               COALESCE(SUM(q.total), 0) as revenue,
               COUNT(*) as quote_count
        FROM quotes q
        JOIN products p ON q.product_id = p.id
        WHERE q.status IN ('accepted', 'paid')
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
    ''').fetchall()
    
    # Sales by source
    by_source = conn.execute('''
        SELECT c.source,
               COALESCE(SUM(q.total), 0) as revenue,
               COUNT(*) as quote_count
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        WHERE q.status IN ('accepted', 'paid')
        GROUP BY c.source
        ORDER BY revenue DESC
    ''').fetchall()
    
    # Fitter performance
    fitters = conn.execute('''
        SELECT fitter_name,
               COUNT(*) as jobs,
               COALESCE(SUM(q.total), 0) as revenue
        FROM appointments a
        LEFT JOIN quotes q ON a.quote_id = q.id
        WHERE fitter_name != ''
        GROUP BY fitter_name
        ORDER BY jobs DESC
    ''').fetchall()
    
    # Conversion funnel
    total_quotes = conn.execute("SELECT COUNT(*) as c FROM quotes").fetchone()["c"]
    accepted = conn.execute("SELECT COUNT(*) as c FROM quotes WHERE status = 'accepted'").fetchone()["c"]
    paid = conn.execute("SELECT COUNT(*) as c FROM quotes WHERE status = 'paid'").fetchone()["c"]
    
    conn.close()
    
    return {
        "weekly_trend": [dict(row) for row in weekly],
        "top_products": [dict(row) for row in top_products],
        "by_source": [dict(row) for row in by_source],
        "fitters": [dict(row) for row in fitters],
        "funnel": {
            "total_quotes": total_quotes,
            "accepted": accepted,
            "paid": paid,
            "conversion_rate": round((accepted + paid) / total_quotes * 100, 1) if total_quotes > 0 else 0
        }
    }

# ─── PURCHASE ORDERS ───

@app.get("/api/purchase-orders")
def get_purchase_orders():
    conn = get_db()
    rows = conn.execute("""
        SELECT po.*, q.room_name, c.name as customer_name
        FROM purchase_orders po
        LEFT JOIN quotes q ON po.quote_id = q.id
        LEFT JOIN customers c ON q.customer_id = c.id
        ORDER BY po.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/purchase-orders")
def create_purchase_order(data: dict):
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO purchase_orders (quote_id, supplier_name, supplier_phone, items, total_cost, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (data.get('quote_id'), data.get('supplier_name'), data.get('supplier_phone'), 
          data.get('items'), data.get('total_cost'), 'pending', data.get('notes')))
    po_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM purchase_orders WHERE id = ?", (po_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/purchase-orders/{po_id}/status")
def update_po_status(po_id: int, data: dict):
    conn = get_db()
    new_status = data.get('status')
    now = datetime.now().isoformat()
    if new_status == 'ordered':
        conn.execute("UPDATE purchase_orders SET status = ?, ordered_at = ? WHERE id = ?", (new_status, now, po_id))
    elif new_status == 'delivered':
        conn.execute("UPDATE purchase_orders SET status = ?, delivered_at = ? WHERE id = ?", (new_status, now, po_id))
    else:
        conn.execute("UPDATE purchase_orders SET status = ? WHERE id = ?", (new_status, po_id))
    conn.commit()
    row = conn.execute("SELECT * FROM purchase_orders WHERE id = ?", (po_id,)).fetchone()
    conn.close()
    return dict(row)

# ─── CUSTOMER ORDERS ───

@app.get("/api/orders")
def get_orders():
    conn = get_db()
    rows = conn.execute("""
        SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/orders")
def create_order(data: dict):
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO orders (customer_id, quote_id, room_name, product_name, total, deposit_paid, balance_due, status, fitter_name, scheduled_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('customer_id'), data.get('quote_id'), data.get('room_name'),
        data.get('product_name'), data.get('total'), data.get('deposit_paid', 0),
        data.get('balance_due'), data.get('status', 'confirmed'),
        data.get('fitter_name'), data.get('scheduled_date'), data.get('notes')
    ))
    order_id = cursor.lastrowid
    conn.commit()
    conn.execute("UPDATE quotes SET status = 'converted' WHERE id = ?", (data.get('quote_id'),))
    conn.commit()
    log_activity(conn, data.get('customer_id'), 'order_created', f"Order #{order_id} created for {data.get('room_name')}")
    conn.commit()
    row = conn.execute("SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?", (order_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: int, data: dict):
    conn = get_db()
    new_status = data.get('status')
    now = datetime.now().isoformat()
    conn.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, order_id))
    conn.commit()
    order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    log_activity(conn, order['customer_id'], 'status_change', f"Order status changed to {new_status}")
    conn.commit()
    row = conn.execute("SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?", (order_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/orders/{order_id}/balance")
def update_order_balance(order_id: int, data: dict):
    conn = get_db()
    deposit = data.get('deposit_paid')
    balance = data.get('balance_due')
    conn.execute("UPDATE orders SET deposit_paid = ?, balance_due = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                   (deposit, balance, order_id))
    conn.commit()
    row = conn.execute("SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?", (order_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: int):
    conn = get_db()
    conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/orders/{order_id}")
def get_order(order_id: int):
    conn = get_db()
    row = conn.execute("""
        SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address, c.email
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
    """, (order_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Order not found")
    return dict(row)

# ─── JOB CHECKLISTS ───

@app.get("/api/checklists")
def get_checklists():
    conn = get_db()
    rows = conn.execute("""
        SELECT jc.*, c.name as customer_name, a.scheduled_date, a.fitter_name
        FROM job_checklists jc
        JOIN customers c ON jc.customer_id = c.id
        LEFT JOIN appointments a ON jc.appointment_id = a.id
        ORDER BY jc.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/checklists")
def create_checklist(data: dict):
    conn = get_db()
    items_json = json.dumps(data.get('items', []))
    total = len(data.get('items', []))
    cursor = conn.execute('''
        INSERT INTO job_checklists (appointment_id, quote_id, customer_id, items, total_count, status)
        VALUES (?, ?, ?, ?, ?, 'in_progress')
    ''', (data.get('appointment_id'), data.get('quote_id'), data.get('customer_id'), items_json, total))
    checklist_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM job_checklists WHERE id = ?", (checklist_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/checklists/{checklist_id}")
def update_checklist(checklist_id: int, data: dict):
    conn = get_db()
    completed = data.get('completed_count', 0)
    total = data.get('total_count', 1)
    status = 'complete' if completed >= total else 'in_progress'
    now = datetime.now().isoformat() if status == 'complete' else None
    conn.execute('''
        UPDATE job_checklists SET completed_count = ?, status = ?, completed_at = ? WHERE id = ?
    ''', (completed, status, now, checklist_id))
    conn.commit()
    row = conn.execute("SELECT * FROM job_checklists WHERE id = ?", (checklist_id,)).fetchone()
    conn.close()
    return dict(row)

# ─── WARRANTIES ───

@app.get("/api/warranties")
def get_warranties():
    conn = get_db()
    rows = conn.execute("""
        SELECT w.*, c.name as customer_name
        FROM warranties w
        JOIN customers c ON w.customer_id = c.id
        ORDER BY w.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/warranties")
def create_warranty(data: dict):
    conn = get_db()
    years = data.get('warranty_years', 10)
    now = datetime.now()
    expires = (now + timedelta(days=365*years)).isoformat()
    cursor = conn.execute('''
        INSERT INTO warranties (customer_id, quote_id, product_name, supplier, warranty_years, expires_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (data.get('customer_id'), data.get('quote_id'), data.get('product_name'),
          data.get('supplier'), years, expires, data.get('notes')))
    w_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM warranties WHERE id = ?", (w_id,)).fetchone()
    conn.close()
    return dict(row)

# ─── VISUALIZER ───

@app.get("/api/visualizations")
def get_visualizations():
    conn = get_db()
    rows = conn.execute("SELECT * FROM visualizations ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/visualizations")
def create_visualization(
    image: UploadFile = File(...),
    product_id: int = Form(...),
    product_name: str = Form(...),
    customer_id: Optional[int] = Form(None)
):
    conn = get_db()
    ext = image.filename.split(".")[-1]
    filename = f"viz_{uuid.uuid4()}.{ext}"
    filepath = f"uploads/visualizations/{filename}"
    os.makedirs("uploads/visualizations", exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(image.file.read())
    
    cursor = conn.execute('''
        INSERT INTO visualizations (customer_id, product_id, product_name, image_url)
        VALUES (?, ?, ?, ?)
    ''', (customer_id, product_id, product_name, f"/uploads/visualizations/{filename}"))
    viz_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM visualizations WHERE id = ?", (viz_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/visualizations/{viz_id}")
def delete_visualization(viz_id: int):
    conn = get_db()
    viz = conn.execute("SELECT * FROM visualizations WHERE id = ?", (viz_id,)).fetchone()
    if not viz:
        conn.close()
        raise HTTPException(404, "Visualization not found")
    # Delete file
    img_path = viz['image_url'].lstrip('/')
    if os.path.exists(img_path):
        os.remove(img_path)
    conn.execute("DELETE FROM visualizations WHERE id = ?", (viz_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# Mount static assets FIRST (before catch-all)
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# SPA catch-all — serves index.html for all non-API routes
from fastapi.responses import FileResponse

@app.get("/{path:path}")
def serve_spa(path: str):
    # Skip API routes
    if path.startswith("api/"):
        return {"detail": "Not Found"}
    index_path = os.path.join(os.path.dirname(__file__), "dist", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "Not Found"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5004))
    uvicorn.run(app, host="0.0.0.0", port=port)
