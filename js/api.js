// js/api.js - Supabase Client Integration

const SUPABASE_URL = 'https://wulylpywtdgoxamwlxlu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bHlscHl3dGRnb3hhbXdseGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTgyMjYsImV4cCI6MjEwMjczNDIyNn0.6usgf9zXJ3ewsRrklNPBX1ByrAPybWsd2UGc2BPg_-I';
// Safe initialization of Supabase client
const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const InventoryAPI = {
  /**
   * Step 1 & 2: Fetch books directly from Supabase 'books' table
   */
  async getBooks(category = 'all', searchQuery = '') {
    if (!supabase) {
      throw new Error("Supabase library not loaded. Ensure CDN script is included in <head>.");
    }

    try {
      let query = supabase.from('books').select('*');

      // Filter by category or stock
      if (category === 'in-stock') {
        query = query.gt('stock_quantity', 0);
      } else if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      // Filter search query
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error fetching books:', error);
      throw error;
    }
  },

  /**
   * Step 3: Insert hold request into Supabase 'reservations' table
   */
  async createReservation(reservationData) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error creating reservation:', error);
      throw error;
    }
  },

  /**
   * Step 4: Check reservation status for pickup alert
   */
  async getReservationStatus(reservationId) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error checking status:', error);
      throw error;
    }
  }
};