ALTER TABLE public.comp_models ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'tiers';
ALTER TABLE public.comp_models ADD COLUMN IF NOT EXISTS percent numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.comp_model_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.comp_models(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.comp_model_rates TO service_role;
ALTER TABLE public.comp_model_rates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employee_monthly_stats ADD COLUMN IF NOT EXISTS revenue_by_type jsonb NOT NULL DEFAULT '{}'::jsonb;