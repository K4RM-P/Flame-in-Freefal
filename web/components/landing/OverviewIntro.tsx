"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const languages = {
  en: ["English", "How does fire behave in space?", "Explore NASA experiments on fire in microgravity, see what they tell us about spacecraft safety, and test a cabin scenario.", "Explore a NASA experiment", "Scroll to the findings", "Where to start", "Evidence", "Compare NASA’s Earth and orbit tests.", "Simulator", "Explore an ISS and lunar cabin scenario.", "Methods", "See the equations, sources, and validation.", "Overview language"],
  es: ["Español", "¿Cómo se comporta el fuego en el espacio?", "Sigue los experimentos reales de la NASA desde la Tierra hasta la órbita y explora qué puede decirnos un modelo de una cabina lunar.", "Explorar un experimento de la NASA", "Ir a los resultados", "Por dónde empezar", "Evidencia", "Compara las pruebas de la NASA en la Tierra y en órbita.", "Simulador", "Explora un escenario de la EEI y otro de una cabina lunar.", "Métodos", "Consulta las ecuaciones, las fuentes y la validación.", "Idioma de la introducción"],
  fr: ["Français", "Comment le feu se comporte-t-il dans l’espace ?", "Suivez les expériences de la NASA sur les incendies, de la Terre à l’orbite, puis explorez ce qu’un modèle d’habitat lunaire peut nous apprendre.", "Explorer une expérience de la NASA", "Voir les résultats", "Par où commencer", "Données", "Comparez les essais de la NASA sur Terre et en orbite.", "Simulateur", "Explorez un scénario pour l’ISS et un autre pour un habitat lunaire.", "Méthodes", "Consultez les équations, les sources et la validation.", "Langue de l’introduction"],
  pt: ["Português", "Como o fogo se comporta no espaço?", "Acompanhe os experimentos reais da NASA da Terra à órbita e explore o que um modelo de cabine lunar pode revelar.", "Explorar um experimento da NASA", "Ir para os resultados", "Por onde começar", "Evidências", "Compare os testes da NASA na Terra e em órbita.", "Simulador", "Explore um cenário da ISS e outro de uma cabine lunar.", "Métodos", "Veja as equações, as fontes e a validação.", "Idioma da introdução"],
  zh: ["简体中文", "火在太空中如何燃烧？", "了解 NASA 从地球到轨道的真实燃烧实验，再探索月球舱室模型能告诉我们什么。", "探索 NASA 实验", "查看研究发现", "从这里开始", "实验数据", "比较 NASA 在地面和轨道上的实验。", "模拟器", "探索国际空间站和月球舱室的情景。", "研究方法", "查看公式、来源和验证结果。", "导览语言"],
  hi: ["हिन्दी", "अंतरिक्ष में आग कैसे व्यवहार करती है?", "पृथ्वी से कक्षा तक नासा के वास्तविक अग्नि प्रयोग देखें और जानें कि चंद्र केबिन का मॉडल क्या बता सकता है।", "नासा का एक प्रयोग देखें", "नतीजे देखें", "कहाँ से शुरू करें", "प्रयोगों के डेटा", "पृथ्वी और कक्षा में नासा के परीक्षणों की तुलना करें।", "सिम्युलेटर", "अंतरराष्ट्रीय अंतरिक्ष स्टेशन और चंद्र केबिन के परिदृश्य देखें।", "विधियाँ", "समीकरण, स्रोत और सत्यापन देखें।", "परिचय की भाषा"],
} as const;

type Language = keyof typeof languages;

export function OverviewIntro({ image, source, run }: { image: string; source: string; run: string }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem("ea.overview-language");
    if (saved && Object.hasOwn(languages, saved)) setLanguage(saved as Language);
  }, []);
  useEffect(() => {
    const onLanguage = (event: Event) => { const next = (event as CustomEvent<string>).detail; if (Object.hasOwn(languages, next)) setLanguage(next as Language); };
    window.addEventListener("ea:language", onLanguage); return () => window.removeEventListener("ea:language", onLanguage);
  }, []);
  const [, title, intro, evidence, scroll, start, ...labels] = languages[language];
  const tools = [
    ["/evidence", labels[0], labels[1], "01"],
    [run, labels[2], labels[3], "02"],
    ["/methods", labels[4], labels[5], "03"],
  ];
  return (
    <div lang={language}>
      <section className="ea-cover" aria-labelledby="landing-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ea-cover__image" src={image} alt="NASA: an acrylic sphere burning in microgravity aboard the ISS" fetchPriority="high" />
        <div className="ea-cover__content">
          <p className="ea-cover__label" lang="en">NASA Space Apps · Flame in Freefall</p>
          <h1 id="landing-title">{title}</h1>
          <p className="ea-cover__intro">{intro}</p>
          <div className="ea-cover__actions">
            <Link href="/evidence#earth-vs-orbit" className="ea-cover__action" data-testid="cta-evidence">{evidence} <span aria-hidden="true">↗</span></Link>
            <a href="#findings" className="ea-cover__scroll">{scroll} <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <span className="ea-cover__credit" lang="en">SoFIE-GEL · NASA / JSC</span>
      </section>
      <nav className="ea-start" aria-label={start}>
        <h2>{start}</h2>
        <div className="ea-start__grid">
          {tools.map(([href, label, description, number]) => (
            <Link key={number} className="ea-start__card" href={href}>
              <span className="ea-card-arrow" aria-hidden="true">↗</span>
              <strong>{label}</strong>
              <span>{description}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
