import axios from "axios";
import {accountService} from './account.Service';
const ApiUrl  = axios.create({
    baseURL:'http://localhost:2026'
})
ApiUrl.interceptors.request.use( request =>{    
    if (accountService.logged()) {
        request.headers.Authorization = `Bearer ${accountService.getToken()}`        
    }
    return request
} )
export default ApiUrl;