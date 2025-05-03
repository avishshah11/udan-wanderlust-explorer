
const partners = [
  {
    name: "Emirates",
    logo: "https://logos-world.net/wp-content/uploads/2020/03/Emirates-Logo-700x394.png",
  },
  {
    name: "Marriott International",
    logo: "https://logos-world.net/wp-content/uploads/2020/11/Marriott-Logo-700x394.png",
  },
  {
    name: "Air India",
    logo: "https://logos-world.net/wp-content/uploads/2020/03/Air-India-Logo-700x394.png",
  },
  {
    name: "Hyatt",
    logo: "https://logos-world.net/wp-content/uploads/2021/08/Hyatt-Logo-700x394.png",
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
