import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CreateDate } from './pages/CreateDate';
import { DateResult } from './pages/DateResult';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { SavedDates } from './pages/SavedDates';
import { Settings } from './pages/Settings';
import { VenueDetail } from './pages/VenueDetail';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="buat" element={<CreateDate />} />
        <Route path="hasil" element={<DateResult />} />
        <Route path="rencana/:id" element={<DateResult />} />
        <Route path="venue/:id" element={<VenueDetail />} />
        <Route path="tersimpan" element={<SavedDates />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
