import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private admin?: SupabaseClient;

  getAdmin() {
    if (!this.admin) {
      const url = process.env.SUPABASE_URL as string;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
      if (!url || !key) throw new Error('Supabase env not configured');
      this.admin = createClient(url, key, { auth: { persistSession: false } });
    }
    return this.admin;
  }
}

