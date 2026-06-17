import { Route, Routes } from 'react-router-dom';
import {UserLayout,DashboardUser,Abonnement,ConditionUser, MesAbonnement, FileAnalyzer} from './IndexUser';
import SecureLayout from '../SecureLayout';
import NotFound from '../../utils/NotFound';
const UserRooter = () => {
    return (
        <Routes className='Urooter'>
            <Route element={<SecureLayout/>}>
                <Route  element={<UserLayout/>}>
                        <Route index element={<DashboardUser/>}/>
                        <Route path='dashboard' element={<DashboardUser/>}/>
                        <Route path='abonnement' element={<Abonnement/>}/>
                        <Route path='mes_abonnement' element={<MesAbonnement/>}/>
                        <Route path='condition' element={<ConditionUser/>}/>
                        <Route path='file_analyzer' element={<FileAnalyzer/>}/>
                </Route>
                        <Route path = "*" element={<NotFound/>}/>
            </Route> 
        </Routes>
        
    );
};

export default UserRooter;