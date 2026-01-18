import { ShieldCheck, Truck, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: ShieldCheck,
      title: t('home.features.secure.title'),
      description: t('home.features.secure.desc'),
      color: 'bg-brand-primary/10 text-brand-primary',
      darkColor: 'dark:bg-brand-primary/20 dark:text-brand-primary'
    },
    {
      icon: Truck,
      title: t('home.features.express.title'),
      description: t('home.features.express.desc'),
      color: 'bg-brand-success/10 text-brand-success',
      darkColor: 'dark:bg-brand-success/20 dark:text-brand-success'
    },
    {
      icon: Award,
      title: t('home.features.warranty.title'),
      description: t('home.features.warranty.desc'),
      color: 'bg-purple-50 text-purple-600',
      darkColor: 'dark:bg-purple-950/30 dark:text-purple-400'
    }
  ];

  return (
    <section className="bg-brand-section dark:bg-gray-900 py-8 md:py-16 border-b border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 overflow-hidden">
        <div className="flex overflow-x-auto pb-4 gap-3 md:gap-8 md:grid md:grid-cols-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 scroll-pl-4 snap-x">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-3 md:gap-4 p-4 md:p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-soft hover:shadow-card transition-all duration-300 group min-w-[240px] md:min-w-0 flex-shrink-0 snap-center"
              >
                <div className={`p-3 md:p-4 rounded-xl ${feature.color} ${feature.darkColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-brand-text dark:text-white mb-2 text-base md:text-lg">
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
