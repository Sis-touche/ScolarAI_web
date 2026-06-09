import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from "../services/ApiUrl";
import { accountService } from "../services/account.Service";

// ─── THUNKS ASYNCHRONES ────────────────────────────────────────────────────────

// Inscription
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/users', userData);
      if (res.data?.success) {
        // Pas de token ici — l'utilisateur doit vérifier son email d'abord
        return res.data.data; // { id, email, firstName, lastName, isVerified: false }
      }
      return rejectWithValue(res.data?.message || "Erreur lors de l'inscription");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
        error.response?.data?.details ||
        "Une erreur est survenue lors de l'inscription"
      );
    }
  }
);
// Connexion
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.post('/api/login', credentials);
      if (res.data && res.data.success && res.data.token) {
        accountService.saveToken(res.data.token, res.data.data.role);
        return {
          user: res.data.data,
          token: res.data.token
        };
      }
      return rejectWithValue('Réponse du serveur incorrecte');
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Une erreur est survenue lors de la connexion'
      );
    }
  }
);

// Récupération du profil utilisateur
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await ApiUrl.get(`/api/login/${userId}`);
      if (res.data && res.data.success) {
        return res.data.data;
      }
      return rejectWithValue('Impossible de charger le profil');
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la récupération du profil'
      );
    }
  }
);

// ─── INITIAL STATE DYNAMIQUE ───────────────────────────────────────────────────
const isAlreadyLogged = accountService.logged();

const initialState = {
  user: null,
  token: isAlreadyLogged ? accountService.getToken() : null,
  role: isAlreadyLogged ? accountService.getRole() : null,
  isAuthenticated: isAlreadyLogged,
  loading: false,
  error: null,
};

// ─── AUTH SLICE ────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      accountService.logOut();
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ─── Register ───────────────────────────────────────────
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user    = action.payload; // directement les données utilisateur
        state.isAuthenticated = false;  // pas encore authentifié — email non vérifié
        state.token   = null;
        state.role    = action.payload?.role ?? null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // ─── Login ──────────────────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = action.payload.user.role;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // ─── Fetch Current User ─────────────────────────────────
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.role = action.payload.role;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        accountService.logOut();
        state.user = null;
        state.token = null;
        state.role = null;
        state.isAuthenticated = false;
      });
  }
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;