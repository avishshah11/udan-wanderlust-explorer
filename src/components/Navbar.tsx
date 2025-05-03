
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-udan-charcoal font-bold text-2xl">
            UDAN
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium">
              Home
            </Link>
            <Link to="/about" className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium">
              About
            </Link>
            <Link to="/packages" className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium">
              Packages
            </Link>
            <Link to="/contact" className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium">
              Contact
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pt-4 pb-2 flex flex-col space-y-3 bg-white">
            <Link 
              to="/" 
              className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              to="/packages" 
              className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Packages
            </Link>
            <Link 
              to="/contact" 
              className="text-udan-charcoal hover:text-udan-orange transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
