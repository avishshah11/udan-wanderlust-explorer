
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Company Story Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-udan-charcoal mb-6">About Udan</h1>
                <div className="space-y-4 text-udan-gray">
                  <p>
                    Pioneering the travel industry since 1997, Udan is your go-to source for all things travel. From flights to accommodations, tours to transfers, we've got you covered.
                  </p>
                  <p>
                    Our mission is simple: to make your travel dreams a reality, hassle-free. With our expert team of travel consultants and extensive network of partners worldwide, we craft unforgettable journeys tailored to your preferences and budget.
                  </p>
                  <p>
                    We believe that travel is not just about destinations; it's about experiences that transform you. With Udan, every journey is a smooth ride from start to finish, filled with authentic moments and cherished memories.
                  </p>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <div className="bg-udan-lightGray rounded-lg p-4 flex-1">
                    <h3 className="text-udan-charcoal font-bold text-xl mb-2">25+</h3>
                    <p className="text-udan-gray">Years of Experience</p>
                  </div>
                  <div className="bg-udan-lightGray rounded-lg p-4 flex-1">
                    <h3 className="text-udan-charcoal font-bold text-xl mb-2">10,000+</h3>
                    <p className="text-udan-gray">Happy Travelers</p>
                  </div>
                  <div className="bg-udan-lightGray rounded-lg p-4 flex-1">
                    <h3 className="text-udan-charcoal font-bold text-xl mb-2">150+</h3>
                    <p className="text-udan-gray">Destinations</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=987"
                  alt="Travel Experts" 
                  className="rounded-xl shadow-lg w-full h-auto"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 max-w-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                        </svg>
                      ))}
                    </div>
                    <span className="font-bold text-udan-charcoal">4.9/5</span>
                  </div>
                  <p className="text-udan-gray text-sm">
                    "Exceptional service! Udan made our family trip to Europe absolutely perfect. Will definitely book with them again."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Values Section */}
        <section className="py-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-udan-orange/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-udan-orange text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-4">Customer First</h3>
                <p className="text-udan-gray">We prioritize your needs and preferences, ensuring every trip exceeds your expectations.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-udan-orange/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-udan-orange text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-4">Quality Service</h3>
                <p className="text-udan-gray">We partner with the best providers to deliver premium experiences at competitive prices.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-udan-orange/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-udan-orange text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-4">Responsible Travel</h3>
                <p className="text-udan-gray">We promote sustainable tourism practices that respect local communities and environments.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Google Maps Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">Visit Our Office</h2>
              <p className="text-udan-gray">Come meet our friendly team and plan your next adventure in person.</p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3691.1866736885286!2d73.18702840000002!3d22.30877880000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395fc89428d49e59%3A0x8f3010e90a528a89!2sUdan%20Tours%20And%20Travels!5e0!3m2!1sen!2sin!4v1746263644302!5m2!1sen!2sin" 
                width="100%" 
                height="450" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Udan Tours and Travels Office Location"
              ></iframe>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
