
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  id_number text NOT NULL UNIQUE,
  hourly_wage numeric(10,2) NOT NULL DEFAULT 0,
  travel numeric(10,2) NOT NULL DEFAULT 0,
  bonus numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  entry_time timestamptz,
  exit_time timestamptz,
  entry_latitude double precision,
  entry_longitude double precision,
  exit_latitude double precision,
  exit_longitude double precision,
  qr_code_id uuid REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  exit_qr_code_id uuid REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_status_check CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX attendance_employee_date_idx ON public.attendance (employee_id, work_date);

CREATE TABLE public.company_settings (
  id boolean PRIMARY KEY DEFAULT true,
  company_name text NOT NULL DEFAULT 'מכללת המשווקים',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton CHECK (id)
);
INSERT INTO public.company_settings (id, company_name) VALUES (true, 'מכללת המשווקים');

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.admin_users (username, salt, password_hash)
VALUES ('admin', 'mkl-static-salt', encode(digest('mkl-static-salt' || 'admin1234', 'sha256'), 'hex'));

CREATE TABLE public.app_sessions (
  token text PRIMARY KEY,
  kind text NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_sessions_kind_check CHECK (kind IN ('employee','admin'))
);

GRANT ALL ON public.employees TO service_role;
GRANT ALL ON public.qr_codes TO service_role;
GRANT ALL ON public.attendance TO service_role;
GRANT ALL ON public.company_settings TO service_role;
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.app_sessions TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
