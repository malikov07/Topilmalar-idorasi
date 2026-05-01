export const getCategoryDisplayName = (category, language = 'uz') => {
  if (!category) return '';

  const preferredKeys = [
    `name_${language}`,
    'name_uz',
    'name_en',
    'name_ru',
    'name',
  ];

  for (const key of preferredKeys) {
    const value = category[key];
    if (value) return value;
  }

  return '';
};
