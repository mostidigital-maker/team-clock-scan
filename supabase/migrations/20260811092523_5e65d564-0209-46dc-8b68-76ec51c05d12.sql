CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.employee_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month text NOT NULL,
  sales_count integer NOT NULL DEFAULT 0,
  potential_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, month)
);

GRANT ALL ON public.employee_monthly_stats TO service_role;

ALTER TABLE public.employee_monthly_stats ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_employee_monthly_stats_updated_at
BEFORE UPDATE ON public.employee_monthly_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();