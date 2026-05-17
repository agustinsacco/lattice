import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="container mx-auto px-4 py-12 md:py-20 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-heading font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg prose-gray max-w-none space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              At Lattice ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal
              data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our AI-powered PDF assistant service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
              <p className="text-gray-600 leading-relaxed">
                We may collect personal information that you voluntarily provide to us when you register for the
                Service, such as your name, email address, and payment information.
              </p>

              <h3 className="text-xl font-semibold text-gray-900">Document Data</h3>
              <p className="text-gray-600 leading-relaxed">
                When you upload PDF documents to Lattice, we collect and process the content of these documents to
                provide the Service. We treat your documents as confidential.
              </p>

              <h3 className="text-xl font-semibold text-gray-900">Usage Data</h3>
              <p className="text-gray-600 leading-relaxed">
                We automatically collect certain information when you visit, use, or navigate the Service. This
                information does not reveal your specific identity (like your name or contact information) but may
                include device and usage information, such as your IP address, browser and device characteristics,
                operating system, language preferences, referring URLs, device name, country, location, information
                about how and when you use our Service, and other technical information.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">We use the information we collect or receive:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li>To provide, operate, and maintain our Service.</li>
              <li>To improve, personalize, and expand our Service.</li>
              <li>To understand and analyze how you use our Service.</li>
              <li>To process your transactions and manage your orders.</li>
              <li>
                To communicate with you, either directly or through one of our partners, including for customer service,
                to provide you with updates and other information relating to the Service, and for marketing and
                promotional purposes.
              </li>
              <li>To find and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. AI and Data Processing</h2>
            <p className="text-gray-600 leading-relaxed">
              Lattice uses third-party Large Language Model (LLM) providers to process your documents and generate
              responses.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li>
                <strong>Data Privacy:</strong> We do not use your uploaded documents or the content of your
                conversations to train our own AI models, nor do we allow our third-party LLM providers to use your data
                for training their models, unless you explicitly opt-in.
              </li>
              <li>
                <strong>Data Transmission:</strong> Your data is transmitted securely (encrypted in transit) to our AI
                providers for the sole purpose of generating responses to your queries.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We use administrative, technical, and physical security measures to help protect your personal
              information. While we have taken reasonable steps to secure the personal information you provide to us,
              please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method
              of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Third-Party Websites</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service may contain links to third-party websites and applications of interest that are not affiliated
              with us. Once you have used these links to leave our Service, any information you provide to these third
              parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your
              information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions or comments about this policy, you may email us at privacy@lattice.com.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 mt-20">
        <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Lattice. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Terms and Conditions
            </Link>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
