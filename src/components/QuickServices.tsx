import { useTranslation } from 'react-i18next';
import { Zap, Tag, Calculator, ClipboardList } from 'lucide-react';

const services = [
  { key: 'quickSale', icon: Zap, gradient: 'from-orange-400 to-red-500', emoji: '⚡' },
  { key: 'deals', icon: Tag, gradient: 'from-emerald-400 to-teal-500', emoji: '🏷️' },
  { key: 'estimate', icon: Calculator, gradient: 'from-violet-400 to-purple-500', emoji: '💰' },
  { key: 'custom', icon: ClipboardList, gradient: 'from-sky-400 to-blue-500', emoji: '📋' },
];

const QuickServices = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-4 gap-2 px-1">
      {services.map((service, index) => {
        const Icon = service.icon;
        return (
          <button
            key={service.key}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-card hover:bg-accent/50 transition-all duration-200 hover:scale-105 group animate-fade-in"
            style={{ animationDelay: `${index * 80 + 200}ms`, animationFillMode: 'both' }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground group-hover:text-foreground leading-tight text-center">
              {t(`home.services.${service.key}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickServices;
