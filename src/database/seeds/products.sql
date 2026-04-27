-- Seed: Categories and Products
-- Run this against your PostgreSQL database

-- Insert categories
INSERT INTO categories (id, name, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Beverages',    'Hot and cold drinks',          NOW(), NOW()),
  (gen_random_uuid(), 'Snacks',       'Chips, crackers, and bites',   NOW(), NOW()),
  (gen_random_uuid(), 'Dairy',        'Milk, cheese, and yogurt',     NOW(), NOW()),
  (gen_random_uuid(), 'Electronics',  'Gadgets and accessories',      NOW(), NOW()),
  (gen_random_uuid(), 'Stationery',   'Pens, notebooks, and more',    NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert 20 products (category_id linked by subquery)
INSERT INTO products (
  id, name, description, sku, barcode,
  price, cost_price, tax_rate,
  is_active, track_stock, image_url, category_id,
  created_at, updated_at
)
VALUES
  -- Beverages (6)
  (gen_random_uuid(), 'Espresso Coffee',      'Strong Italian espresso shot',           'BEV-001', '4001001000001',  2.50,  1.00, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light1/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Cappuccino',           'Espresso with steamed milk foam',        'BEV-002', '4001001000002',  3.50,  1.20, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light2/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Green Tea',            'Premium Japanese green tea',             'BEV-003', '4001001000003',  2.00,  0.60, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light3/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Orange Juice 500ml',   'Freshly squeezed orange juice',          'BEV-004', '4001001000004',  3.00,  1.10, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light4/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Mineral Water 1L',     'Still natural mineral water',            'BEV-005', '4001001000005',  1.50,  0.40, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light5/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Energy Drink 250ml',   'Sparkling energy boost drink',           'BEV-006', '4001001000006',  2.80,  1.00, 10.00, TRUE, TRUE, 'https://picsum.photos/seed/light6/400/400',  (SELECT id FROM categories WHERE name='Beverages' LIMIT 1), NOW(), NOW()),

  -- Snacks (4)
  (gen_random_uuid(), 'Potato Chips 100g',    'Salted crispy potato chips',             'SNK-001', '4002001000001',  1.80,  0.70, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light7/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Chocolate Bar 50g',    'Milk chocolate bar',                     'SNK-002', '4002001000002',  1.50,  0.60, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light8/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Mixed Nuts 200g',      'Roasted salted mixed nuts',              'SNK-003', '4002001000003',  4.50,  2.00, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light9/400/400',  (SELECT id FROM categories WHERE name='Snacks' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Granola Bar',          'Oat and honey granola bar',              'SNK-004', '4002001000004',  1.20,  0.45, 12.00, TRUE, TRUE, 'https://picsum.photos/seed/light10/400/400', (SELECT id FROM categories WHERE name='Snacks' LIMIT 1), NOW(), NOW()),

  -- Dairy (4)
  (gen_random_uuid(), 'Whole Milk 1L',        'Fresh full-fat cow milk',                'DAI-001', '4003001000001',  1.90,  0.90, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light11/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Greek Yogurt 250g',    'Thick creamy Greek-style yogurt',        'DAI-002', '4003001000002',  2.50,  1.10, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light12/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Cheddar Cheese 200g',  'Aged sharp cheddar cheese block',        'DAI-003', '4003001000003',  3.80,  1.80, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light13/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Butter 250g',          'Unsalted premium butter',                'DAI-004', '4003001000004',  3.20,  1.50, 8.00,  TRUE, TRUE, 'https://picsum.photos/seed/light14/400/400', (SELECT id FROM categories WHERE name='Dairy' LIMIT 1), NOW(), NOW()),

  -- Electronics (3)
  (gen_random_uuid(), 'USB-C Cable 1m',       'Fast-charging braided USB-C cable',      'ELC-001', '4004001000001', 12.99,  5.00, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light15/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Wireless Earbuds',     'Bluetooth 5.0 true wireless earbuds',   'ELC-002', '4004001000002', 49.99, 20.00, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light16/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Phone Stand',          'Adjustable aluminum phone/tablet stand', 'ELC-003', '4004001000003',  9.99,  3.50, 15.00, TRUE, TRUE, 'https://picsum.photos/seed/light17/400/400', (SELECT id FROM categories WHERE name='Electronics' LIMIT 1), NOW(), NOW()),

  -- Stationery (3)
  (gen_random_uuid(), 'Ballpoint Pen Set',    'Pack of 10 smooth ballpoint pens',       'STA-001', '4005001000001',  3.50,  1.20, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light18/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'A5 Notebook',          '100-page lined hardcover notebook',      'STA-002', '4005001000002',  5.99,  2.50, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light19/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Sticky Notes Pack',    '5-color sticky note pad set 400 sheets', 'STA-003', '4005001000003',  4.25,  1.80, 5.00,  TRUE, TRUE, 'https://picsum.photos/seed/light20/400/400', (SELECT id FROM categories WHERE name='Stationery' LIMIT 1), NOW(), NOW())

ON CONFLICT (sku) DO NOTHING;

-- Create stock_levels for every product that has track_stock = true
-- Starts with 50 units on hand, 0 reserved, reorder point 5
INSERT INTO stock_levels (id, product_id, quantity_on_hand, quantity_reserved, reorder_point, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  50,
  0,
  5,
  NOW(),
  NOW()
FROM products p
WHERE p.track_stock = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM stock_levels sl WHERE sl.product_id = p.id
  );
