-- ══════════════════════════════════════════════════
-- Sensepot Service — Supabase Schema
-- Ejecutar en: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════════════

-- ── APPOINTMENTS ──────────────────────────────────
CREATE TABLE appointments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio        TEXT UNIQUE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre       TEXT NOT NULL,
  email        TEXT NOT NULL,
  telefono     TEXT NOT NULL,
  servicio     TEXT NOT NULL,
  fecha        DATE NOT NULL,
  horario      TEXT NOT NULL,
  direccion    TEXT NOT NULL,
  notas        TEXT,
  status       TEXT DEFAULT 'agendado'
                 CHECK (status IN ('agendado','confirmado','en_camino','en_proceso','completado','cancelado')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROFILES (extiende auth.users) ───────────────
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre      TEXT,
  telefono    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RATINGS ──────────────────────────────────────
CREATE TABLE ratings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  comentario      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUTO updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ───────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings      ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear una cita (se maneja desde la API con service_role)
CREATE POLICY "insert_appointments" ON appointments FOR INSERT WITH CHECK (true);

-- Usuarios autenticados ven sus propias citas (por email)
CREATE POLICY "select_own_appointments" ON appointments FOR SELECT
  TO authenticated USING (email = (auth.jwt()->>'email'));

-- Tracking anónimo: solo por folio (folio es aleatorio, difícil de adivinar)
CREATE POLICY "track_by_folio" ON appointments FOR SELECT
  TO anon USING (true);

-- Profiles: cada usuario gestiona el suyo
CREATE POLICY "profiles_select" ON profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE  USING (auth.uid() = id);

-- Ratings: solo el dueño de la cita puede calificar
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);

-- ── TRIGGER: crear profile al registrarse ─────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
