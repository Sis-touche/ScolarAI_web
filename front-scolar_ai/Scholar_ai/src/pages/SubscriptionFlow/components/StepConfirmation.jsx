import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import {
  FiCheckCircle,
  FiFileText,
  FiDownload,
  FiX,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { fetchInvoiceById } from "../../../reducer/invoiceSlice";
import { setQrCodeUrl, resetActivation } from "../../../reducer/mobileActivationSlice";
import RecapRow from "./RecapRow";
import { fmt } from "../helpers";
import styles from "./StepConfirmation.module.css";

const StepConfirmation = ({ onReset }) => {
  const dispatch = useDispatch();
  const { selectedSubscription } = useSelector((s) => s.subscriptions);
  const { selectedInvoice, fetchOneStatus, error: invError } = useSelector((s) => s.invoices);
  const { qrCodeUrl } = useSelector((s) => s.mobileActivation);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    if (selectedSubscription?.invoice_id && fetchOneStatus === "idle") {
      dispatch(fetchInvoiceById(selectedSubscription.invoice_id));
    }
  }, [selectedSubscription, fetchOneStatus, dispatch]);

  useEffect(() => {
    if (selectedSubscription?.mobile_activation_token) {
      const url = `${window.location.origin}/activate?token=${selectedSubscription.mobile_activation_token}`;
      dispatch(setQrCodeUrl(url));
    }
  }, [selectedSubscription, dispatch]);

  const qrValue =
    qrCodeUrl ??
    (selectedSubscription?.mobile_activation_token
      ? `${window.location.origin}/activate?token=${selectedSubscription.mobile_activation_token}`
      : `${window.location.origin}/activate?token=PENDING`);

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await toPng(qrRef.current, { quality: 0.95 });
      const link = document.createElement("a");
      link.download = "qrcode-activation.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erreur téléchargement QR", err);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.successBanner}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.successIcon}>
          <FiCheckCircle size={32} />
        </div>
        <h2>Abonnement activé !</h2>
        <p>Votre paiement a été confirmé. Voici votre facture et votre QR d'activation.</p>
      </motion.div>

      <div className={styles.grid}>
        {/* Colonne facture */}
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.cardHeader}>
            <FiFileText size={20} />
            <h3>Facture</h3>
          </div>

          {fetchOneStatus === "loading" && (
            <div className={styles.loadingBox}>
              <FiLoader className={styles.spinner} />
              <span>Chargement de la facture…</span>
            </div>
          )}

          {fetchOneStatus === "failed" && (
            <div className={styles.errorBox}>
              <FiAlertCircle size={16} />
              <span>{invError ?? "Impossible de charger la facture."}</span>
            </div>
          )}

          {fetchOneStatus === "succeeded" && selectedInvoice ? (
            <>
              <div className={styles.recapList}>
                <RecapRow label="N° Facture" value={selectedInvoice.invoice_number} mono />
                <RecapRow
                  label="Date"
                  value={new Date(selectedInvoice.created_at).toLocaleDateString("fr-MG")}
                />
                <RecapRow label="Montant HT" value={`Ar ${fmt(selectedInvoice.amount_ht)}`} />
                {selectedInvoice.tax_amount > 0 && (
                  <RecapRow label="TVA" value={`Ar ${fmt(selectedInvoice.tax_amount)}`} />
                )}
                <RecapRow
                  label="Total TTC"
                  value={`Ar ${fmt(selectedInvoice.total_amount)}`}
                  highlight
                />
                <RecapRow label="Statut" value={selectedInvoice.status} />
              </div>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => window.open(`/api/invoices/${selectedInvoice.id}/pdf`, "_blank")}
              >
                <FiDownload size={14} />
                Télécharger le PDF
              </button>
            </>
          ) : fetchOneStatus === "idle" ? (
            <div className={styles.emptyBox}>La facture sera disponible après traitement.</div>
          ) : null}
        </motion.div>

        {/* Colonne QR Code */}
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          style={{ alignItems: "center", textAlign: "center" }}
        >
          <div className={styles.cardHeader}>
            <FiFileText size={20} />
            <h3>QR Code d'activation</h3>
          </div>
          <p className={styles.qrDescription}>
            Scannez ce code depuis l'application mobile pour activer votre abonnement.
          </p>
          <div
            ref={qrRef}
            className={styles.qrWrapper}
            onClick={() => setIsQRModalOpen(true)}
            style={{ cursor: "pointer" }}
          >
            <QRCodeSVG value={qrValue} size={160} level="H" />
          </div>
          {selectedSubscription?.mobile_activation_token && (
            <p className={styles.token}>
              Token : {selectedSubscription.mobile_activation_token}
            </p>
          )}
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleDownloadQR}>
            <FiDownload size={14} />
            Télécharger le QR Code
          </button>
        </motion.div>
      </div>

      <div className={styles.navRow}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => {
            dispatch(resetActivation());
            onReset();
          }}
        >
          Retour à l'accueil
        </button>
      </div>

      {/* Modal QR agrandi */}
      <AnimatePresence>
        {isQRModalOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsQRModalOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={() => setIsQRModalOpen(false)}>
                <FiX size={24} />
              </button>
              <div className={styles.modalQR}>
                <QRCodeSVG value={qrValue} size={280} level="H" />
              </div>
              <p className={styles.modalText}>Scannez ce code depuis l'application mobile</p>
              <p className={styles.modalToken}>
                Token : {selectedSubscription?.mobile_activation_token}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepConfirmation;