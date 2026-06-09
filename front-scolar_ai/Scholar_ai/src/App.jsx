import React from 'react';
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import PublicRouter from './pages/public/PublicRouter';
import UserRooter from './pages/User/UserRooter';
import AdminRooter from './pages/Admin/AdminRooter';

const App = () => {
  return (
    <div>
      <BrowserRouter>
      <Routes>
        <Route path="/*" element={<PublicRouter/>}/>
        <Route path="/user/*" element={<UserRooter/>}/>
        <Route path='/admin/*' element={<AdminRooter/>}/>
      </Routes>
    </BrowserRouter>
    </div>
  );
};

export default App;