import React from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiDollarSign, FiAlertCircle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { fmt } from "../helpers";
import styles from "./InstallmentCard.module.css";

const statusConfig = {
  pending:   { icon: FiClock, label: "En attente", bg: "#fef9c3", color: "#b45309", glow: "#fef9c380" },
  paid:      { icon: FiCheckCircle, label: "Payé", bg: "#dcfce7", color: "#166534", glow: "#dcfce780" },
  overdue:   { icon: FiAlertCircle, label: "En retard", bg: "#fee2e2", color: "#991b1b", glow: "#fee2e280" },
  cancelled: { icon: FiXCircle, label: "Annulé", bg: "#f3f4f6", color: "#6b7280", glow: "#f3f4f680" },
};

const InstallmentCard = ({ plan, index, onPay, paying }) => {
  const statusKey = plan.status ?? "pending";
  const config = statusConfig[statusKey] ?? statusConfig.pending;
  const StatusIcon = config.icon;

  const isPayable = plan.status === "pending" || plan.status === "overdue";

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          Tranche #{plan.installment_number ?? index + 1}
        </span>
        <span
          className={styles.status}
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>
          <FiDollarSign size={14} />
          Montant
        </span>
        <span className={styles.value}>Ar {fmt(plan.amount)}</span>
      </div>

      {plan.due_date && (
        <div className={styles.row}>
          <span className={styles.label}>
            <FiCalendar size={14} />
            Échéance
          </span>
          <span className={styles.value}>
            {new Date(plan.due_date).toLocaleDateString("fr-MG")}
          </span>
        </div>
      )}

      {isPayable && (
        <motion.button
          className={styles.payButton}
          onClick={() => onPay(plan.id)}
          disabled={paying}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          style={{ opacity: paying ? 0.7 : 1 }}
        >
          {paying ? (
            <>
              <span className={styles.spinner} />
              Traitement…
            </>
          ) : (
            "Payer cette tranche"
          )}
        </motion.button>
      )}
    </motion.div>
  );
};

export default InstallmentCard;