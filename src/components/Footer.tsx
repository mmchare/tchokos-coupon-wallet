import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Footer = () => {
  return (
    <footer className="bg-[#0A3D62] text-white pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-wider flex items-center gap-2">
              <span className="bg-brand-secondary text-white w-8 h-8 flex items-center justify-center rounded-lg text-lg">J</span>
              JinBao
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
              Global engineering, local logistics. Unbeatable prices between world-class tech manufacturers and your home.
            </p>
            <div className="flex gap-4 pt-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full">
                <Twitter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h3 className="font-bold text-brand-secondary mb-4 text-xs tracking-widest uppercase">Company</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Quality Control</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sustainability Hub</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Partner Program</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h3 className="font-bold text-brand-secondary mb-4 text-xs tracking-widest uppercase">Support</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Future Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Track My Package</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-brand-secondary mb-4 text-xs tracking-widest uppercase">Newsletter</h3>
            <p className="text-gray-300 text-sm mb-4">Get exclusive access to pre-launch batches and price drops.</p>
            <div className="space-y-2">
              <Input 
                placeholder="Enter your email" 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20"
              />
              <Button className="w-full bg-brand-secondary hover:bg-orange-600 text-white font-bold">
                SUBSCRIBE NOW
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>© 2026 JINBAO GLOBAL TECHNOLOGY LTD. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">PRIVACY</a>
            <a href="#" className="hover:text-white">TERMS</a>
            <a href="#" className="hover:text-white">COMPLIANCE</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
