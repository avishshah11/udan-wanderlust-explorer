
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-udan-charcoal mb-8">Privacy Policy</h1>
          
          <div className="prose max-w-none text-udan-gray">
            <p className="mb-4">Last updated: May 3, 2025</p>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to Udan Tours And Travels ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or communicate with us.
            </p>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-udan-charcoal mt-6 mb-3">2.1 Personal Information</h3>
            <p>
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Fill out forms on our website</li>
              <li>Make a booking or purchase</li>
              <li>Subscribe to our newsletter</li>
              <li>Contact customer service</li>
              <li>Participate in surveys or promotions</li>
            </ul>
            <p>
              This information may include your name, email address, postal address, phone number, payment information, travel preferences, and other information you choose to provide.
            </p>
            
            <h3 className="text-lg font-medium text-udan-charcoal mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <p>
              When you visit our website, we may automatically collect certain information about your device, including:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Time zone setting</li>
              <li>Pages visited</li>
              <li>Time spent on pages</li>
              <li>Referral source</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">3. How We Use Your Information</h2>
            <p>
              We may use the information we collect for various purposes, including to:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Process and manage your travel bookings</li>
              <li>Communicate with you about your inquiries, bookings, or account</li>
              <li>Send you promotional offers, newsletters, and marketing communications</li>
              <li>Improve our website, products, and services</li>
              <li>Analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues or fraudulent activities</li>
              <li>Comply with legal obligations</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">4. Disclosure of Your Information</h2>
            <p>
              We may share your information with:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Travel service providers (airlines, hotels, car rental companies, etc.) to fulfill your bookings</li>
              <li>Payment processors to process transactions</li>
              <li>Third-party service providers who assist us in operating our website and conducting business</li>
              <li>Legal authorities when required by law or to protect our rights</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">6. Your Choices</h2>
            <p>
              You have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Accessing, correcting, or deleting your personal information</li>
              <li>Withdrawing consent for processing your information</li>
              <li>Opting out of marketing communications</li>
              <li>Requesting a copy of your personal information</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">7. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date and will be effective as soon as it is accessible. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
            
            <h2 className="text-xl font-semibold text-udan-charcoal mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              Udan Tours And Travels<br />
              714, Yashkamal Building, above Havmor Restaurant,<br />
              Opposite M.S. University, Sarod, Sayajiganj,<br />
              Vadodara, Gujarat 390005<br />
              Email: udantravels.bdq@gmail.com<br />
              Phone: 0265 400 8999
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
