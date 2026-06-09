import Error from '../../utils/NotFound';
import {Home,Plan,Login,Layout, Services, Signup, EmailSentPage, EmailVerification} from './index';
import { Route, Routes } from 'react-router-dom';
const PublicRouter = () => {
    return (
      <Routes>
          <Route element={<Layout/>}>
          <Route  index element={<Home/>}/>
          <Route path = "home" element={<Home/>}/>
          <Route path = "plan" element={<Plan/>}/>
          <Route path = "signup" element={<Signup/>}/>
          <Route path = "login" element={<Login/>}/>
          <Route path = "service" element={<Services/>}/>
          <Route path="/email-sent"   element={<EmailSentPage />} />
          <Route path="/verify-email" element={<EmailVerification mode="verify" onNavigateLogin={() => navigate("/login")} />} />
          </Route>
          <Route path = "/*" element={<Error/>}/>
      </Routes>
    );
};

export default PublicRouter;