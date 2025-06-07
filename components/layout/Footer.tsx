import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Empty column for spacing/alignment */}
        <div></div>

        {/* Get in Touch and Follow Us Section */}
        <div className="flex flex-col items-center">
          <div className="flex flex-row items-start gap-12">
            <div>
              <h3 className="text-lg font-normal text-gray-400 mb-2">GET IN TOUCH</h3>
              <p className="text-sm mb-0">isidoro.arthur09@gmail.com</p>
            </div>
            <div>
              <h3 className="text-lg font-normal text-gray-400 mb-2">FOLLOW US</h3>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/people/Rolyo-Clothing/61572881901986/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">
                  <Image src="/images/facebook-box-line.png" alt="Facebook" width={24} height={24} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm">
        <p>© 2025 ROLYO CLOTHING. ALL RIGHTS RESERVED.</p>
      </div>
    </footer>
  );
}
