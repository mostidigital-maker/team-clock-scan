CREATE TABLE public.attendance_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.attendance_breaks TO service_role;

ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_attendance_breaks_attendance ON public.attendance_breaks(attendance_id);