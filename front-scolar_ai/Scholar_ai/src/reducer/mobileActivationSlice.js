// features/mobile/mobileActivationSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from '../services/ApiUrl';

// Helper pour extraire le message d'erreur
const getErrorMessage = (error, defaultMsg) => {
  return error.response?.data?.message || error.message || defaultMsg;
};

// ----------------------------------------------------------------------
// Thunk : Activer l'application mobile avec le token du QR Code
// ----------------------------------------------------------------------
export const activateMobile = createAsyncThunk(
  'mobile/activate',
  async ({ token, deviceName }, { rejectWithValue }) => {
    try {
      if (!token) {
        return rejectWithValue("Le token d'activation est manquant.");
      }
      const res = await ApiUrl.post('/api/auth/mobile/activate', { token, deviceName });
      if (res.data?.success) {
        return {
          success: true,
          message: res.data.message,
          user: res.data.user,
          subscription: res.data.subscription
          // token: res.data.token si besoin du JWT mobile
        };
      }
      return rejectWithValue(res.data?.message || 'Erreur lors de l’activation');
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue('QR Code invalide, expiré ou déjà utilisé.');
      }
      if (error.response?.status === 410) {
        return rejectWithValue('Cet abonnement a expiré.');
      }
      return rejectWithValue(getErrorMessage(error, 'Erreur lors de l’activation mobile'));
    }
  }
);

// ----------------------------------------------------------------------
// Slice
// ----------------------------------------------------------------------
const initialState = {
  // Pour le QR code, on ne stocke que l'URL générée (l'image)
  qrCodeUrl: null,
  // État de l'activation
  activationStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  activationMessage: null,
  activationError: null,
  // Données de l'activation réussie (user, subscription)
  activatedUser: null,
  activatedSubscription: null
};

const mobileActivationSlice = createSlice({
  name: 'mobileActivation',
  initialState,
  reducers: {
    // Définir l'URL du QR code (appelé par le composant)
    setQrCodeUrl: (state, action) => {
      state.qrCodeUrl = action.payload;
    },
    clearQrCodeUrl: (state) => {
      state.qrCodeUrl = null;
    },
    resetActivation: (state) => {
      state.activationStatus = 'idle';
      state.activationMessage = null;
      state.activationError = null;
      state.activatedUser = null;
      state.activatedSubscription = null;
    },
    clearActivationMessage: (state) => {
      state.activationMessage = null;
    },
    clearActivationError: (state) => {
      state.activationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(activateMobile.pending, (state) => {
        state.activationStatus = 'loading';
        state.activationError = null;
        state.activationMessage = null;
      })
      .addCase(activateMobile.fulfilled, (state, action) => {
        state.activationStatus = 'succeeded';
        state.activationMessage = action.payload.message;
        state.activatedUser = action.payload.user;
        state.activatedSubscription = action.payload.subscription;
        // On peut aussi effacer le QR code après activation réussie
        state.qrCodeUrl = null;
      })
      .addCase(activateMobile.rejected, (state, action) => {
        state.activationStatus = 'failed';
        state.activationError = action.payload;
      });
  }
});

// Export des actions normales
export const {
  setQrCodeUrl,
  clearQrCodeUrl,
  resetActivation,
  clearActivationMessage,
  clearActivationError
} = mobileActivationSlice.actions;

// Export du reducer par défaut
export default mobileActivationSlice.reducer;