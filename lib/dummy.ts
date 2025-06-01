// /lib/dummy.ts

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    sizes: ('S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL')[];
    images: string[]; // 3 image URLs
  };
  
  export const products: Product[] = [
    {
      id: '1',
      name: 'Minimalist Tee',
      description: 'Clean design, 100% cotton minimalist t-shirt.',
      price: 799,
      sizes: ['M', 'L', 'XL'],
      images: [
        '/images/minimalist-tee-1.jpg',
        '/images/minimalist-tee-2.jpg',
        '/images/minimalist-tee-3.jpg'
      ]
    },
    {
      id: '2',
      name: 'Logo Hoodie',
      description: 'Comfy fleece hoodie with subtle logo.',
      price: 1299,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        '/images/logo-hoodie-1.jpg',
        '/images/logo-hoodie-2.jpg',
        '/images/logo-hoodie-3.jpg'
      ]
    },
    {
      id: '3',
      name: 'Oversized Tee',
      description: 'Oversized fit for casual looks.',
      price: 849,
      sizes: ['L', 'XL', 'XXL', 'XXXL'],
      images: [
        '/images/oversized-tee-1.jpg',
        '/images/oversized-tee-2.jpg',
        '/images/oversized-tee-3.jpg'
      ]
    },
    {
      id: '4',
      name: 'Everyday Shorts',
      description: 'Durable shorts for everyday use.',
      price: 649,
      sizes: ['M', 'L', 'XL'],
      images: [
        '/images/shorts-1.jpg',
        '/images/shorts-2.jpg',
        '/images/shorts-3.jpg'
      ]
    },
    {
      id: '5',
      name: 'Layer Jacket',
      description: 'Water-resistant jacket perfect for layering.',
      price: 1999,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        '/images/jacket-1.jpg',
        '/images/jacket-2.jpg',
        '/images/jacket-3.jpg'
      ]
    },
    {
      id: '6',
      name: 'Basic Cap',
      description: 'Adjustable cap with clean design.',
      price: 499,
      sizes: ['S', 'M', 'L'],
      images: [
        '/images/cap-1.jpg',
        '/images/cap-2.jpg',
        '/images/cap-3.jpg'
      ]
    },
    {
      id: '7',
      name: 'Jogger Pants',
      description: 'Comfortable joggers with ankle cuffs.',
      price: 1099,
      sizes: ['M', 'L', 'XL', 'XXL'],
      images: [
        '/images/jogger-1.jpg',
        '/images/jogger-2.jpg',
        '/images/jogger-3.jpg'
      ]
    }
  ];
  