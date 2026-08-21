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

-- Material Costs
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

-- Job Orders
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Ingested Files per Job
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
    FOREIGN KEY(job_id) REFERENCES job_orders(id) ON DELETE CASCADE
);

-- Initial Seed Data
INSERT OR IGNORE INTO operation_settings (key, value, description) VALUES
('labor_rate_per_hour', 90.0, 'Labor rate in Pesos per hour'),
('electricity_per_job', 1.0, 'Estimated electricity cost per print job'),
('ink_cost_per_page_color', 3.5, 'Estimated ink cost per full-color 4R/A4 page'),
('ink_cost_per_page_bw', 0.5, 'Estimated ink cost per black & white text page'),
('printer_maintenance_reserve', 2.0, 'Maintenance and depreciation reserve per job');

INSERT OR IGNORE INTO products (id, name, category, paper_size, paper_type, default_price) VALUES
('prod_rush_id_4r', '4R Rush ID Package (Set 1: 4x 2x2 + 8x 1x1)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_rush_id_2x2', '4R 2x2 Package (Set 2: 6x 2x2)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_passport_4r', '4R Passport Package (Set 4: 6x Passport)', 'RUSH_ID', '4R', 'GLOSSY_PHOTO', 40.0),
('prod_polaroid_4r', 'Polaroid Mini Prints (4R)', 'POLAROID', '4R', 'GLOSSY_PHOTO', 35.0),
('prod_doc_bw_a4', 'A4 Document Print (Black & White)', 'DOCUMENT', 'A4', 'PLAIN_PAPER', 5.0),
('prod_doc_color_a4', 'A4 Document Print (Full Color)', 'DOCUMENT', 'A4', 'PLAIN_PAPER', 15.0);

INSERT OR IGNORE INTO system_settings (key, value) VALUES
('default_printer_name', 'HP_Smart_Tank_670'),
('default_printer_type', 'USB');
