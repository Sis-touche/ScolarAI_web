// features/subscriptions/subscriptionSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from '../services/ApiUrl';

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// 1. Thunks (appels API)
// ----------------------------------------------------------------------

// Récupérer la liste paginée des abonnements avec filtres
export const fetchSubscriptions = createAsyncThunk(
  'subscriptions/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = '',
        user_id = '',
        plan_id = '',
        sort = 'created_at',
        order = 'DESC'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(user_id && { user_id }),
        ...(plan_id && { plan_id }),
        sort,
        order
      }).toString();

      const res = await ApiUrl.get(`/api/subscriptions?${queryParams}`);
      if (res.data?.success) {
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des abonnements'));
    }
  }
);

// Récupérer un abonnement par son ID
export const fetchSubscriptionById = createAsyncThunk(
  'subscriptions/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/subscriptions/${id}`);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue('Abonnement non trouvé');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement de l\'abonnement'));
    }
  }
);

// Créer un abonnement (toujours en statut 'pending')
export const createSubscription = createAsyncThunk(
  'subscriptions/create',
  async ({ user_id, plan_id, nb_tranches = 3 }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/subscriptions', { 
        user_id, 
        plan_id,
        nb_tranches  // ← ajouter
      });
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la création');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la création de l\'abonnement'));
    }
  }
);
// Mettre à jour un abonnement (seulement le statut, avec restrictions)
export const updateSubscriptionStatus = createAsyncThunk(
  'subscriptions/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/subscriptions/${id}`, { status });
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

// Décrémenter un crédit de scan (pour l'application mobile)
export const consumeScan = createAsyncThunk(
  'subscriptions/consumeScan',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post(`/api/subscriptions/${id}/scan`);
      if (res.data?.success) {
        return {
          id,
          remainingScans: res.data.remainingScans,
          status: res.data.status
        };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la consommation');
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(getErrorMessage(error, 'Impossible de consommer un crédit'));
    }
  }
);

// Supprimer un abonnement (uniquement si 'pending' et sans dépendances)
export const deleteSubscription = createAsyncThunk(
  'subscriptions/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/subscriptions/${id}`);
      if (res.data?.success) {
        return { id };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la suppression');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 409) {
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
  list: [],                // liste des abonnements (affichage courant)
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  },
  selectedSubscription: null, // abonnement sélectionné (détail / édition)
  loading: false,          // chargement global (fetchSubscriptions)
  error: null,
  // Statuts individuels
  createStatus: 'idle',
  updateStatus: 'idle',
  deleteStatus: 'idle',
  fetchOneStatus: 'idle',
  scanStatus: 'idle'
};

const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {
    setSelectedSubscription: (state, action) => {
      state.selectedSubscription = action.payload;
    },
    clearSelectedSubscription: (state) => {
      state.selectedSubscription = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatuses: (state) => {
      state.createStatus = 'idle';
      state.updateStatus = 'idle';
      state.deleteStatus = 'idle';
      state.fetchOneStatus = 'idle';
      state.scanStatus = 'idle';
    },
    resetSubscriptions: (state) => {
      state.list = [];
      state.pagination = initialState.pagination;
      state.selectedSubscription = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchSubscriptions ==========
      .addCase(fetchSubscriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchSubscriptionById ==========
      .addCase(fetchSubscriptionById.pending, (state) => {
        state.fetchOneStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchSubscriptionById.fulfilled, (state, action) => {
        state.fetchOneStatus = 'succeeded';
        state.selectedSubscription = action.payload;
      })
      .addCase(fetchSubscriptionById.rejected, (state, action) => {
        state.fetchOneStatus = 'failed';
        state.error = action.payload;
      })

      // ========== createSubscription ==========
      .addCase(createSubscription.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // Ajouter le nouvel abonnement en tête de liste
        state.list.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        state.selectedSubscription = action.payload;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updateSubscriptionStatus ==========
      .addCase(updateSubscriptionStatus.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updateSubscriptionStatus.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(sub => sub.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selectedSubscription?.id === action.payload.id) {
          state.selectedSubscription = action.payload;
        }
      })
      .addCase(updateSubscriptionStatus.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== consumeScan ==========
      .addCase(consumeScan.pending, (state) => {
        state.scanStatus = 'loading';
        state.error = null;
      })
      .addCase(consumeScan.fulfilled, (state, action) => {
        state.scanStatus = 'succeeded';
        // Mettre à jour l'abonnement dans la liste avec les nouvelles valeurs
        const index = state.list.findIndex(sub => sub.id === action.payload.id);
        if (index !== -1) {
          state.list[index].remainingScans = action.payload.remainingScans;
          state.list[index].status = action.payload.status;
        }
        if (state.selectedSubscription?.id === action.payload.id) {
          state.selectedSubscription.remainingScans = action.payload.remainingScans;
          state.selectedSubscription.status = action.payload.status;
        }
      })
      .addCase(consumeScan.rejected, (state, action) => {
        state.scanStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deleteSubscription ==========
      .addCase(deleteSubscription.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deleteSubscription.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(sub => sub.id !== action.payload.id);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedSubscription?.id === action.payload.id) {
          state.selectedSubscription = null;
        }
      })
      .addCase(deleteSubscription.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
      });
  }
});

// Export des actions normales
export const {
  setSelectedSubscription,
  clearSelectedSubscription,
  clearError,
  resetStatuses,
  resetSubscriptions
} = subscriptionSlice.actions;

// Export du reducer par défaut
export default subscriptionSlice.reducer;