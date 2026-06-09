import React from "react";
import {
  FiHash,
  FiCalendar,
  FiDollarSign,
  FiTag,
  FiCheckCircle,
  FiFileText,
} from "react-icons/fi";
import styles from "./RecapRow.module.css";

const iconMap = {
  "N° Facture": FiHash,
  Date: FiCalendar,
  "Montant HT": FiDollarSign,
  TVA: FiTag,
  "Total TTC": FiDollarSign,
  Statut: FiCheckCircle,
  Plan: FiFileText,
  Type: FiTag,
  Prix: FiDollarSign,
  Durée: FiCalendar,
  Scans: FiTag,
  "Abonnement ID": FiHash,
};

const RecapRow = ({ label, value, mono, highlight }) => {
  const Icon = iconMap[label] || null;
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        {Icon && <Icon size={14} className={styles.icon} />}
        <span>{label}</span>
      </div>
      <div
        className={`${styles.value} ${mono ? styles.mono : ""} ${
          highlight ? styles.highlight : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
};

export default RecapRow;