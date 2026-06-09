import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import StepIndicator from './components/StepIndicator';
import StepPlan from './components/StepPlan';
import StepSubscription from './components/StepSubscription';
import StepPayment from './components/StepPayment';
import StepConfirmation from './components/StepConfirmation';
import { getUserIdFromToken } from './helpers';
import './SubscriptionFlow.css';

export default function SubscriptionFlow({ userId: userIdProp }) {
  const userId = userIdProp ?? getUserIdFromToken();
  const [step, setStep] = useState(1);
  const [paymentMode, setPaymentMode] = useState("total");

  const next = useCallback((mode) => {
    if (mode) setPaymentMode(mode);
    setStep((s) => Math.min(s + 1, 4));
  }, []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const reset = useCallback(() => setStep(1), []);

  const { selectedSubscription, list: subList, createStatus } = useSelector((s) => s.subscriptions);
  const resolvedSubscription = selectedSubscription ?? (createStatus === "succeeded" ? subList[0] : null);

  if (!userId) {
    return (
      <div className="subscription-page">
        <div className="subscription-container">
          <div className="subscription-card">
            <div style={{ padding: "40px 36px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
              <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Session expirée</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>
                Impossible de récupérer votre identifiant utilisateur.<br />
                Veuillez vous reconnecter.
              </p>
              <button
                className="btn btn-primary"
                style={{ margin: "0 auto" }}
                onClick={() => window.location.href = "/login"}
              >
                Se reconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <div className="subscription-container">
        <StepIndicator currentStep={step} />
        <div className="subscription-card">
          {step === 1 && <StepPlan onNext={next} />}
          {step === 2 && <StepSubscription onNext={next} onBack={back} userId={userId} />}
          {step === 3 && <StepPayment onNext={next} onBack={back} subscription={resolvedSubscription} paymentMode={paymentMode} />}
          {step === 4 && <StepConfirmation onReset={reset} />}
        </div>
      </div>
    </div>
  );
}