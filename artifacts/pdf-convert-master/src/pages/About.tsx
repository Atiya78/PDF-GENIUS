import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useSeo } from "@/lib/useSeo";
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
  useSeo({
    title: "About PDF Genius",
    description:
      "Learn about PDF Genius — the free, secure, browser-based suite of PDF and image tools trusted by millions to convert, edit and manage documents.",
    canonicalPath: "/about",
  });
  const [, setLocation] = useLocation();

  const coreValues = [
    {
      icon: Shield,
      title: "Security First",
      description: "Your documents are processed with bank-level security. We never store your files and all transfers are encrypted."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Our optimized conversion engine processes files in seconds, not minutes. Get your results instantly."
    },
    {
      icon: Heart,
      title: "User-Centric",
      description: "Every feature is designed with you in mind. Simple, intuitive, and powerful tools that just work."
    },
    {
      icon: Globe,
      title: "Accessible",
      description: "Available 24/7 from anywhere in the world. No downloads, no installations, just pure convenience."
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Digital-first approach reduces paper waste. Our servers run on renewable energy sources."
    },
    {
      icon: Headphones,
      title: "Expert Support",
      description: "Our dedicated support team is always ready to help. Professional assistance when you need it."
    }
  ];

  const teamMembers = [
    {
      name: "Sarah Johnson",
      position: "Chief Executive Officer",
      description: "Leading PDF Genius with 15+ years of experience in tech innovation and digital transformation.",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/e57646e20adf34f0f3b39ea49f9a6ca981e0f8df?width=504"
    },
    {
      name: "Michael Chen",
      position: "Chief Technology Officer",
      description: "Architecting our cutting-edge conversion technology with expertise in cloud computing and AI systems.",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/01b806e57e80d577978bee50b6dc9d71af006df2?width=504"
    },
    {
      name: "Emily Rodriguez",
      position: "Head of Product",
      description: "Ensuring our tools meet user needs through innovative design and user experience optimization.",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/4d4fc0c5bed2bd9a4b7514963fcef4e8beda5656?width=504"
    },
    {
      name: "David Kim",
      position: "Head of Security",
      description: "Protecting user data with advanced security protocols and industry-leading encryption standards.",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/df8fa776e0c3b39f121324b712ecf19d28f076bd?width=504"
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-6 text-lg text-gray-600">
                <p>
                  Founded with a vision to simplify document management, PDF Genius has become the trusted solution for millions of users worldwide. Our journey began when we recognized the growing need for reliable, secure, and user-friendly PDF tools.
                </p>
                <p>
                  We've built a platform that combines cutting-edge technology with intuitive design, making professional PDF conversion accessible to everyone.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">10M+</div>
                  <div className="text-gray-600">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">150+</div>
                  <div className="text-gray-600">Countries Served</div>
                </div>
              </div>
            </div>
            
            <div>
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/1d8a687c2ae4c42db87394ec89dbfcc7c3fb088a?width=1056"
                alt="Team collaboration"
                className="w-full h-96 object-cover rounded-lg shadow-xl"
              />
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

      {/* Meet Our Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The passionate professionals behind PDF Genius
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="relative">
                  <img 
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-blue-600 font-semibold mb-3">{member.position}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{member.description}</p>
                </div>
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
              <p className="text-gray-200 text-sm">Available 24/7</p>
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
