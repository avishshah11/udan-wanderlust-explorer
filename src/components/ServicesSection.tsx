
import { Package, ShieldCheck, Plane, CreditCard, HeartPulse } from 'lucide-react';

const services = [
  {
    icon: <Plane className="w-8 h-8 text-udan-orange" />,
    title: "Visa Services",
    description: "Hassle-free visa assistance for international travel to ensure smooth border crossings."
  },
  {
    icon: <HeartPulse className="w-8 h-8 text-udan-orange" />,
    title: "Travel Insurance",
    description: "Comprehensive coverage options to protect you during your travels worldwide."
  },
  {
    icon: <Package className="w-8 h-8 text-udan-orange" />,
    title: "Custom Packages",
    description: "Tailor-made travel packages designed to meet your specific preferences and budget."
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-udan-orange" />,
    title: "24/7 Support",
    description: "Round-the-clock assistance to ensure your travel experience remains worry-free."
  },
  {
    icon: <CreditCard className="w-8 h-8 text-udan-orange" />,
    title: "Secure Payments",
    description: "Multiple secure payment options to book your dream vacation with peace of mind."
  }
];

const ServicesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">Our Premium Services</h2>
          <p className="text-udan-gray">Discover the exceptional services we offer to make your travel experience unforgettable.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-udan-lightGray flex flex-col items-start"
            >
              <div className="mb-4 p-3 rounded-full bg-udan-lightGray">
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-udan-charcoal mb-2">{service.title}</h3>
              <p className="text-udan-gray">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
