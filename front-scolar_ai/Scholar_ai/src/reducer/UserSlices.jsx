import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from '../services/ApiUrl';

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// Async thunks avec typage implicite (si vous n'utilisez pas TS)
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get('/api/users');
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return rejectWithValue('Format de réponse inattendu');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors du chargement'));
    }
  }
);

export const addUser = createAsyncThunk(
  'users/add',
  async (newUser, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/users', newUser);
      if (!res.data?.success) throw new Error(res.data?.message || 'Erreur inconnue');
      return res.data.data; // l'utilisateur créé
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de l\'ajout'));
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.put(`/api/users/${id}`, data);
      if (!res.data?.success) throw new Error(res.data?.message);
      return res.data.data; // utilisateur mis à jour
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.delete(`/api/users/${id}`);
      // On suppose que le backend renvoie { success: true, data: { id: ... } }
      return { id: res.data.data?.id || id }; // pour suppression locale
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    loading: false,
    error: null,
    selectedUser: null,
    isEditing: false,
    // Ajout utile: statut des requêtes individuelles si besoin
    addStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    updateStatus: 'idle',
    deleteStatus: 'idle',
  },
  reducers: {
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
      state.isEditing = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetEditState: (state) => {
      state.selectedUser = null;
      state.isEditing = false;
    },
    // Optionnel: reset des status après notification
    resetStatuses: (state) => {
      state.addStatus = 'idle';
      state.updateStatus = 'idle';
      state.deleteStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // ========== fetchUsers ==========
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========== addUser ==========
      .addCase(addUser.pending, (state) => {
        state.addStatus = 'loading';
        state.error = null;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.addStatus = 'succeeded';
        state.list.push(action.payload);
      })
      .addCase(addUser.rejected, (state, action) => {
        state.addStatus = 'failed';
        state.error = action.payload;
      })

      // ========== updateUser ==========
      .addCase(updateUser.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.list.findIndex(user => user.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        state.selectedUser = null;
        state.isEditing = false;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload;
      })

      // ========== deleteUser ==========
      .addCase(deleteUser.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.list = state.list.filter(user => user.id !== action.payload.id);
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = null;
          state.isEditing = false;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setSelectedUser, clearError, resetEditState, resetStatuses } = userSlice.actions;
export default userSlice.reducer;