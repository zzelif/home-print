-- HomePrint OS SQLite Schema
-- Optimized for SQLite with WAL mode on 4GB RAM Linux / Windows

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- Products & Services Catalogue
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- RUSH_ID, DOCUMENT, PHOTO, POLAROID, LAMINATION, STICKER
    paper_size TEXT NOT NULL, -- 4R, A4, Letter, Legal
    paper_type TEXT NOT NULL, -- GLOSSY_PHOTO, MATTE_PHOTO, PLAIN_PAPER
    default_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Material Costs & Itemized Consumable Batches
CREATE TABLE IF NOT EXISTS material_costs (
    id TEXT PRIMARY KEY,
    material_name TEXT NOT NULL,
    unit TEXT NOT NULL, -- sheet, ml, piece
    unit_cost REAL NOT NULL,
    in_stock_qty REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Operational Cost Settings
CREATE TABLE IF NOT EXISTS operation_settings (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL,
    description TEXT
);

-- System Settings & Default Hardware Configurations
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job Orders (Permanent Immutable Sales Ledger for Analytics)
CREATE TABLE IF NOT EXISTS job_orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_phone TEXT,
    source TEXT NOT NULL, -- QR_DROP, HOT_FOLDER, MANUAL_UI
    product_id TEXT,
    status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, IN_LAYOUT, READY_TO_PRINT, PRINTING, COMPLETED, CANCELLED
    copies INTEGER DEFAULT 1,
    layout_preset TEXT,
    total_base_cost REAL DEFAULT 0,
    selling_price REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    final_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'PENDING', -- PENDING, PAID
    cash_tendered REAL DEFAULT 0,
    change_given REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH', -- CASH, GCASH
    pdf_path TEXT,
    page_breakdown TEXT, -- JSON string of per-page color tier analysis
    files_purged INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Ingested Files per Job (Ephemeral storage for customer binary files)
CREATE TABLE IF NOT EXISTS job_files (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    dpi_detected REAL,
    is_purged INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES job_orders(id)
);

-- Initial Seed Data: Operations & Realistic Overhead
INSERT OR IGNORE INTO operation_settings (key, value, description) VALUES
('labor_rate_per_hour', 90.0, 'Labor rate in Pesos per hour (₱1.50/min)'),
('overhead_doc_bw_per_page', 0.20, 'Amortized electricity and machine maintenance per B&W page'),
('overhead_doc_color_per_page', 0.30, 'Amortized electricity and color head maintenance per color page'),
('overhead_photo_4r_per_sheet', 1.50, 'Glossy sleeve packaging, trimming, and die-cutter wear per 4R sheet'),
('ink_cost_doc_bw_page', 0.10, 'Average black pigment ink cost per standard text page (5% coverage)'),
('ink_cost_doc_color_page', 1.30, 'Average color dye ink cost per mixed color page'),
('ink_cost_photo_4r_full', 3.00, 'Full-bleed high density photo ink cost per 4R print');

-- Initial Seed Data: Material Batches & Unit Costs
INSERT OR IGNORE INTO material_costs (id, material_name, unit, unit_cost, in_stock_qty) VALUES
('mat_paper_a4_70gsm', 'A4 Copier Paper 70gsm (Ream of 500)', 'sheet', 0.50, 2500),
('mat_paper_photo_4r', '4R Glossy Photo Paper 230gsm (Pack of 100)', 'sheet', 3.50, 300),
('mat_paper_letter', 'Short / Letter Copier Paper 70gsm', 'sheet', 0.48, 1500),
('mat_paper_legal', 'Long / Legal Copier Paper 70gsm', 'sheet', 0.55, 1000),
('mat_ink_black_gt53', 'HP GT53 Black Pigment Ink (90ml bottle)', 'ml', 2.80, 180),
('mat_ink_color_gt52', 'HP GT52 Cyan/Magenta/Yellow Inks (70ml bottles)', 'ml', 4.50, 210),
('mat_overhead_doc', 'Document Printing Electricity & Maintenance Amortization', 'sheet', 0.20, 99999),
('mat_overhead_photo', 'Photo Rush ID Packaging (Sleeve) & Trimming Wear', 'sheet', 1.50, 99999);

-- Initial Seed Data: Products Catalogue
INSERT OR IGNORE INTO products (id, name, category, paper_size, paper_type, default_price) VALUES
('prod_doc_bw_a4', 'A4 Document Print (Black & White)', 'DOCUMENT', 'A4', 'PLAIN_PAPER', 3.0),
('prod_doc_color_a4', 'A4 Document Print (Full Color)', 'DOCUMENT', 'A4', 'PLAIN_PAPER', 10.0),
('prod_rush_id_4r', '4R Rush ID Package (Set 1: 4x 2x2 + 8x 1x1)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_rush_id_2x2', '4R 2x2 Package (Set 2: 6x 2x2)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_passport_4r', '4R Passport Package (Set 4: 6x Passport)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_polaroid_4r', 'Polaroid Mini Prints (4R: 4 pcs)', 'POLAROID', '4R', 'GLOSSY_PHOTO', 35.0);

-- Manually Added Wi-Fi / IP Printers (Persisted Network Devices)
CREATE TABLE IF NOT EXISTS manual_printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER DEFAULT 631,
    protocol TEXT DEFAULT 'IPP',
    uri TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Settings
INSERT OR IGNORE INTO system_settings (key, value) VALUES
('default_printer_name', 'HP_Smart_Tank_670'),
('default_printer_type', 'WIFI_NETWORK');

