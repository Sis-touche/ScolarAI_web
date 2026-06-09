// constants.js
import { FiSmartphone, FiCreditCard, FiHome, FiDollarSign } from "react-icons/fi";

export const PAYMENT_METHODS = [
  { value: "mobile_money",   label: "MVola / Airtel / Orange", icon: FiSmartphone },
  { value: "carte_bancaire", label: "Carte bancaire",          icon: FiCreditCard },
  { value: "virement",       label: "Virement bancaire",       icon: FiHome },
  { value: "especes",        label: "Espèces",                 icon: FiDollarSign },
];

export const STEPS = [
  { id: 1, label: "Plan"         },
  { id: 2, label: "Abonnement"   },
  { id: 3, label: "Paiement"     },
  { id: 4, label: "Confirmation" },
];