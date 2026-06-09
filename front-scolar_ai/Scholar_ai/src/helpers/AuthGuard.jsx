import { Navigate } from "react-router-dom";
import { accountService } from "../services/account.Service";

const AuthGuard = ({children}) => {
   
    if(!accountService.logged()){
        return <Navigate to="/login" />
    }
    return children
};

export default AuthGuard;