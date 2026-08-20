// js/api.js - Supabase Client Integration

// Corrected Supabase project URL and Anon Key
const SUPABASE_URL = 'https://wulylpywtdgoxamwlxlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bHlscHl3dGRnb3hhbXdseGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTgyMjYsImV4cCI6MjEwMjczNDIyNn0.6usgf9zXJ3ewsRrklNPBX1ByrAPybWsd2UGc2BPg_-I';

// Initialize Supabase client globally
const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const InventoryAPI = {
  /**
   * Step 1 & 2: Fetch books directly from Supabase 'books' table
   * Supports filtering by stock status, category, and real-time search queries
   */
  async getBooks(category = 'all', searchQuery = '') {
    if (!supabase) {
      throw new Error("Supabase client not initialized. Ensure CDN script is included in <head>.");
    }

    try {
      let query = supabase.from('books').select('*');

      // 1. Filter by Stock Quantity
      if (category === 'in-stock') {
        query = query.gt('stock_quantity', 0);
      } 
      // 2. Case-Insensitive Category Filter
      else if (category && category.toLowerCase() !== 'all') {
        query = query.ilike('category', category);
      }

      // 3. Case-Insensitive Search Query (Matches Title or Author)
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
   * Helper: Look up a book's primary ID using its ISBN
   */
  async getBookByIsbn(isbn) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error fetching book by ISBN:', error);
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
   * Step 4: Check reservation status for pickup alert polling
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
      console.error('Supabase Error checking reservation status:', error);
      throw error;
    }
  }
};