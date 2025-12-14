import { useNavigate } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import MasonryProductCard from './MasonryProductCard';

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  isAuction?: boolean;
}

interface SimilarProductsProps {
  products: SimilarProduct[];
  currentProductId: string;
}

const SimilarProducts = ({ products, currentProductId }: SimilarProductsProps) => {
  const filteredProducts = products.filter(p => p.id !== currentProductId);

  if (filteredProducts.length === 0) return null;

  const breakpointColumnsObj = {
    default: 2,
    640: 2,
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold text-foreground mb-4 px-4">
        Produits similaires
      </h3>
      <div className="px-4">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-3 w-auto"
          columnClassName="pl-3 bg-clip-padding"
        >
          {filteredProducts.map((product) => (
            <MasonryProductCard
              key={product.id}
              id={product.id}
              image={product.image}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              rating={product.rating}
              isAuction={product.isAuction}
            />
          ))}
        </Masonry>
      </div>
    </div>
  );
};

export default SimilarProducts;
