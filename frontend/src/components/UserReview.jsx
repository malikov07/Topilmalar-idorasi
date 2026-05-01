import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const TestimonialCard = ({ name, surname, feedback, image }) => (
  <div className="bg-white rounded-[15px] p-5 shadow-sm flex flex-col gap-3 border border-gray-50 hover:shadow-md transition-shadow">
    <div className="flex flex-col gap-2">
      {/* Foydalanuvchi rasmi - biroz kichraytirildi */}
      <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-gray-100">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      
      {/* Ism va Familiya */}
      <div className="flex flex-col">
        <h4 className="text-[#0a1d37] font-bold text-base md:text-lg leading-tight uppercase">
          {surname}
        </h4>
        <h4 className="text-[#0a1d37] font-bold text-base md:text-lg leading-tight uppercase">
          {name}
        </h4>
      </div>
    </div>

    {/* Fikr matni - o'lchami kichraytirildi */}
    <p className="text-gray-500 text-xs md:text-sm leading-snug">
      {feedback}
    </p>
  </div>
);

const UserReview = () => {
  const { t } = useLanguage();
  const reviews = [
    {
      id: 1,
      name: "Feruzbek",
      surname: "Abdunosirov",
      feedback: "Men bu sayt orqali 3 kunda yo'qotgan narsamni topdim Rahmat hammaga",
      image: "https://media.gettyimages.com/id/175440771/photo/handsome-young-man-gesturing-thumbs-up-isolated.jpg?s=612x612&w=gi&k=20&c=rNDrj73bXAla605kVUdLvr2OkDNYhx8ITsk585iaeyI="
    },
    {
      id: 2,
      name: "Madina",
      surname: "Tursonova",
      feedback: "Reklama joylashtirgandim. 1 kunda topildi rahmat hammalaringa",
      image: "https://img.freepik.com/free-photo/lifestyle-people-emotions-casual-concept-confident-nice-smiling-asian-woman-cross-arms-chest-confident-ready-help-listening-coworkers-taking-part-conversation_1258-59335.jpg"
    },
    {
      id: 3,
      name: "Ozodbek",
      surname: "Egaberdiyev",
      feedback: "Hujjatlarimni tushirib qoldirgandim, shu platforma orqali 2 kunda xavfsiz topib oldim. Katta rahmat yaratuvchilarga!",
      image: "https://media.gettyimages.com/id/1369199360/photo/portrait-of-a-handsome-young-businessman-working-in-office.jpg?s=612x612&w=gi&k=20&c=BFc13n-vhT4GMd0ohRt0PFD3IzJ_Onf6nKDAObgh1CA="
    }
  ];

  return (
    <section className="bg-[#e6effa]/50 pt-6 pb-12 md:pt-10 md:pb-20"> {/* Padding-top (pt) kamaytirildi */}
      <div className="max-w-[85%] w-full mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sarlavha qismi */}
        <div className="lg:w-1/4 space-y-2">
          <h2 className="text-[#0a1d37] text-xl md:text-3xl font-bold leading-tight">
            {t('testimonials.title')}
          </h2>
          <p className="text-gray-700 text-xs md:text-sm font-medium">
            {t('testimonials.subtitle')}
          </p>
        </div>

        {/* Kartochkalar - Scroll olib tashlandi, grid qo'shildi */}
        <div className="lg:w-3/4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {reviews.map((item) => (
            <TestimonialCard key={item.id} {...item} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default UserReview;