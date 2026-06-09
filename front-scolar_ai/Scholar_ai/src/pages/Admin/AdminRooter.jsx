import { Route, Routes } from 'react-router-dom';
import { AdminLayout,Audit,DashboardAdmin,Users,Abonnement, GestionPayment} from './index';
import SecureLayout from '../SecureLayout';
import Error from '../../utils/NotFound';
const AdminRooter = () => {
    return (
        <Routes className='Adminrooter'>
            <Route element={<SecureLayout/>}>
                <Route element={<AdminLayout/>}>
                <Route index element={<DashboardAdmin/>} />
                <Route path='dashboard' element={<DashboardAdmin/>} />
                <Route path='users' element={<Users/>} />
                <Route path='payment' element={<GestionPayment/>} />
                <Route path='abonnement' element={<Abonnement/>} />
                <Route path='audit' element={<Audit/>} />
                </Route>
            </Route>
          <Route path = "/*" element={<Error/>}/>
        </Routes>
    );
};

export default AdminRooter;