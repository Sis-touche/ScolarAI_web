// features/plans/planSlice.js
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
export const fetchPlans = createAsyncThunk(
  'plans/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        type = '',
        search = '',
        sort = 'price',
        order = 'ASC'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(type && { type }),
        ...(search && { search }),
        sort,
        order
      }).toString();

      const res = await ApiUrl.get(`/api/plans?${queryParams}`);
      if (res.data?.success) {
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement des plans'));
    }
  }
);

// Récupérer un plan par son ID
export const fetchPlanById = createAsyncThunk(
  'plans/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/plans/${id}`);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue('Plan non trouvé');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement du plan'));
    }
  }
);

// Créer un nouveau plan
export const createPlan = createAsyncThunk(
  'plans/create',
  async (planData, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/plans', planData);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la création');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la création du plan'));
    }
  }
);

// Mettre à jour un plan
export const updatePlan = createAsyncThunk(
  'plans/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/plans/${id}`, data);
      if (res.data?.success) {
        return res.data.data;
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la mise à jour');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  }
);

// Supprimer un plan
export const deletePlan = createAsyncThunk(
  'plans/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/plans/${id}`);
      if (res.data?.success) {
        return { id }; // on retourne juste l'id pour mise à jour locale
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la suppression');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  }
);

// ----------------------------------------------------------------------
// 2. Slice
// ----------------------------------------------------------------------
const initialState = {
  list: [],           // liste des plans (utilisée pour l'affichage)
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  },
  selectedPlan: null, // plan en cours d'édition/détail
  loading: false,     // chargement global (fetchAll)
  error: null,
  // Statuts individuels pour feedback UI
  createStatus: 'idle',    // 'idle' | 'loading' | 'succeeded' | 'failed'
  updateStatus: 'idle',
  deleteStatus: 'idle',
  fetchOneStatus: 'idle'
};

const planSlice = createSlice({
  name: 'plans',
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
    // Pour réinitialiser la pagination / liste si besoin
    resetPlans: (state) => {
      state.list = [];
      state.pagination = initialState.pagination;
      state.selectedPlan = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchPlans ==========
      .addCase(fetchPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== fetchPlanById ==========
      .addCase(fetchPlanById.pending, (state) => {
        state.fetchOneStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchPlanById.fulfilled, (state, action) => {
        state.fetchOneStatus = 'succeeded';
        state.selectedPlan = action.payload;
      })
      .addCase(fetchPlanById.rejected, (state, action) => {
        state.fetchOneStatus = 'failed';
        state.error = action.payload;
      })

      // ========== createPlan ==========
      .addCase(createPlan.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // On ajoute le nouveau plan à la liste si on est sur la première page
        // (optionnel : on peut aussi refetch, mais c'est plus efficace de l'insérer)
        state.list.unshift(action.payload);
        state.pagination.total += 1;
        // On ne change pas selectedPlan ici, l'utilisateur pourra le sélectionner
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updatePlan ==========
      .addCase(updatePlan.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(plan => plan.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selectedPlan?.id === action.payload.id) {
          state.selectedPlan = action.payload;
        }
      })
      .addCase(updatePlan.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deletePlan ==========
      .addCase(deletePlan.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(plan => plan.id !== action.payload.id);
        state.pagination.total -= 1;
        if (state.selectedPlan?.id === action.payload.id) {
          state.selectedPlan = null;
        }
      })
      .addCase(deletePlan.rejected, (state, action) => {
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
} = planSlice.actions;

// Export du reducer par défaut
export default planSlice.reducer;