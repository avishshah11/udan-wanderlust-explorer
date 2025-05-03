
import { Star } from 'lucide-react';

interface DestinationCardProps {
  image: string;
  name: string;
  price: number;
  rating: number;
  currency?: string;
}

const DestinationCard = ({
  image,
  name,
  price,
  rating,
  currency = "₹"
}: DestinationCardProps) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="aspect-[4/3] overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
        />
      </div>
      <div className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-udan-charcoal mb-2">{name}</h3>
        <div className="flex items-center mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i} 
              className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
            />
          ))}
        </div>
        <p className="text-udan-gray">Starting from <span className="text-udan-blue font-medium">{currency}{price.toLocaleString()}</span></p>
      </div>
    </div>
  );
};

export default DestinationCard;
