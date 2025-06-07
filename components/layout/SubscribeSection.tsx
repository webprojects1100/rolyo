import SubscribeForm from '@/components/ui/SubscribeForm';

export default function SubscribeSection() {
  return (
    <section className="bg-gray-100 py-8 px-6 text-center">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Stay Updated</h2>
        <p className="text-gray-600 mb-4">
          Subscribe to our newsletter to get the latest updates.
        </p>
        <div className="flex justify-center w-full">
          <div className="w-full max-w-md">
            <SubscribeForm />
          </div>
        </div>
      </div>
    </section>
  );
} 