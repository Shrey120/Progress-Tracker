-- The shop database every SQL example starts from. Each run gets a fresh copy.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  joined_at TEXT NOT NULL
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL          -- in rupees
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,           -- 'paid', 'shipped', 'cancelled'
  created_at TEXT NOT NULL
);
INSERT INTO users VALUES
  (1, 'Asha',  'Kanpur',    '2025-01-10'),
  (2, 'Ravi',  'Pune',      '2025-02-03'),
  (3, 'Meera', 'Bengaluru', '2025-02-20'),
  (4, 'Kabir', 'Pune',      '2025-03-15'),
  (5, 'Zoya',  NULL,        '2025-04-01'),
  (6, 'Dev',   'Kanpur',    '2025-05-22');
INSERT INTO products VALUES
  (1, 'Keyboard',   'electronics', 2500),
  (2, 'Mouse',      'electronics',  800),
  (3, 'Monitor',    'electronics', 12000),
  (4, 'Notebook',   'stationery',    60),
  (5, 'Pen pack',   'stationery',   150),
  (6, 'Desk lamp',  'home',        1800),
  (7, 'Chair',      'home',        7500);
INSERT INTO orders VALUES
  (1,  1, 1, 1, 'paid',      '2025-06-01'),
  (2,  1, 4, 5, 'shipped',   '2025-06-02'),
  (3,  2, 3, 1, 'paid',      '2025-06-02'),
  (4,  2, 2, 2, 'cancelled', '2025-06-03'),
  (5,  3, 7, 1, 'shipped',   '2025-06-05'),
  (6,  3, 5, 3, 'paid',      '2025-06-06'),
  (7,  1, 6, 1, 'paid',      '2025-06-08'),
  (8,  4, 4, 10,'shipped',   '2025-06-09'),
  (9,  4, 1, 1, 'paid',      '2025-06-11'),
  (10, 3, 3, 1, 'paid',      '2025-06-12'),
  (11, 2, 5, 2, 'shipped',   '2025-06-15'),
  (12, 6, 2, 1, 'paid',      '2025-06-18');
