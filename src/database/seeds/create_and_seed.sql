-- ─── Create Tables ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  sku          VARCHAR(100) NOT NULL UNIQUE,
  barcode      VARCHAR(100),
  price        NUMERIC(12, 2) NOT NULL,
  cost_price   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate     NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  track_stock  BOOLEAN NOT NULL DEFAULT TRUE,
  image_url    TEXT,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  attributes   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku     ON products(sku);
CREATE        INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

CREATE TABLE IF NOT EXISTS stock_levels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand    INT NOT NULL DEFAULT 0,
  quantity_reserved   INT NOT NULL DEFAULT 0,
  reorder_point       INT NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'purchase', 'sale', 'return', 'reserve', 'release', 'adjust', 'transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type           stock_movement_type NOT NULL,
  quantity       INT NOT NULL,
  quantity_after INT NOT NULL,
  reference      TEXT,
  notes          TEXT,
  performed_by   UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type       ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- ─── Seed Categories ─────────────────────────────────────────────────────────

INSERT INTO categories (name, description) VALUES
  ('Beverages',   'Hot and cold drinks'),
  ('Snacks',      'Chips, crackers, and bites'),
  ('Dairy',       'Milk, cheese, and yogurt'),
  ('Electronics', 'Gadgets and accessories'),
  ('Stationery',  'Pens, notebooks, and more')
ON CONFLICT DO NOTHING;

-- ─── Seed 20 Products ────────────────────────────────────────────────────────

INSERT INTO products (name, description, sku, barcode, price, cost_price, tax_rate, is_active, track_stock, image_url, category_id)
VALUES
  -- Beverages (6)
  ('Espresso Coffee',     'Strong Italian espresso shot',           'BEV-001', '4001001000001',  2.50,  1.00, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light1/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  ('Cappuccino',          'Espresso with steamed milk foam',        'BEV-002', '4001001000002',  3.50,  1.20, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light2/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  ('Green Tea',           'Premium Japanese green tea',             'BEV-003', '4001001000003',  2.00,  0.60, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light3/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  ('Orange Juice 500ml',  'Freshly squeezed orange juice',          'BEV-004', '4001001000004',  3.00,  1.10, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light4/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  ('Mineral Water 1L',    'Still natural mineral water',            'BEV-005', '4001001000005',  1.50,  0.40, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light5/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  ('Energy Drink 250ml',  'Sparkling energy boost drink',           'BEV-006', '4001001000006',  2.80,  1.00, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light6/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1)),
  -- Snacks (4)
  ('Potato Chips 100g',   'Salted crispy potato chips',             'SNK-001', '4002001000001',  1.80,  0.70, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light7/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1)),
  ('Chocolate Bar 50g',   'Milk chocolate bar',                     'SNK-002', '4002001000002',  1.50,  0.60, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light8/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1)),
  ('Mixed Nuts 200g',     'Roasted salted mixed nuts',              'SNK-003', '4002001000003',  4.50,  2.00, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light9/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1)),
  ('Granola Bar',         'Oat and honey granola bar',              'SNK-004', '4002001000004',  1.20,  0.45, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light10/400/400', (SELECT id FROM categories WHERE name='Snacks' LIMIT 1)),
  -- Dairy (4)
  ('Whole Milk 1L',       'Fresh full-fat cow milk',                'DAI-001', '4003001000001',  1.90,  0.90, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light11/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1)),
  ('Greek Yogurt 250g',   'Thick creamy Greek-style yogurt',        'DAI-002', '4003001000002',  2.50,  1.10, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light12/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1)),
  ('Cheddar Cheese 200g', 'Aged sharp cheddar cheese block',        'DAI-003', '4003001000003',  3.80,  1.80, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light13/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1)),
  ('Butter 250g',         'Unsalted premium butter',                'DAI-004', '4003001000004',  3.20,  1.50, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light14/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1)),
  -- Electronics (3)
  ('USB-C Cable 1m',      'Fast-charging braided USB-C cable',      'ELC-001', '4004001000001', 12.99,  5.00, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light15/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1)),
  ('Wireless Earbuds',    'Bluetooth 5.0 true wireless earbuds',    'ELC-002', '4004001000002', 49.99, 20.00, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light16/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1)),
  ('Phone Stand',         'Adjustable aluminum phone/tablet stand', 'ELC-003', '4004001000003',  9.99,  3.50, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light17/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1)),
  -- Stationery (3)
  ('Ballpoint Pen Set',   'Pack of 10 smooth ballpoint pens',       'STA-001', '4005001000001',  3.50,  1.20, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light18/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1)),
  ('A5 Notebook',         '100-page lined hardcover notebook',      'STA-002', '4005001000002',  5.99,  2.50, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light19/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1)),
  ('Sticky Notes Pack',   '5-color sticky note pad set 400 sheets', 'STA-003', '4005001000003',  4.25,  1.80, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light20/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1))
ON CONFLICT (sku) DO NOTHING;

-- ─── Seed Stock Levels ───────────────────────────────────────────────────────

INSERT INTO stock_levels (product_id, quantity_on_hand, quantity_reserved, reorder_point)
SELECT p.id, 50, 0, 5
FROM products p
WHERE p.track_stock = TRUE
  AND NOT EXISTS (SELECT 1 FROM stock_levels sl WHERE sl.product_id = p.id);
