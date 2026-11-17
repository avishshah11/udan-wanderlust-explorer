
const partners = [
  {
    name: "Emirates",
    logo: "https://logowik.com/content/uploads/images/emirates-airlines1768.jpg",
  },
  {
    name: "Marriott International",
    logo: "https://logowik.com/content/uploads/images/marriott-international8765.logowik.com.webp",
  },
  {
    name: "Air India",
    logo: "https://logowik.com/content/uploads/images/air-india-new-20247358.logowik.com.webp",
  },
  {
    name: "Hyatt",
    logo: "https://logowik.com/content/uploads/images/hyatt-hotels-corporation9011.jpg",
  },
];

const PartnersSection = () => {
  return (
    <section className="py-12 bg-udan-lightGray">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-center text-udan-gray text-lg mb-8">Trusted by world's best travel partners</h2>
        
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
