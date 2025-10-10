/*
  # E-commerce Products & Orders

  1. Products
    - Digital products with file downloads
    - Pricing and currency
    - Entitlement-gated downloads

  2. Orders
    - Purchase tracking
    - Payment provider integration
    - Download entitlements

  3. Security
    - RLS policies
    - Secure download URLs
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  file_url text,
  images jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_read ON products;
CREATE POLICY products_read ON products
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS products_write ON products;
CREATE POLICY products_write ON products
  FOR ALL
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_products_org_site ON products(org_id, site_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  customer_email text NOT NULL,
  customer_name text,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_provider text NOT NULL CHECK (payment_provider IN ('stripe', 'paypal')),
  payment_id text,
  download_entitlement_granted boolean DEFAULT false,
  download_count int DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_read ON orders;
CREATE POLICY orders_read ON orders
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid())
    OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS orders_write ON orders;
CREATE POLICY orders_write ON orders
  FOR ALL
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_provider, payment_id);

-- Download entitlements table
CREATE TABLE IF NOT EXISTS download_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  customer_email text NOT NULL,
  expires_at timestamptz,
  download_limit int DEFAULT 5,
  downloads_used int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE download_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entitlements_read ON download_entitlements;
CREATE POLICY entitlements_read ON download_entitlements
  FOR SELECT
  USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON download_entitlements(customer_email);
CREATE INDEX IF NOT EXISTS idx_entitlements_order ON download_entitlements(order_id);

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT ON download_entitlements TO authenticated;
GRANT SELECT ON products TO anon;
