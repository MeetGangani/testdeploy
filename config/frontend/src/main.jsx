import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import store from './store.js';
import { Provider } from 'react-redux';
import HomeScreen from './screens/HomeScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import RegisterScreen from './screens/RegisterScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<App />}>
      <Route index={true} path='/' element={<HomeScreen />} />
      <Route path='/login' element={<LoginScreen />} />
      <Route path='/register' element={<RegisterScreen />} />
      
      {/* Protected Routes */}
      <Route path='' element={<PrivateRoute />}>
        {/* General Protected Routes */}
        <Route path='/profile' element={<ProfileScreen />} />
        
        {/* Admin Routes */}
        <Route path='/admin/*' element={
          <PrivateRoute allowedRoles={['admin']}>
            <ProfileScreen />
          </PrivateRoute>
        } />
        
        {/* Institute Routes */}
        <Route path='/institute/*' element={
          <PrivateRoute allowedRoles={['institute']}>
            <ProfileScreen />
          </PrivateRoute>
        } />
        
        {/* Student Routes */}
        <Route path='/student/*' element={
          <PrivateRoute allowedRoles={['student']}>
            <ProfileScreen />
          </PrivateRoute>
        } />
      </Route>
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  </Provider>
);
