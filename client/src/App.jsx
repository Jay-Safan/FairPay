import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AddBill from './pages/AddBill';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-bill" element={<AddBill />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
