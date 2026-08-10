ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'qr';
ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_kind_check CHECK (kind IN ('qr','home'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS work_mode text NOT NULL DEFAULT 'site';
ALTER TABLE public.attendance ADD CONSTRAINT attendance_work_mode_check CHECK (work_mode IN ('site','home'));