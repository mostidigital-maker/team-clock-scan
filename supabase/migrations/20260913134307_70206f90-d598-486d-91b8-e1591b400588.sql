CREATE TABLE public.comp_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comp_model_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.comp_models(id) ON DELETE CASCADE,
  min_sales integer NOT NULL DEFAULT 0,
  max_sales integer,
  kind text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comp_model_tiers_model_idx ON public.comp_model_tiers(model_id);

GRANT ALL ON public.comp_models TO service_role;
GRANT ALL ON public.comp_model_tiers TO service_role;

ALTER TABLE public.comp_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_model_tiers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_comp_models_updated_at
BEFORE UPDATE ON public.comp_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.employees
  ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly',
  ADD COLUMN monthly_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN comp_model_id uuid REFERENCES public.comp_models(id) ON DELETE SET NULL;

WITH m AS (
  INSERT INTO public.comp_models (name) VALUES ('מודל תגמול נציג') RETURNING id
), t AS (
  INSERT INTO public.comp_model_tiers (model_id, min_sales, max_sales, kind, value)
  SELECT m.id, v.min_sales, v.max_sales, 'percent', v.value
  FROM m, (VALUES (0, 4, 2), (5, 9, 4), (10, 15, 5), (16, NULL::integer, 6)) AS v(min_sales, max_sales, value)
  RETURNING 1
)
UPDATE public.employees SET comp_model_id = (SELECT id FROM m) WHERE comp_model_id IS NULL;