import React from 'react';
import TermsOfService from '../../components/TermsOfService';
import { useNavigate } from 'react-router-dom';

const ConditionUser = () => {
    const navigate =useNavigate();
    return (
        <div>
            <TermsOfService
            onAccept={() => {
                console.log("Accepté");
                // redirection vers inscription ou validation
            }}
            onDecline={() => {
                console.log("Refusé");
                // fermer ou retour
            }}
            onBack={() => navigate(-1)}
            />
        </div>
    );
};

export default ConditionUser;