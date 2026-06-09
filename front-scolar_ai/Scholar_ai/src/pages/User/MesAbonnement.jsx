import React from "react";
import MySubscriptions from "../../components/MySubscriptions";
import { useNavigate } from "react-router-dom";

export default function MesAbonnementsPage() {
  const navigate = useNavigate();

  const handleNewSubscription = () => {
    navigate("/subscription/plan"); // ou tout autre chemin
  };

  return (
    <div>
      <MySubscriptions onNewSubscription={handleNewSubscription} />
    </div>
  );
}