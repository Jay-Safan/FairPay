import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          FairPay
        </Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-blue-200">
            Home
          </Link>
          <Link to="/add-bill" className="hover:text-blue-200">
            Add Bill
          </Link>
        </div>
      </div>
    </nav>
  );
}
