-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create company settings table
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Mapa Apressado Logística e Transporte',
  company_nif TEXT NOT NULL DEFAULT '',
  standard_hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_national BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create time entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  entry_time TIME,
  lunch_exit_time TIME,
  lunch_return_time TIME,
  exit_time TIME,
  total_hours DECIMAL(4,2),
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, entry_date)
);

-- Create timesheets table for PDF generation history
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  pdf_url TEXT,
  signature_data TEXT,
  total_hours DECIMAL(6,2),
  total_overtime DECIMAL(6,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'submitted')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, month, year)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for company_settings
CREATE POLICY "Everyone can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for holidays
CREATE POLICY "Everyone can view holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all time entries"
  ON public.time_entries FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for timesheets
CREATE POLICY "Users can view their own timesheets"
  ON public.timesheets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own timesheets"
  ON public.timesheets FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all timesheets"
  ON public.timesheets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign employee role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default company settings
INSERT INTO public.company_settings (company_name, company_nif, standard_hours_per_day)
VALUES ('Mapa Apressado Logística e Transporte', '', 8.00);

-- Add some common Portuguese holidays for 2025
INSERT INTO public.holidays (holiday_date, description, is_national) VALUES
  ('2025-01-01', 'Ano Novo', true),
  ('2025-04-18', 'Sexta-feira Santa', true),
  ('2025-04-20', 'Páscoa', true),
  ('2025-04-25', 'Dia da Liberdade', true),
  ('2025-05-01', 'Dia do Trabalhador', true),
  ('2025-06-10', 'Dia de Portugal', true),
  ('2025-06-19', 'Corpo de Deus', true),
  ('2025-08-15', 'Assunção de Nossa Senhora', true),
  ('2025-10-05', 'Implantação da República', true),
  ('2025-11-01', 'Todos os Santos', true),
  ('2025-12-01', 'Restauração da Independência', true),
  ('2025-12-08', 'Imaculada Conceição', true),
  ('2025-12-25', 'Natal', true);