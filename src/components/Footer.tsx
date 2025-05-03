
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-udan-charcoal text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">UDAN Tours and Travels</h3>
            <address className="not-italic text-gray-300 leading-relaxed">
              714, Yashkamal Building,<br />
              above Havmor Restaurant,<br />
              Opposite M.S. University, Sarod,<br />
              Sayajiganj, Vadodara, Gujarat 390005
            </address>
            <div className="text-gray-300">
              <p>Mobile: 9376214442</p>
              <p>Phone: 0265 400 8999</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/" className="text-gray-300 hover:text-udan-orange transition-colors">Home</Link>
              <Link to="/about" className="text-gray-300 hover:text-udan-orange transition-colors">About Us</Link>
              <Link to="/packages" className="text-gray-300 hover:text-udan-orange transition-colors">Packages</Link>
              <Link to="/contact" className="text-gray-300 hover:text-udan-orange transition-colors">Contact</Link>
            </nav>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Our Services</h3>
            <nav className="flex flex-col space-y-2">
              <span className="text-gray-300">Visa Services</span>
              <span className="text-gray-300">Travel Insurance</span>
              <span className="text-gray-300">International Tours</span>
              <span className="text-gray-300">Domestic Tours</span>
              <span className="text-gray-300">Cruise Packages</span>
            </nav>
          </div>

          {/* Newsletter (can be converted to actual form later) */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Subscribe</h3>
            <p className="text-gray-300">Subscribe to our newsletter for the latest travel deals and updates.</p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Your email" 
                className="px-4 py-2 w-full outline-none text-udan-charcoal"
              />
              <button 
                className="bg-udan-orange text-white px-4 py-2 font-medium hover:bg-opacity-90 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <div className="mb-4 md:mb-0">
            © {currentYear} Udan Tours And Travels. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <Link to="/privacy" className="hover:text-udan-orange transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-udan-orange transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
