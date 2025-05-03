
import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  query: z.string().min(10, { message: "Query must be at least 10 characters" }),
});

type ContactFormData = z.infer<typeof contactSchema>;

const ContactForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    query: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = contactSchema.parse(formData);
      setIsSubmitting(true);
      
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Success
      toast({
        title: "Form submitted successfully!",
        description: "We'll get back to you as soon as possible.",
      });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        query: '',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-medium text-udan-charcoal">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
              errors.firstName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-udan-orange/20'
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm">{errors.firstName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-medium text-udan-charcoal">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
              errors.lastName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-udan-orange/20'
            }`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm">{errors.lastName}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-udan-charcoal">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
              errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-udan-orange/20'
            }`}
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-udan-charcoal">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
              errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-udan-orange/20'
            }`}
            placeholder="9876543210"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm">{errors.phone}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="query" className="block text-sm font-medium text-udan-charcoal">
          Your Query <span className="text-red-500">*</span>
        </label>
        <textarea
          id="query"
          name="query"
          value={formData.query}
          onChange={handleChange}
          rows={5}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
            errors.query ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-udan-orange/20'
          }`}
          placeholder="Please describe your travel requirements or questions..."
        />
        {errors.query && (
          <p className="text-red-500 text-sm">{errors.query}</p>
        )}
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-udan-orange hover:bg-udan-orange/90 text-white font-medium py-3 px-6 rounded-lg transition-colors w-full md:w-auto disabled:opacity-70"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
      </button>
    </form>
  );
};

export default ContactForm;
