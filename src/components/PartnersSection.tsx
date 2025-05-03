
const partners = [
  {
    name: "Emirates",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Emirates_logo.svg",
  },
  {
    name: "Marriott International",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Marriott_International_logo.svg",
  },
  {
    name: "Air India",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Air_India_Logo.svg",
  },
  {
    name: "Hyatt",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Hyatt_Logo.svg",
  },
];

const PartnersSection = () => {
  return (
    <section className="py-12 bg-udan-lightGray">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-center text-udan-gray text-lg mb-8">Trusted by world's best companies</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          {partners.map((partner) => (
            <div key={partner.name} className="flex justify-center">
              <img 
                src={partner.logo} 
                alt={partner.name} 
                className="h-12 md:h-16 object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
