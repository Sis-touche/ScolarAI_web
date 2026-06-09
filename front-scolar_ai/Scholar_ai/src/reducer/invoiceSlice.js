// features/invoices/invoiceSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from '../services/ApiUrl';

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// 1. Thunks (appels API)
// ----------------------------------------------------------------------

// Récupérer la liste paginée des factures avec filtres
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = '',
        user_id = '',
        subscription_id = '',
        sort = 'created_at',
        order = 'DESC'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(user_id && { user_id }),
        ...(subscription_id && { subscription_id }),
        sort,
        order
      }).toString();

      const res = await ApiUrl.get(`/api/invoices?${queryParams}`);
      if (res.data?.success) {
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des factures'));
    }
  }
);

// Récupérer une facture par son ID
export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/invoices/${id}`);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue('Facture non trouvée');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement de la facture'));
    }
  }
);

// Récupérer les factures par statut (méthode statique)
export const fetchInvoicesByStatus = createAsyncThunk(
  'invoices/fetchByStatus',
  async (status, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/invoices/status/${status}`);
      if (res.data?.success) {
        return {
          status,
          count: res.data.count,
          data: res.data.data
        };
      }
      return rejectWithValue('Réponse invalide');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du filtrage par statut'));
    }
  }
);

// Rechercher des factures par numéro (search)
export const searchInvoices = createAsyncThunk(
  'invoices/search',
  async (query, { rejectWithValue }) => {
    try {
      if (!query || !query.trim()) {
        return rejectWithValue('Le paramètre de recherche est requis');
      }
      const res = await ApiUrl.get(`/api/invoices/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data?.success) {
        return {
          query,
          count: res.data.count,
          data: res.data.data
        };
      }
      return rejectWithValue('Réponse invalide');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la recherche'));
    }
  }
);

// Créer une nouvelle facture
export const createInvoice = createAsyncThunk(
  'invoices/create',
  async (invoiceData, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/invoices', invoiceData);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la création');
    } catch (error) {
      if (error.response?.status === 409) {
        return rejectWithValue('Numéro de facture déjà existant');
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la création de la facture'));
    }
  }
);

// Mettre à jour une facture
export const updateInvoice = createAsyncThunk(
  'invoices/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/invoices/${id}`, data);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la mise à jour');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      if (error.response?.status === 409) {
        return rejectWithValue('Numéro de facture déjà utilisé');
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  }
);

// Supprimer une facture
export const deleteInvoice = createAsyncThunk(
  'invoices/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/invoices/${id}`);
      if (res.data?.success) {
        return { id };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la suppression');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      if (error.response?.status === 409) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  }
);

// ----------------------------------------------------------------------
// 2. Slice
// ----------------------------------------------------------------------
const initialState = {
  list: [],                // liste des factures (affichage courant)
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  },
  selectedInvoice: null,   // facture sélectionnée (détail / édition)
  loading: false,          // chargement global (fetchInvoices)
  error: null,
  // Statuts individuels
  createStatus: 'idle',
  updateStatus: 'idle',
  deleteStatus: 'idle',
  fetchOneStatus: 'idle',
  searchStatus: 'idle',
  // Résultats de recherche (peut être distinct de la liste principale)
  searchResults: null,
  lastSearchQuery: null
};

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatuses: (state) => {
      state.createStatus = 'idle';
      state.updateStatus = 'idle';
      state.deleteStatus = 'idle';
      state.fetchOneStatus = 'idle';
      state.searchStatus = 'idle';
    },
    resetInvoices: (state) => {
      state.list = [];
      state.pagination = initialState.pagination;
      state.selectedInvoice = null;
      state.searchResults = null;
      state.lastSearchQuery = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
      state.lastSearchQuery = null;
      state.searchStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchInvoices ==========
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchInvoiceById ==========
      .addCase(fetchInvoiceById.pending, (state) => {
        state.fetchOneStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.fetchOneStatus = 'succeeded';
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.fetchOneStatus = 'failed';
        state.error = action.payload;
      })

      // ========== fetchInvoicesByStatus ==========
      .addCase(fetchInvoicesByStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoicesByStatus.fulfilled, (state, action) => {
        state.loading = false;
        // On remplace la liste par les résultats du statut
        state.list = action.payload.data;
        state.pagination = {
          total: action.payload.count,
          page: 1,
          limit: action.payload.data.length,
          totalPages: 1
        };
      })
      .addCase(fetchInvoicesByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== searchInvoices ==========
      .addCase(searchInvoices.pending, (state) => {
        state.searchStatus = 'loading';
        state.error = null;
      })
      .addCase(searchInvoices.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        state.searchResults = action.payload.data;
        state.lastSearchQuery = action.payload.query;
      })
      .addCase(searchInvoices.rejected, (state, action) => {
        state.searchStatus = 'failed';
        state.error = action.payload;
      })

      // ========== createInvoice ==========
      .addCase(createInvoice.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // Ajouter la nouvelle facture en tête de liste si on est sur la page 1
        state.list.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updateInvoice ==========
      .addCase(updateInvoice.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(inv => inv.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selectedInvoice?.id === action.payload.id) {
          state.selectedInvoice = action.payload;
        }
        // Mettre à jour les résultats de recherche si la facture modifiée y figure
        if (state.searchResults) {
          const searchIndex = state.searchResults.findIndex(inv => inv.id === action.payload.id);
          if (searchIndex !== -1) state.searchResults[searchIndex] = action.payload;
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deleteInvoice ==========
      .addCase(deleteInvoice.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(inv => inv.id !== action.payload.id);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedInvoice?.id === action.payload.id) {
          state.selectedInvoice = null;
        }
        if (state.searchResults) {
          state.searchResults = state.searchResults.filter(inv => inv.id !== action.payload.id);
        }
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
      });
  }
});

// Export des actions normales
export const {
  setSelectedInvoice,
  clearSelectedInvoice,
  clearError,
  resetStatuses,
  resetInvoices,
  clearSearchResults
} = invoiceSlice.actions;

// Export du reducer par défaut
export default invoiceSlice.reducer;