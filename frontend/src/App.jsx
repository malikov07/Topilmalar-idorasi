import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css'
// ... all your other imports ...
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import PrivateRoute from './utils/PrivateRoute';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import CategoryList from './components/CategoryList';
import FoundItems from './components/FoundItems';
import FoundedPerson from './components/FoundedPerson';
import LostItems from './components/LostItems';
import UserReview from './components/UserReview';
import Footer from './components/Footer';
import ItemDetail from './components/ItemDetail';
import Login from './components/Login';
import Register from './components/Register';
import LocationPicker from './components/LocationPicker';
import CreateItemPage from './components/CreateItemPage';
import Profile from './components/Profile';
import ProfileEdit from './components/ProfileEdit';
import MapSearchPage from "./components/MapSearchPage";

function AppRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-fade">
      <Routes>
        {/* Public Routes */}
        <Route path="/ItemDetail" element={<ItemDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/location-picker" element={<LocationPicker />} />
        <Route path="/create-item" element={<CreateItemPage />} />
        <Route path="/edit-item/:id" element={<CreateItemPage />} />
        <Route path="/items" element={<MapSearchPage />} />
        <Route path="/items/:id" element={<ItemDetail />} />

        <Route path="/" element={
            <>
              <Hero />
              <HowItWorks />
              <CategoryList />
              <FoundItems />
              <FoundedPerson />
              <LostItems />
              <UserReview />
              <Footer />
            </>
          } />

        {/* Private Routes Wrapper */}
        <Route element={<PrivateRoute />}>

          <Route path="/profile" element={<><Profile /><Footer /></>} />
          <Route path="/settings" element={<><ProfileEdit /><Footer /></>} />

          {/* You must define a path (like "/") and put your components inside the 'element' prop */}


        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <Router>
          <AuthProvider>
            {/* Navbar is outside Routes, so it always shows at the top */}
            <Navbar />
            <AppRoutes />
        </AuthProvider>
        </Router>
      </LanguageProvider>
    </GoogleOAuthProvider>
  )
}

export default App; // Make sure you don't export the text "is it correct..."