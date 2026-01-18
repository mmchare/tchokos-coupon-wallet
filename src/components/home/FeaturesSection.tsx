import { ShieldCheck, Truck, Award } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Secure Transaction',
      description: 'Fully encrypted checkout with 100% buyer protection.',
      color: 'bg-brand-primary/10 text-brand-primary',
      darkColor: 'dark:bg-brand-primary/20 dark:text-brand-primary'
    },
    {
      icon: Truck,
      title: 'Express Delivery',
      description: 'Order by 2pm for same-day dispatch. Arrives in 2-4 days.',
      color: 'bg-brand-success/10 text-brand-success',
      darkColor: 'dark:bg-brand-success/20 dark:text-brand-success'
    },
    {
      icon: Award,
      title: 'Factory Warranty',
      description: 'Rigorous quality checks and 12-month coverage.',
      color: 'bg-purple-50 text-purple-600',
      darkColor: 'dark:bg-purple-950/30 dark:text-purple-400'
    }
  ];

  return (
    <section className="bg-brand-section dark:bg-gray-900 py-16 border-b border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-4 p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-soft hover:shadow-card transition-all duration-300 group"
              >
                <div className={`p-4 rounded-xl ${feature.color} ${feature.darkColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-brand-text dark:text-white mb-2 text-lg">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
