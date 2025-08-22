-- Create table for PowerShell scripts
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read, create, update and delete scripts (since no auth is implemented)
CREATE POLICY "Anyone can view scripts" 
ON public.scripts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create scripts" 
ON public.scripts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scripts" 
ON public.scripts 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scripts" 
ON public.scripts 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();