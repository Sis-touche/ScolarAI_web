import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ApiUrl from "../services/ApiUrl"; // Assurez-vous que ce chemin pointe vers votre instance Axios

// ─── THUNK : Upload du fichier et analyse ────────────────────────────────────

export const uploadAndAnalyzeFile = createAsyncThunk(
  'analysis/uploadAndAnalyze',
  async (file, { rejectWithValue }) => {
    // Vérifier que le fichier est présent
    if (!file) {
      return rejectWithValue('Aucun fichier sélectionné');
    }

    // Construire le FormData pour l'upload
    const formData = new FormData();
    formData.append('fichier', file); // Le nom 'fichier' doit correspondre à celui attendu par multer

    try {
      const response = await ApiUrl.post('/api/analyse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important pour l'upload de fichier
        },
      });

      // La réponse contient directement les données d'analyse
      return response.data; // { topStudents, criticalStudents, allStudents, ... }
    } catch (error) {
      // Gestion des erreurs
      const message =
        error.response?.data?.erreur || // message personnalisé du backend
        error.response?.data?.message ||
        "Erreur lors de l'analyse du fichier";
      return rejectWithValue(message);
    }
  }
);

// ─── INITIAL STATE ─────────────────────────────────────────────────────────────

const initialState = {
  result: null,       // Les données d'analyse complètes
  loading: false,
  error: null,
};

// ─── ANALYSIS SLICE ────────────────────────────────────────────────────────────

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    // Réinitialiser les résultats (par exemple pour un nouvel upload)
    clearAnalysisResult: (state) => {
      state.result = null;
      state.error = null;
      state.loading = false;
    },
    // Effacer l'erreur sans toucher aux résultats
    clearAnalysisError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ─── Upload & Analyse ────────────────────────────────────
      .addCase(uploadAndAnalyzeFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        // On garde l'ancien résultat pour ne pas le perdre pendant le chargement
      })
      .addCase(uploadAndAnalyzeFile.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload; // Les données d'analyse
        state.error = null;
      })
      .addCase(uploadAndAnalyzeFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload; // Le message d'erreur
        // On garde l'ancien résultat, mais on peut aussi le vider si on préfère
      });
  },
});

export const { clearAnalysisResult, clearAnalysisError } = analysisSlice.actions;
export default analysisSlice.reducer;