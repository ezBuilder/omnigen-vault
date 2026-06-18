// Localized display labels for every taxonomy category (kebab slug → {en,ko,ja,zh,es}).
// Single source of truth shared by the SPA (web/) and the server. Kept in sync with
// taxonomy.js CATEGORY_NAMES by a unit test (test/unit.test.js): adding a category there
// without a label here fails the build.

export const CATEGORY_LABELS = {
  'nature-landscapes': { en: 'Nature & landscapes', ko: '자연·풍경', ja: '自然・風景', zh: '自然风光', es: 'Naturaleza y paisajes' },
  'mountains-peaks': { en: 'Mountains & peaks', ko: '산·봉우리', ja: '山・峰', zh: '山峰', es: 'Montañas y cumbres' },
  'forests-woodlands': { en: 'Forests & woodlands', ko: '숲·삼림', ja: '森・林', zh: '森林', es: 'Bosques' },
  'deserts-dunes': { en: 'Deserts & dunes', ko: '사막·사구', ja: '砂漠・砂丘', zh: '沙漠与沙丘', es: 'Desiertos y dunas' },
  'beaches-coastlines': { en: 'Beaches & coastlines', ko: '해변·해안', ja: 'ビーチ・海岸', zh: '海滩与海岸', es: 'Playas y costas' },
  'waterfalls-rivers': { en: 'Waterfalls & rivers', ko: '폭포·강', ja: '滝・川', zh: '瀑布与河流', es: 'Cascadas y ríos' },
  'skies-clouds': { en: 'Skies & clouds', ko: '하늘·구름', ja: '空・雲', zh: '天空与云', es: 'Cielos y nubes' },
  'aerial-landscapes': { en: 'Aerial landscapes', ko: '항공 풍경', ja: '空撮風景', zh: '航拍风景', es: 'Paisajes aéreos' },
  'space-cosmos': { en: 'Space & cosmos', ko: '우주', ja: '宇宙', zh: '太空宇宙', es: 'Espacio y cosmos' },
  'underwater-marine': { en: 'Underwater & marine', ko: '수중·해양', ja: '水中・海洋', zh: '水下海洋', es: 'Submarino y marino' },
  'weather-atmosphere': { en: 'Weather & atmosphere', ko: '날씨·대기', ja: '天気・大気', zh: '天气与大气', es: 'Clima y atmósfera' },
  'seasons-nature': { en: 'Seasons in nature', ko: '계절·자연', ja: '四季・自然', zh: '季节自然', es: 'Estaciones y naturaleza' },
  'flora-plants': { en: 'Flora & plants', ko: '식물', ja: '植物', zh: '植物', es: 'Flora y plantas' },
  'flowers-blooms': { en: 'Flowers & blooms', ko: '꽃', ja: '花', zh: '花卉', es: 'Flores' },
  'trees-foliage': { en: 'Trees & foliage', ko: '나무·잎', ja: '木・葉', zh: '树木枝叶', es: 'Árboles y follaje' },
  'fruits-vegetables': { en: 'Fruits & vegetables', ko: '과일·채소', ja: '果物・野菜', zh: '水果蔬菜', es: 'Frutas y verduras' },
  'animals-wildlife': { en: 'Animals & wildlife', ko: '동물·야생', ja: '動物・野生', zh: '动物野生', es: 'Animales y vida salvaje' },
  'birds': { en: 'Birds', ko: '새', ja: '鳥', zh: '鸟类', es: 'Aves' },
  'sea-creatures': { en: 'Sea creatures', ko: '바다 생물', ja: '海の生き物', zh: '海洋生物', es: 'Criaturas marinas' },
  'insects-microfauna': { en: 'Insects & microfauna', ko: '곤충·미소생물', ja: '昆虫・微小生物', zh: '昆虫微生物', es: 'Insectos y microfauna' },
  'reptiles-amphibians': { en: 'Reptiles & amphibians', ko: '파충류·양서류', ja: '爬虫類・両生類', zh: '爬行与两栖', es: 'Reptiles y anfibios' },
  'pets-domestic': { en: 'Pets & domestic', ko: '반려·가정 동물', ja: 'ペット・家庭動物', zh: '宠物家养', es: 'Mascotas y domésticos' },
  'farm-animals': { en: 'Farm animals', ko: '농장 동물', ja: '農場の動物', zh: '农场动物', es: 'Animales de granja' },
  'mythical-creatures': { en: 'Mythical creatures', ko: '신화 속 생물', ja: '神話の生き物', zh: '神话生物', es: 'Criaturas míticas' },
  'food-and-drink': { en: 'Food & drink', ko: '음식·음료', ja: '食べ物・飲み物', zh: '食物饮料', es: 'Comida y bebida' },
  'desserts-sweets': { en: 'Desserts & sweets', ko: '디저트·과자', ja: 'デザート・お菓子', zh: '甜点', es: 'Postres y dulces' },
  'beverages-drinks': { en: 'Beverages & drinks', ko: '음료', ja: 'ドリンク', zh: '饮品', es: 'Bebidas' },
  'portraits-people': { en: 'Portraits & people', ko: '인물·초상', ja: 'ポートレート・人物', zh: '人物肖像', es: 'Retratos y personas' },
  'people-silhouettes': { en: 'People silhouettes', ko: '인물 실루엣', ja: '人物シルエット', zh: '人物剪影', es: 'Siluetas de personas' },
  'fashion-style': { en: 'Fashion & style', ko: '패션·스타일', ja: 'ファッション・スタイル', zh: '时尚风格', es: 'Moda y estilo' },
  'dance-movement': { en: 'Dance & movement', ko: '춤·움직임', ja: 'ダンス・動き', zh: '舞蹈律动', es: 'Danza y movimiento' },
  'sports-activities': { en: 'Sports & activities', ko: '스포츠·활동', ja: 'スポーツ・活動', zh: '运动活动', es: 'Deportes y actividades' },
  'architecture-buildings': { en: 'Architecture & buildings', ko: '건축·건물', ja: '建築・建物', zh: '建筑', es: 'Arquitectura y edificios' },
  'interiors-spaces': { en: 'Interiors & spaces', ko: '인테리어·공간', ja: 'インテリア・空間', zh: '室内空间', es: 'Interiores y espacios' },
  'urban-cityscapes': { en: 'Urban cityscapes', ko: '도시 풍경', ja: '都市風景', zh: '城市风光', es: 'Paisajes urbanos' },
  'landmarks-monuments': { en: 'Landmarks & monuments', ko: '랜드마크·기념물', ja: 'ランドマーク・記念碑', zh: '地标古迹', es: 'Lugares y monumentos' },
  'villages-rural': { en: 'Villages & rural', ko: '마을·시골', ja: '村・田舎', zh: '乡村', es: 'Pueblos y rural' },
  'everyday-objects': { en: 'Everyday objects', ko: '일상 사물', ja: '日用品', zh: '日常物品', es: 'Objetos cotidianos' },
  'vehicles-transport': { en: 'Vehicles & transport', ko: '탈것·교통', ja: '乗り物・交通', zh: '交通工具', es: 'Vehículos y transporte' },
  'technology-objects': { en: 'Technology objects', ko: '기술·기기', ja: 'テクノロジー機器', zh: '科技物品', es: 'Objetos tecnológicos' },
  'music-instruments': { en: 'Musical instruments', ko: '악기', ja: '楽器', zh: '乐器', es: 'Instrumentos musicales' },
  'tools-hardware': { en: 'Tools & hardware', ko: '공구·철물', ja: '工具・金物', zh: '工具五金', es: 'Herramientas y ferretería' },
  'jewelry-accessories': { en: 'Jewelry & accessories', ko: '주얼리·액세서리', ja: 'ジュエリー・小物', zh: '珠宝配饰', es: 'Joyas y accesorios' },
  'toys-collectibles': { en: 'Toys & collectibles', ko: '장난감·수집품', ja: 'おもちゃ・コレクション', zh: '玩具收藏', es: 'Juguetes y coleccionables' },
  'abstract-geometric': { en: 'Abstract & geometric', ko: '추상·기하', ja: '抽象・幾何', zh: '抽象几何', es: 'Abstracto y geométrico' },
  'textures-patterns': { en: 'Textures & patterns', ko: '텍스처·패턴', ja: 'テクスチャ・パターン', zh: '纹理图案', es: 'Texturas y patrones' },
  'pattern-surface-design': { en: 'Surface pattern design', ko: '표면 패턴 디자인', ja: 'サーフェスパターン', zh: '表面图案设计', es: 'Diseño de patrones' },
  'wallpaper-backgrounds': { en: 'Wallpaper backgrounds', ko: '배경화면', ja: '壁紙・背景', zh: '壁纸背景', es: 'Fondos de pantalla' },
  'web-desktop-wallpapers': { en: 'Web & desktop wallpapers', ko: '웹·데스크탑 배경 (16:9)', ja: 'Web・デスクトップ壁紙 (16:9)', zh: '网页·桌面壁纸 (16:9)', es: 'Fondos web y escritorio (16:9)' },
  'mobile-wallpapers': { en: 'Mobile wallpapers', ko: '모바일 배경화면 (9:16)', ja: 'モバイル壁紙 (9:16)', zh: '手机壁纸 (9:16)', es: 'Fondos móviles (9:16)' },
  'poster-art': { en: 'Poster art', ko: '포스터 아트 (2:3)', ja: 'ポスターアート (2:3)', zh: '海报艺术 (2:3)', es: 'Arte de pósteres (2:3)' },
  'tablet-square-backgrounds': { en: 'Tablet & square backgrounds', ko: '태블릿·정방형 배경 (1:1)', ja: 'タブレット・正方形背景 (1:1)', zh: '平板·方形背景 (1:1)', es: 'Fondos tablet y cuadrados (1:1)' },
  'web-design': { en: 'Web design', ko: '웹 디자인', ja: 'Webデザイン', zh: '网页设计', es: 'Diseño web' },
  'mobile-design': { en: 'Mobile design', ko: '모바일 디자인', ja: 'モバイルデザイン', zh: '移动设计', es: 'Diseño móvil' },
  'app-design': { en: 'App design', ko: '앱 디자인', ja: 'アプリデザイン', zh: '应用设计', es: 'Diseño de apps' },
  'materials-surfaces': { en: 'Materials & surfaces', ko: '재질·표면', ja: '素材・表面', zh: '材质表面', es: 'Materiales y superficies' },
  'minerals-gemstones': { en: 'Minerals & gemstones', ko: '광물·보석', ja: '鉱物・宝石', zh: '矿物宝石', es: 'Minerales y gemas' },
  'light-color-studies': { en: 'Light & color studies', ko: '빛·색 연구', ja: '光・色のスタディ', zh: '光色研究', es: 'Estudios de luz y color' },
  'fluid-liquid': { en: 'Fluids & liquids', ko: '유체·액체', ja: '流体・液体', zh: '流体液体', es: 'Fluidos y líquidos' },
  'fire-smoke': { en: 'Fire & smoke', ko: '불·연기', ja: '炎・煙', zh: '火与烟', es: 'Fuego y humo' },
  'ice-snow-frost': { en: 'Ice, snow & frost', ko: '얼음·눈·서리', ja: '氷・雪・霜', zh: '冰雪霜', es: 'Hielo, nieve y escarcha' },
  'paper-craft-art': { en: 'Paper craft art', ko: '종이 공예', ja: 'ペーパークラフト', zh: '纸艺', es: 'Arte en papel' },
  'fantasy-mythical': { en: 'Fantasy & mythical', ko: '판타지·신화', ja: 'ファンタジー・神話', zh: '奇幻神话', es: 'Fantasía y mitología' },
  'scifi-futuristic': { en: 'Sci-fi & futuristic', ko: 'SF·미래', ja: 'SF・未来', zh: '科幻未来', es: 'Ciencia ficción y futuro' },
  'microscopic-science': { en: 'Microscopic & science', ko: '미시·과학', ja: 'ミクロ・科学', zh: '微观科学', es: 'Microscópico y ciencia' },
  'industrial-machinery': { en: 'Industrial machinery', ko: '산업·기계', ja: '産業・機械', zh: '工业机械', es: 'Maquinaria industrial' },
  'agriculture-farming': { en: 'Agriculture & farming', ko: '농업·경작', ja: '農業・耕作', zh: '农业耕作', es: 'Agricultura y cultivo' }
};

/** Humanize a slug as an English fallback: 'nature-landscapes' → 'Nature landscapes'. */
export function humanizeSlug(slug) {
  const s = String(slug || '').replace(/[-_]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Localized label for a category slug, falling back to English then a humanized slug. */
export function categoryLabel(slug, lang = 'en') {
  const e = CATEGORY_LABELS[slug];
  return (e && (e[lang] || e.en)) || humanizeSlug(slug);
}
