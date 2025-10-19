import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import DetailsPage from './pages/DetailsPage.jsx';
import AddOfferPage from './pages/AddOfferPage.jsx';
import EditOfferPage from './pages/EditOfferPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import RodoPage from './pages/RodoPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/oferty" element={<OffersPage />} />
        <Route path="/details" element={<DetailsPage />} />
        <Route path="/dodaj" element={<AddOfferPage />} />
        <Route path="/edit" element={<EditOfferPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/polityka-prywatnosci" element={<PrivacyPolicyPage />} />
        <Route path="/regulamin" element={<TermsPage />} />
        <Route path="/rodo" element={<RodoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
