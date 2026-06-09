import React from "react";
import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { STEPS } from "../constants";
import styles from "./StepIndicator.module.css";

const StepIndicator = ({ currentStep }) => {
  return (
    <div className={styles.container}>
      {STEPS.map((s, i) => {
        const done = s.id < currentStep;
        const active = s.id === currentStep;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={s.id} className={styles.stepItem}>
            <motion.div
              className={`${styles.stepCircle} ${done ? styles.done : ""} ${
                active ? styles.active : ""
              }`}
              initial={false}
              animate={{
                scale: active ? 1.05 : 1,
                backgroundColor: done || active ? "#0f766e" : "#fff",
                borderColor: done || active ? "#0f766e" : "#cbd5e1",
                color: done || active ? "#fff" : "#64748b",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {done ? <FiCheck size={16} /> : s.id}
            </motion.div>

            <span
              className={`${styles.stepLabel} ${
                active ? styles.labelActive : ""
              }`}
            >
              {s.label}
            </span>

            {!isLast && (
              <motion.div
                className={`${styles.stepLine} ${done ? styles.lineDone : ""}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: done ? 1 : 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;