
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-udan-charcoal mb-4">Contact Us</h1>
            <p className="text-udan-gray max-w-2xl mx-auto">
              Have questions about our travel packages or need assistance planning your trip? We're here to help!
            </p>
          </div>
        </section>
        
        {/* Contact Info & Form */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div>
                <h2 className="text-2xl font-bold text-udan-charcoal mb-6">Get in Touch</h2>
                <p className="text-udan-gray mb-8">
                  Our travel experts are ready to help you plan the perfect trip. Reach out to us through any of the following channels.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-udan-orange/10 rounded-lg">
                      <MapPin className="text-udan-orange w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-udan-charcoal mb-1">Office Address</h3>
                      <p className="text-udan-gray">
                        714, Yashkamal Building, above Havmor Restaurant,<br />
                        Opposite M.S. University, Sarod, Sayajiganj,<br />
                        Vadodara, Gujarat 390005
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-udan-orange/10 rounded-lg">
                      <Phone className="text-udan-orange w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-udan-charcoal mb-1">Call Us</h3>
                      <p className="text-udan-gray">Mobile: +91 9376214442</p>
                      <p className="text-udan-gray">Phone: 0265 400 8999</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-udan-orange/10 rounded-lg">
                      <Mail className="text-udan-orange w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-udan-charcoal mb-1">Email Us</h3>
                      <p className="text-udan-gray">udantravels.bdq@gmail.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-udan-orange/10 rounded-lg">
                      <Clock className="text-udan-orange w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-udan-charcoal mb-1">Business Hours</h3>
                      <p className="text-udan-gray">Monday - Saturday: 9:30 AM - 7:30 PM</p>
                      <p className="text-udan-gray">Sunday: 11:00 AM - 4:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contact Form */}
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-udan-lightGray">
                <h2 className="text-2xl font-bold text-udan-charcoal mb-6">Send Us a Message</h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
        
        {/* Map */}
        <section className="py-12 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6">
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

export default Contact;
