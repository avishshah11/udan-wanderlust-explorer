
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const CruiseSection = () => {
  return (
    <section className="py-16 md:py-24 bg-udan-lightGray">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=1064" 
                alt="Luxury cruise ship" 
                className="rounded-xl shadow-lg w-full h-auto"
              />
              <img 
                src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=870" 
                alt="Cruise dining experience" 
                className="rounded-xl shadow-lg w-2/3 absolute -bottom-10 -right-10 border-4 border-white"
              />
            </div>
          </div>
          
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal">Experience Travel Like Never Before on Water</h2>
            
            <p className="text-udan-gray">
              Embark on an unforgettable journey across crystal-clear waters with our premium cruise packages. Enjoy luxurious accommodations, world-class dining, and breathtaking views of stunning coastlines and oceans around the world.
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-udan-orange font-bold">✓</span>
                <span className="text-udan-gray">Luxury accommodations with ocean views</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-udan-orange font-bold">✓</span>
                <span className="text-udan-gray">Gourmet dining experiences</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-udan-orange font-bold">✓</span>
                <span className="text-udan-gray">Entertainment and activities for all ages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-udan-orange font-bold">✓</span>
                <span className="text-udan-gray">Exciting shore excursions at each port</span>
              </li>
            </ul>
            
            <Button asChild className="bg-udan-orange hover:bg-udan-orange/90 text-white px-6 py-2 rounded-full">
              <Link to="/contact">Discover Cruise Packages</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CruiseSection;
