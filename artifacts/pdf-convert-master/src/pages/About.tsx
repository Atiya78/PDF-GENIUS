import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { usePublicSeo } from "@/lib/usePublicSeo";
import { 
  Shield, 
  Zap, 
  Heart, 
  Globe, 
  Leaf, 
  Headphones,
  Building,
  Phone,
  Globe2
} from "lucide-react";

export const About = (): JSX.Element => {
  usePublicSeo("/about");
  const [, setLocation] = useLocation();

  const coreValues = [
    {
      icon: Shield,
      title: "Security First",
      description: "File transfers use HTTPS. Some tools run entirely in your browser; others upload your file to be processed."
    },
    {
      icon: Zap,
      title: "Straightforward",
      description: "Pick a tool, add your file, download the result. No signup needed for the free web tools."
    },
    {
      icon: Heart,
      title: "User-Centric",
      description: "Every feature is designed with you in mind. Simple, intuitive, and powerful tools that just work."
    },
    {
      icon: Globe,
      title: "Accessible",
      description: "Use it from any modern browser. No installation needed."
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Digital-first approach reduces paper waste. Our servers run on renewable energy sources."
    },
    {
      icon: Headphones,
      title: "Support",
      description: "Questions or problems? Reach us through the Support page."
    }
  ];


  return (
    <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      
      {/* Hero Section */}
      <section 
        className="relative h-[400px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://api.builder.io/api/v1/image/assets/TEMP/20bcb3bd3bfc2186efb205fa91833735238659a2?width=2880')"
        }}
      >
        <div className="text-center text-white max-w-4xl px-6">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            About <span className="text-blue-300">PDF Genius</span>
          </h1>
          <p className="text-2xl mb-8 leading-relaxed max-w-3xl mx-auto">
            Empowering businesses and individuals with professional PDF solutions since our founding
          </p>
          
          <div className="flex items-center justify-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-300" />
              <span>PDF Genius</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-300" />
              <span>+447429919748</span>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid gap-12 items-center max-w-3xl">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-6 text-lg text-gray-600">
                <p>
                  PDF Genius offers practical PDF and image tools that are free to use without signup, alongside a separate paid developer API.
                </p>
                <p>
                  The web tools are free to use without an account. The developer API is a separate paid product.
                </p>
              </div>
              
              
            </div>
            
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do at PDF Genius
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreValues.map((value, index) => (
              <Card key={index} className="p-8 bg-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <value.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Get in Touch Section */}
      <section className="py-20 bg-slate-900 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              Have questions about our services? We'd love to hear from you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">Company</h3>
              <p className="text-gray-200 mb-1">PDF Genius</p>
              <p className="text-gray-200">Professional PDF Solutions</p>
            </div>
            
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">Phone</h3>
              <p className="text-gray-200 mb-1">+447429919748</p>
              <p className="text-gray-200 text-sm">Contact us via Support</p>
            </div>
            
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">Website</h3>
              <p className="text-gray-200 mb-1">pdfgenius.app</p>
              <p className="text-gray-200 text-sm">Your trusted PDF partner</p>
            </div>
          </div>
          
          <div className="text-center">
            <Button
              className="bg-white text-slate-900 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              onClick={() => setLocation('/contact')}
            >
              Contact Us Today
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
