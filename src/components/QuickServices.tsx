import { useTranslation } from 'react-i18next';

const services = [
  { key: 'quickSale', emoji: '⚡', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { key: 'deals', emoji: '🏷️', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'estimate', emoji: '💰', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { key: 'custom', emoji: '📋', bg: 'bg-sky-50 dark:bg-sky-950/30' },
];

const QuickServices = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-4 gap-3 px-1">
      {services.map((service, index) => (
        <button
          key={service.key}
          className={`flex flex-col items-center gap-2 py-3 px-1 rounded-2xl ${service.bg} hover:scale-105 transition-all duration-200 group animate-fade-in`}
          style={{ animationDelay: `${index * 80 + 200}ms`, animationFillMode: 'both' }}
        >
          <span className="text-3xl sm:text-4xl drop-shadow-sm group-hover:scale-110 transition-transform duration-200">
            {service.emoji}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-foreground/80 group-hover:text-foreground leading-tight text-center px-0.5">
            {t(`home.services.${service.key}`)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickServices;
