
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Globe, CheckCircle, Award, Users } from "lucide-react";
import { Link } from "react-router-dom";

const countries = [
  { 
    name: "United States",
    flag: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/1920px-Flag_of_the_United_States.svg.png",
    visaTypes: ["Tourist", "Business", "Student", "Work"]
  },
  { 
    name: "Canada",
    flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Flag_of_Canada_%28Pantone%29.svg/1920px-Flag_of_Canada_%28Pantone%29.svg.png",
    visaTypes: ["Tourist", "Business", "Student", "Work"]
  },
  { 
    name: "United Kingdom",
    flag: "https://upload.wikimedia.org/wikipedia/en/thumb/a/ae/Flag_of_the_United_Kingdom.svg/1920px-Flag_of_the_United_Kingdom.svg.png",
    visaTypes: ["Tourist", "Business", "Student", "Work"]
  },
  { 
    name: "Germany",
    flag: "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/1920px-Flag_of_Germany.svg.png",
    visaTypes: ["Schengen", "Business", "Student", "Work"]
  },
  { 
    name: "Australia",
    flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Flag_of_Australia_%28converted%29.svg/1920px-Flag_of_Australia_%28converted%29.svg.png",
    visaTypes: ["Tourist", "Business", "Student", "Work"]
  },
  { 
    name: "Singapore",
    flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Flag_of_Singapore.svg/1920px-Flag_of_Singapore.svg.png",
    visaTypes: ["Tourist", "Business", "Work"]
  },
  { 
    name: "United Arab Emirates",
    flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Flag_of_the_United_Arab_Emirates.svg/1920px-Flag_of_the_United_Arab_Emirates.svg.png",
    visaTypes: ["Tourist", "Business", "Work"]
  },
  { 
    name: "Japan",
    flag: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Flag_of_Japan.svg/1920px-Flag_of_Japan.svg.png",
    visaTypes: ["Tourist", "Business", "Student", "Work"]
  },
];

const Visa = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-udan-charcoal mb-4">Expert Visa Services</h1>
            <p className="text-udan-gray max-w-2xl mx-auto">
              With 25 years of experience, we provide expert visa assistance for all countries, making your travel dreams a reality.
            </p>
          </div>
        </section>
        
        {/* Why Choose Us */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">Why Choose Our Visa Services</h2>
              <p className="text-udan-gray max-w-2xl mx-auto">
                We've helped thousands of travelers secure visas to their dream destinations with our streamlined process and expert guidance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-udan-orange" />
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-2">25+ Years Experience</h3>
                <p className="text-udan-gray">Over two decades of expertise in visa processing and consultation.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-udan-orange" />
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-2">Global Coverage</h3>
                <p className="text-udan-gray">Visa assistance for over 100 countries worldwide.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-udan-orange" />
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-2">High Success Rate</h3>
                <p className="text-udan-gray">98% visa approval rate for our clients.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-udan-orange" />
                </div>
                <h3 className="text-xl font-semibold text-udan-charcoal mb-2">Personalized Support</h3>
                <p className="text-udan-gray">Dedicated visa counselors to guide you through the entire process.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Popular Visa Destinations */}
        <section className="py-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-8 text-center">
              Popular Visa Destinations
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {countries.map((country) => (
                <div key={country.name} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={country.flag} 
                      alt={`${country.name} flag`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-udan-charcoal mb-2">{country.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {country.visaTypes.map((type) => (
                        <span 
                          key={type} 
                          className="inline-block text-xs bg-udan-orange/10 text-udan-orange px-2 py-1 rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <Link
                      to="/contact"
                      className="block w-full text-center bg-udan-orange text-white py-2 rounded-md hover:bg-udan-orange/90 transition-colors text-sm font-medium"
                    >
                      Inquire Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Our Visa Process */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">
                Our Simple Visa Process
              </h2>
              <p className="text-udan-gray max-w-2xl mx-auto">
                We streamline the visa application process to make it hassle-free for you.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center relative">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-udan-orange">1</span>
                </div>
                <h3 className="text-lg font-semibold text-udan-charcoal mb-2">Consultation</h3>
                <p className="text-udan-gray">Initial consultation to understand your travel needs and visa requirements.</p>
                
                <div className="hidden md:block absolute top-8 right-0 w-full h-1 bg-udan-orange/20">
                  <div className="absolute right-0 -translate-y-1/2 bg-white p-1 rounded-full">
                    <div className="w-3 h-3 bg-udan-orange rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center relative">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-udan-orange">2</span>
                </div>
                <h3 className="text-lg font-semibold text-udan-charcoal mb-2">Documentation</h3>
                <p className="text-udan-gray">We help you prepare all necessary documents as per the embassy requirements.</p>
                
                <div className="hidden md:block absolute top-8 right-0 w-full h-1 bg-udan-orange/20">
                  <div className="absolute right-0 -translate-y-1/2 bg-white p-1 rounded-full">
                    <div className="w-3 h-3 bg-udan-orange rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center relative">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-udan-orange">3</span>
                </div>
                <h3 className="text-lg font-semibold text-udan-charcoal mb-2">Application</h3>
                <p className="text-udan-gray">We submit your application and handle all communications with the embassy.</p>
                
                <div className="hidden md:block absolute top-8 right-0 w-full h-1 bg-udan-orange/20">
                  <div className="absolute right-0 -translate-y-1/2 bg-white p-1 rounded-full">
                    <div className="w-3 h-3 bg-udan-orange rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-udan-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-udan-orange">4</span>
                </div>
                <h3 className="text-lg font-semibold text-udan-charcoal mb-2">Approval</h3>
                <p className="text-udan-gray">Collect your visa and get ready for your journey!</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-16 bg-udan-orange/5">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">
              Ready to Start Your Visa Process?
            </h2>
            <p className="text-udan-gray max-w-2xl mx-auto mb-8">
              Contact our visa experts today for a hassle-free experience and expert guidance throughout your visa application process.
            </p>
            <Link
              to="/contact"
              className="inline-flex bg-udan-orange text-white px-8 py-3 rounded-full font-medium hover:bg-udan-orange/90 transition-colors"
            >
              Contact Our Visa Experts
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Visa;
