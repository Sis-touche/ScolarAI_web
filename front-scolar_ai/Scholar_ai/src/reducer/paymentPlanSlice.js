// features/paymentPlans/paymentPlanSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from "../services/ApiUrl";

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// 1. Thunks (appels API)
// ----------------------------------------------------------------------

// Récupérer la liste paginée avec filtres
export const fetchPaymentPlans = createAsyncThunk(
  'paymentPlans/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = '',
        subscription_id = '',
        invoice_id = '',
        sort = 'installment_number',
        order = 'ASC'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(subscription_id && { subscription_id }),
        ...(invoice_id && { invoice_id }),
        sort,
        order
      }).toString();

      const res = await ApiUrl.get(`/api/payment-plans?${queryParams}`);
      if (res.data?.success) {
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des tranches'));
    }
  }
);

// Récupérer une tranche par son ID
export const fetchPaymentPlanById = createAsyncThunk(
  'paymentPlans/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/payment-plans/${id}`);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue('Tranche non trouvée');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement de la tranche'));
    }
  }
);

// Créer une nouvelle tranche
export const createPaymentPlan = createAsyncThunk(
  'paymentPlans/create',
  async (planData, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/payment-plans', planData);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la création');
    } catch (error) {
      if (error.response?.status === 409) {
        return rejectWithValue(error.response.data.message || 'Conflit : numéro de tranche déjà existant');
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la création de la tranche'));
    }
  }
);

// Mettre à jour une tranche
export const updatePaymentPlan = createAsyncThunk(
  'paymentPlans/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/payment-plans/${id}`, data);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la mise à jour');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  }
);

// Supprimer une tranche
export const deletePaymentPlan = createAsyncThunk(
  'paymentPlans/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/payment-plans/${id}`);
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

// ----------------------------------------------------------------------
// 2. Slice
// ----------------------------------------------------------------------
const initialState = {
  list: [],           // liste des tranches (affichage courant)
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  },
  selectedPlan: null, // tranche sélectionnée (détail / édition)
  loading: false,     // chargement global (fetchAll)
  error: null,
  // Statuts individuels
  createStatus: 'idle',
  updateStatus: 'idle',
  deleteStatus: 'idle',
  fetchOneStatus: 'idle'
};

const paymentPlanSlice = createSlice({
  name: 'paymentPlans',
  initialState,
  reducers: {
    setSelectedPlan: (state, action) => {
      state.selectedPlan = action.payload;
    },
    clearSelectedPlan: (state) => {
      state.selectedPlan = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatuses: (state) => {
      state.createStatus = 'idle';
      state.updateStatus = 'idle';
      state.deleteStatus = 'idle';
      state.fetchOneStatus = 'idle';
    },
    resetPlans: (state) => {
      state.list = [];
      state.pagination = initialState.pagination;
      state.selectedPlan = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchPaymentPlans ==========
      .addCase(fetchPaymentPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPaymentPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchPaymentPlanById ==========
      .addCase(fetchPaymentPlanById.pending, (state) => {
        state.fetchOneStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchPaymentPlanById.fulfilled, (state, action) => {
        state.fetchOneStatus = 'succeeded';
        state.selectedPlan = action.payload;
      })
      .addCase(fetchPaymentPlanById.rejected, (state, action) => {
        state.fetchOneStatus = 'failed';
        state.error = action.payload;
      })

      // ========== createPaymentPlan ==========
      .addCase(createPaymentPlan.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createPaymentPlan.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // Ajouter la nouvelle tranche en tête de liste si on est sur la page 1 (optionnel)
        state.list.unshift(action.payload);
        state.pagination.total += 1;
        // Recalcul simple du nombre de pages (optionnel)
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createPaymentPlan.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updatePaymentPlan ==========
      .addCase(updatePaymentPlan.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePaymentPlan.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(plan => plan.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selectedPlan?.id === action.payload.id) {
          state.selectedPlan = action.payload;
        }
      })
      .addCase(updatePaymentPlan.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deletePaymentPlan ==========
      .addCase(deletePaymentPlan.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deletePaymentPlan.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(plan => plan.id !== action.payload.id);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedPlan?.id === action.payload.id) {
          state.selectedPlan = null;
        }
      })
      .addCase(deletePaymentPlan.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
      });
  }
});

// Export des actions normales
export const {
  setSelectedPlan,
  clearSelectedPlan,
  clearError,
  resetStatuses,
  resetPlans
} = paymentPlanSlice.actions;

// Export du reducer par défaut
export default paymentPlanSlice.reducer;