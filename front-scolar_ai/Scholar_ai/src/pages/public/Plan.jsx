import React from 'react';
import SubscriptionFlow from '../../components/SubscriptionFlow';
import {accountService} from "../../services/account.Service"
import MySubscriptions from '../../components/MySubscriptions';
const Contact = () => {
    // const userId = "a1b2c3d4-1234-5678-9012-abcdef123456"; // l'ID de l'utilisateur connecté
    return (
        <div>
         {/* <SubscriptionFlow userId={userId} />; */}
         {/* <MySubscriptions userId="user_123" onNewSubscription={() => console.log('Créer un abonnement')} /> */}
         {/* <MySubscriptions /> */}
         plan d'abonnement
        </div>
    );
};

export default Contact;