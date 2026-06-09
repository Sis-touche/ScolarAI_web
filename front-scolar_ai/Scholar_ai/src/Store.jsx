import { configureStore } from "@reduxjs/toolkit";
import userReducer from './reducer/UserSlices';
import  loginReducer from "./reducer/authSlice";
import planReducer from "./reducer/planSlice";
import paymentPlanReducer from "./reducer/paymentPlanSlice";
import paymentReducer from "./reducer/paymentSlice";
import invoicesReducer from "./reducer/invoiceSlice";
import subscriptionReducer from "./reducer/subscriptionSlice";
import verificationReducer from "./reducer/verificationSlice";
import qrCodeVerificationReducer from "./reducer/mobileActivationSlice";
export const Store = configureStore({
    reducer:{
        users:userReducer,
        auth:loginReducer,
        plans:planReducer,
        paymentPlans:paymentPlanReducer,
        payments:paymentReducer,
        invoices:invoicesReducer,
        subscriptions:subscriptionReducer,
        emailVerification:verificationReducer,
        mobileActivation:qrCodeVerificationReducer,
    },
    devTools:true
});