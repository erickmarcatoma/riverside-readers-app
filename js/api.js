// js/api.js - Supabase Client Integration
//
// Reads/writes the TEAM'S SHARED tables (Books, Inventory, Customers, Purchases)
// instead of this app's own books/reservations tables, so pre-orders placed here
// show up on the ops dashboard and reflect real shared stock levels for everyone.

const SUPABASE_URL = 'https://wulylpywtdgoxamwlxlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bHlscHl3dGRnb3hhbXdseGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTgyMjYsImV4cCI6MjEwMjczNDIyNn0.6usgf9zXJ3ewsRrklNPBX1ByrAPybWsd2UGc2BPg_-I';

const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const PURCHASE_STATUS_TO_UI = {
  'Pending': 'pending',
  'Ready for Pickup': 'ready_for_pickup',
  'Completed': 'completed',
  'Cancelled': 'cancelled',
};

async function fetchInventoryMap() {
  const { data, error } = await supabase.from('Inventory').select('book_id, qty_in_stock');
  if (error) throw error;
  const map = {};
  data.forEach((row) => {
    map[row.book_id] = row.qty_in_stock;
  });
  return map;
}

export const InventoryAPI = {
  /**
   * Step 1 & 2: Fetch books from the shared "Books" catalog, joined with
   * live stock from the shared "Inventory" table.
   */
  async getBooks(category = 'all', searchQuery = '') {
    if (!supabase) {
      throw new Error("Supabase client not initialized. Ensure CDN script is included in <head>.");
    }

    try {
      let query = supabase.from('Books').select('*');

      // "in-stock" is a stock filter, not a genre - applied after the stock join below.
      // Any other non-"all" category filters on genre (this app's filter buttons
      // currently use Fiction/Non-Fiction, which won't match the catalog's actual
      // genre values like "Fantasy"/"Romance" - a content mismatch to revisit).
      if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'in-stock') {
        query = query.ilike('genre', category);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%`);
      }

      const { data: books, error } = await query;
      if (error) throw error;

      const stockMap = await fetchInventoryMap();

      let results = (books || []).map((b) => ({
        book_id: b.book_id,
        isbn: b.isbn,
        title: b.title,
        author: b.author,
        price: b.regular_price,
        stock_quantity: stockMap[b.book_id] ?? 0,
        cover_image_url: null,
      }));

      if (category && category.toLowerCase() === 'in-stock') {
        results = results.filter((b) => b.stock_quantity > 0);
      }

      return results;
    } catch (error) {
      console.error('Supabase Error fetching books:', error);
      throw error;
    }
  },

  /**
   * Helper: Look up a book's shared catalog ID using its ISBN
   */
  async getBookByIsbn(isbn) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('Books')
        .select('book_id, title, regular_price')
        .eq('isbn', isbn)
        .single();

      if (error) throw error;
      return { id: data.book_id, title: data.title, price: data.regular_price };
    } catch (error) {
      console.error('Supabase Error fetching book by ISBN:', error);
      throw error;
    }
  },

  /**
   * Step 3: Record a pre-order as a row in the shared "Purchases" table
   * (order_type: 'Pre-order', status: 'Pending'), matching or creating the
   * customer in the shared "Customers" table, and holding the copy by
   * decrementing "Inventory".qty_in_stock so it can't be double-reserved.
   */
  async createReservation(reservationData) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const { book_id, book_title, customer_name, customer_contact } = reservationData;

    try {
      const isEmail = (customer_contact || '').includes('@');
      const contactColumn = isEmail ? 'email' : 'phone';

      const { data: existingCustomer } = await supabase
        .from('Customers')
        .select('customer_id')
        .eq(contactColumn, customer_contact)
        .maybeSingle();

      let customerId = existingCustomer?.customer_id;

      if (!customerId) {
        const [firstName, ...rest] = (customer_name || '').trim().split(/\s+/);
        customerId = 'CUST-' + crypto.randomUUID();

        const { error: customerError } = await supabase.from('Customers').insert([{
          customer_id: customerId,
          first_name: firstName || customer_name || null,
          last_name: rest.join(' ') || null,
          email: isEmail ? customer_contact : null,
          phone: isEmail ? null : customer_contact,
          stamp_count: 0,
        }]);

        if (customerError) throw customerError;
      }

      const { data: bookRow } = await supabase
        .from('Books')
        .select('regular_price')
        .eq('book_id', book_id)
        .maybeSingle();

      const purchaseId = 'PUR-' + crypto.randomUUID();

      const { data: purchase, error: purchaseError } = await supabase
        .from('Purchases')
        .insert([{
          purchase_id: purchaseId,
          customer_id: customerId,
          purchase_type: 'Book',
          book_id: book_id,
          quantity: 1,
          order_type: 'Pre-order',
          status: 'Pending',
          date: new Date().toISOString().slice(0, 10),
          original_price: bookRow?.regular_price ?? null,
          price_paid: 0,
          discount_applied: 0,
          points_earned: 0,
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Hold the copy immediately so two customers can't both reserve the last one.
      const { data: invRow } = await supabase
        .from('Inventory')
        .select('qty_in_stock')
        .eq('book_id', book_id)
        .maybeSingle();

      if (invRow && invRow.qty_in_stock > 0) {
        await supabase
          .from('Inventory')
          .update({ qty_in_stock: invRow.qty_in_stock - 1 })
          .eq('book_id', book_id);
      }

      return { id: purchase.purchase_id, book_title, status: 'pending' };
    } catch (error) {
      console.error('Supabase Error creating reservation:', error);
      throw error;
    }
  },

  /**
   * Step 4: Check pre-order status (for pickup alert polling) from the
   * shared "Purchases" table.
   */
  async getReservationStatus(reservationId) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const { data, error } = await supabase
        .from('Purchases')
        .select('purchase_id, status, book_id')
        .eq('purchase_id', reservationId)
        .single();

      if (error) throw error;

      let bookTitle;
      if (data.book_id) {
        const { data: book } = await supabase
          .from('Books')
          .select('title')
          .eq('book_id', data.book_id)
          .maybeSingle();
        bookTitle = book?.title;
      }

      return {
        id: data.purchase_id,
        status: PURCHASE_STATUS_TO_UI[data.status] || data.status,
        book_title: bookTitle,
      };
    } catch (error) {
      console.error('Supabase Error checking reservation status:', error);
      throw error;
    }
  },
};
