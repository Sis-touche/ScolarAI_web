import { Outlet } from 'react-router-dom';
import AuthGuard from '../helpers/AuthGuard';

const SecureLayout = () => {
    return (
        <div className='SecureLayout'>
            <AuthGuard>
            <Outlet/>
            </AuthGuard>
        </div>
    );
};

export default SecureLayout;