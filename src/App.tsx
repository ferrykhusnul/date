import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Backup } from './pages/Backup';
import { CreateDate } from './pages/CreateDate';
import { DateResult } from './pages/DateResult';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { SavedDates } from './pages/SavedDates';
import { Settings } from './pages/Settings';
import { VenueDetail } from './pages/VenueDetail';
import { VenueForm } from './pages/VenueForm';
import { VenueList } from './pages/VenueList';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="buat" element={<CreateDate />} />
        <Route path="hasil" element={<DateResult />} />
        <Route path="rencana/:id" element={<DateResult />} />
        <Route path="venue" element={<VenueList />} />
        <Route path="venue/baru" element={<VenueForm />} />
        <Route path="venue/:id" element={<VenueDetail />} />
        <Route path="venue/:id/ubah" element={<VenueForm key="edit" />} />
        <Route path="tersimpan" element={<SavedDates />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="cadangan" element={<Backup />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
