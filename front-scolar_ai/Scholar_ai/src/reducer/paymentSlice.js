// features/payments/paymentSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from "../services/ApiUrl";

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// 1. Thunks (appels API)
// ----------------------------------------------------------------------

// Récupérer la liste paginée des paiements avec filtres
export const fetchPayments = createAsyncThunk(
  'payments/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = '',
        method = '',
        user_id = '',
        payment_plan_id = '',
        invoice_id = '',
        sort = 'created_at',
        order = 'DESC'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(method && { method }),
        ...(user_id && { user_id }),
        ...(payment_plan_id && { payment_plan_id }),
        ...(invoice_id && { invoice_id }),
        sort,
        order
      }).toString();

      const res = await ApiUrl.get(`/api/payments?${queryParams}`);
      if (res.data?.success) {
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des paiements'));
    }
  }
);

// Récupérer un paiement par son ID
export const fetchPaymentById = createAsyncThunk(
  'payments/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/payments/${id}`);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue('Paiement non trouvé');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement du paiement'));
    }
  }
);

// Initier un paiement pour une tranche donnée
export const initiatePayment = createAsyncThunk(
  'payments/initiate',
  async ({ payment_plan_id, user_id, method, notes }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/payments/initiate', {
        payment_plan_id,
        user_id,
        method,
        notes
      });
      if (res.data?.success) {
        // Retourne le paiement créé et l'URL de simulation
        return {
          payment: res.data.data,
          payment_id: res.data.payment_id,
          transaction_ref: res.data.transaction_ref,
          simulation_url: res.data.simulation_url
        };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de l’initiation');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de l’initiation du paiement'));
    }
  }
);

// Mettre à jour un paiement (admin, seulement si non confirmé/remboursé)
export const updatePayment = createAsyncThunk(
  'payments/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/payments/${id}`, data);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la mise à jour');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      if (error.response?.status === 409) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  }
);

// Supprimer un paiement (seulement si non confirmé)
export const deletePayment = createAsyncThunk(
  'payments/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/payments/${id}`);
      if (res.data?.success) {
        return { id };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la suppression');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  }
);

// Récupérer les paiements par statut (méthode statique)
export const fetchPaymentsByStatus = createAsyncThunk(
  'payments/fetchByStatus',
  async (status, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/payments/status/${status}`);
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

// Raccourci pour les paiements confirmés
export const fetchConfirmedPayments = createAsyncThunk(
  'payments/fetchConfirmed',
  async (_, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get('/api/payments/confirmed');
      if (res.data?.success) {
        return {
          count: res.data.count,
          data: res.data.data
        };
      }
      return rejectWithValue('Réponse invalide');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des paiements confirmés'));
    }
  }
);

// ----------------------------------------------------------------------
// 2. Slice
// ----------------------------------------------------------------------
const initialState = {
  list: [],           // liste des paiements (affichage courant)
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  },
  selectedPayment: null,  // paiement sélectionné (détail / édition)
  loading: false,          // chargement global (fetchPayments)
  error: null,
  // Statuts individuels
  initiateStatus: 'idle',  // 'idle' | 'loading' | 'succeeded' | 'failed'
  updateStatus: 'idle',
  deleteStatus: 'idle',
  fetchOneStatus: 'idle',
  // Stockage de l'URL de simulation après initiation
  currentSimulationUrl: null,
  currentTransactionRef: null
};

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSelectedPayment: (state, action) => {
      state.selectedPayment = action.payload;
    },
    clearSelectedPayment: (state) => {
      state.selectedPayment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatuses: (state) => {
      state.initiateStatus = 'idle';
      state.updateStatus = 'idle';
      state.deleteStatus = 'idle';
      state.fetchOneStatus = 'idle';
    },
    resetPayments: (state) => {
      state.list = [];
      state.pagination = initialState.pagination;
      state.selectedPayment = null;
      state.currentSimulationUrl = null;
      state.currentTransactionRef = null;
    },
    clearSimulationData: (state) => {
      state.currentSimulationUrl = null;
      state.currentTransactionRef = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchPayments ==========
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchPaymentById ==========
      .addCase(fetchPaymentById.pending, (state) => {
        state.fetchOneStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.fetchOneStatus = 'succeeded';
        state.selectedPayment = action.payload;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.fetchOneStatus = 'failed';
        state.error = action.payload;
      })

      // ========== initiatePayment ==========
      .addCase(initiatePayment.pending, (state) => {
        state.initiateStatus = 'loading';
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.initiateStatus = 'succeeded';
        state.currentSimulationUrl = action.payload.simulation_url;
        state.currentTransactionRef = action.payload.transaction_ref;
        // Optionnel : ajouter le nouveau paiement (pending) en tête de liste
        state.list.unshift(action.payload.payment);
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.initiateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updatePayment ==========
      .addCase(updatePayment.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePayment.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
      })
      .addCase(updatePayment.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deletePayment ==========
      .addCase(deletePayment.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deletePayment.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(p => p.id !== action.payload.id);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = null;
        }
      })
      .addCase(deletePayment.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
      })

      // ========== fetchPaymentsByStatus ==========
      .addCase(fetchPaymentsByStatus.pending, (state) => {
        // On pourrait utiliser un statut spécifique, mais ici on utilise loading générique
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsByStatus.fulfilled, (state, action) => {
        state.loading = false;
        // On remplace la liste par les résultats du statut (optionnel)
        state.list = action.payload.data;
        // Réinitialiser la pagination pour ce mode
        state.pagination = { total: action.payload.count, page: 1, limit: action.payload.data.length, totalPages: 1 };
      })
      .addCase(fetchPaymentsByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchConfirmedPayments ==========
      .addCase(fetchConfirmedPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfirmedPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = { total: action.payload.count, page: 1, limit: action.payload.data.length, totalPages: 1 };
      })
      .addCase(fetchConfirmedPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export des actions normales
export const {
  setSelectedPayment,
  clearSelectedPayment,
  clearError,
  resetStatuses,
  resetPayments,
  clearSimulationData
} = paymentSlice.actions;

// Export du reducer par défaut
export default paymentSlice.reducer;