// features/auth/verificationSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from '../services/ApiUrl';

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// Thunk : vérifier l'email avec le token
// ----------------------------------------------------------------------
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      if (!token) {
        return rejectWithValue('Le jeton de vérification est manquant.');
      }
      const res = await ApiUrl.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      if (res.data?.success) {
        return {
          success: true,
          message: res.data.message
        };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de la vérification');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de la vérification de l\'email'));
    }
  }
);

// ----------------------------------------------------------------------
// Slice
// ----------------------------------------------------------------------
const initialState = {
  verificationStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  message: null,
  error: null
};

const verificationSlice = createSlice({
  name: 'emailVerification',
  initialState,
  reducers: {
    resetVerification: (state) => {
      state.verificationStatus = 'idle';
      state.message = null;
      state.error = null;
    },
    clearVerificationMessage: (state) => {
      state.message = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.verificationStatus = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.verificationStatus = 'succeeded';
        state.message = action.payload.message;
        state.error = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verificationStatus = 'failed';
        state.error = action.payload;
        state.message = null;
      });
  }
});

// Export des actions normales
export const { resetVerification, clearVerificationMessage, clearError } = verificationSlice.actions;

// Export du reducer par défaut
export default verificationSlice.reducer;