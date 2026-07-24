import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Listing = {
  id: string;
  address: string;
  suburb: string;
  region: string;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  sale_method: string | null;
  sale_method_date: string | null;
  open_home_start: string | null;
  open_home_end: string | null;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  status: string;
};
