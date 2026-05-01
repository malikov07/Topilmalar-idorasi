import React from 'react';
// Changed BellPlus to Bell (valid Lucide icon)
import { UserPlus, Bell, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const InfoCard = ({ icon: Icon, title, description }) => (
  <div className=" bg-[#E6EFFA]/50 rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-lg cursor-pointer">
    {/* Icon Container - Smaller size */}
    <div className="bg-[#1e88e5] w-12 h-12 rounded-lg flex items-center justify-center shadow-md">
      <Icon size={24} color="white" />
    </div>
    
    <div className="space-y-2">
      <h3 className="text-[#0a1d37] text-xl font-bold">
        {title}
      </h3>
      <p className="text-[#838383] text-sm leading-snug">
        {description}
      </p>
    </div>
  </div>
);

const HowItWorks = () => {
  const { t } = useLanguage();
  const data = [
    {
      icon: UserPlus,
      title: t('landing.step1Title'),
      description: t('landing.step1Description'),
    },
    {
      icon: Bell, // Fixed from BellPlus
      title: t('landing.step2Title'),
      description: t('landing.step2Description'),
    },
    {
      icon: AlertCircle,
      title: t('landing.step3Title'),
      description: t('landing.step3Description'),
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10">
      <h1 className='text-xl sm:text-2xl lg:text-3xl mb-5 sm:mb-8 font-bold leading-tight'>{t('landing.howItWorks')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {data.map((item, index) => (
          <InfoCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;