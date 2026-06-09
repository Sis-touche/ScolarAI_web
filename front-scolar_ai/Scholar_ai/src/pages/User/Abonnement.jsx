import React from 'react';
import { useSelector } from 'react-redux';
import SubscriptionFlow from '../../pages/SubscriptionFlow';
const Abonnement = () => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
     if (!isAuthenticated) {
    return <div>Veuillez vous connecter pour accéder aux abonnements.</div>;
  }
    return (
        <SubscriptionFlow userId={user?.id} />
    );
};

export default Abonnement;