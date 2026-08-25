// js/api.js - Supabase Client Integration

const SUPABASE_URL = 'https://wulylpywtdgoxamwlxlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bHlscHl3dGRnb3hhbXdseGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTgyMjYsImV4cCI6MjEwMjczNDIyNn0.6usgf9zXJ3ewsRrklNPBX1ByrAPybWsd2UGc2BPg_-I';

// Initialize Supabase client globally
const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const InventoryAPI = {
  async getBooks(category = 'all', searchQuery = '') {
    if (!supabase) throw new Error("Supabase library not loaded.");

    try {
      let query = supabase.from('Books').select('*');

      if (category === 'bestseller') {
        query = query.eq('bestseller', true);
      } else if (category === 'staff-pick') {
        query = query.eq('staff_pick', true);
      } else if (category && category !== 'all' && category !== 'in-stock') {
        query = query.eq('genre', category);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`);
      }

      const { data: books, error: booksError } = await query;
      if (booksError) throw booksError;

      if (!books || books.length === 0) return [];

      const bookIds = books.map(b => b.book_id);
      const { data: inventory, error: invError } = await supabase
        .from('Inventory')
        .select('book_id, qty_in_stock, low_stock_threshold, needs_reorder')
        .in('book_id', bookIds);

      if (invError) throw invError;

      const merged = books.map(book => {
        const stock = inventory?.find(inv => inv.book_id === book.book_id);
        return {
          ...book,
          stock_quantity: stock?.qty_in_stock ?? 0,
          low_stock_threshold: stock?.low_stock_threshold ?? 2,
          needs_reorder: stock?.needs_reorder ?? false
        };
      });

      if (category === 'in-stock') {
        return merged.filter(b => b.stock_quantity > 0);
      }

      return merged;
    } catch (error) {
      console.error('Supabase Error fetching books:', error);
      throw error;
    }
  },

  async getBookByIsbn(isbn) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('Books')
        .select('*')
        .eq('isbn', isbn)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error fetching book by ISBN:', error);
      throw error;
    }
  },

  async getOrCreateCustomer(fullName, email, phone) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const cleanEmail = (email || '').trim().toLowerCase();

      const { data: existing, error: findError } = await supabase
        .from('Customers')
        .select('customer_id')
        .eq('email', cleanEmail) 
        .maybeSingle();

      if (findError) throw findError;
      if (existing) return existing.customer_id;

      const nameParts = (fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newCustomerId = crypto.randomUUID();
      const { data: created, error: createError } = await supabase
        .from('Customers')
        .insert([{
          customer_id: newCustomerId,
          first_name: firstName,
          last_name: lastName,
          email: cleanEmail,
          phone: phone,
          stamp_count: 0
        }])
        .select()
        .single();

      if (createError) throw createError;
      return created.customer_id;
    } catch (error) {
      console.error('Supabase Error with customer lookup/creation:', error);
      throw error;
    }
  },

  async createReservation({ bookId, customerName, customerEmail, customerPhone, quantity = 1, regularPrice }) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const customerId = await this.getOrCreateCustomer(customerName, customerEmail, customerPhone);
      const purchaseId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      const purchaseData = {
        purchase_id: purchaseId,
        customer_id: customerId,
        purchase_type: 'Book',
        book_id: bookId,
        quantity: quantity,
        order_type: 'Pre-order',
        status: 'Pending',
        purchased_on: today,
        original_unit_price: regularPrice,
        price_paid: regularPrice,
        discount_applied: 0,
        points_earned: quantity,
        receipt_number: null
      };

      const { data, error } = await supabase
        .from('Purchases')
        .insert([purchaseData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error creating purchase:', error);
      throw error;
    }
  },

  async getReservationStatus(purchaseId) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('Purchases')
        .select('*')
        .eq('purchase_id', purchaseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Error checking status:', error);
      throw error;
    }
  },

  async getCustomerLoyaltyPoints(email) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const cleanEmail = (email || '').trim().toLowerCase();

      const { data: customer, error: customerError } = await supabase
        .from('Customers')
        .select('stamp_count')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) return 0;

      // Directly return the stamp_count from the customer record
      return customer.stamp_count ?? 0;

    } catch (error) {
      console.error('Supabase Error fetching loyalty points:', error);
      return 0;
    }
  }
};