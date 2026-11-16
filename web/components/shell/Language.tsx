// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"use client";

import type { TargetLanguage } from "@/lib/languages";
import { createContext, useContext } from "react";

export const LANGUAGES = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
  zh: "中文",
  hi: "हिन्दी",
  ta: "தமிழ்",
} as const;

export type Language = "en" | TargetLanguage;

const COPY: Record<Language, {
  nav: string[];
  crew: string;
  module: string;
  hint: string;
  previous: string;
  next: string;
  profiles: string;
}> = {
  en: { nav: ["Simulator", "Evidence", "Methods", "About"], crew: "Meet the team", module: "Crew module", hint: "Choose a crew member to open their profile.", previous: "Previous teammate", next: "Next teammate", profiles: "Team profiles" },
  fr: { nav: ["Simulateur", "Données", "Méthodes", "À propos"], crew: "Rencontrez l’équipe", module: "Module d’équipage", hint: "Choisissez un membre de l’équipe pour ouvrir son profil.", previous: "Membre précédent", next: "Membre suivant", profiles: "Profils de l’équipe" },
  es: { nav: ["Simulador", "Evidencia", "Métodos", "Acerca de"], crew: "Conoce al equipo", module: "Módulo de tripulación", hint: "Elige a un miembro de la tripulación para ver su perfil.", previous: "Miembro anterior", next: "Miembro siguiente", profiles: "Perfiles del equipo" },
  pt: { nav: ["Simulador", "Evidências", "Métodos", "Sobre"], crew: "Conheça a equipe", module: "Módulo da tripulação", hint: "Escolha um membro da tripulação para abrir seu perfil.", previous: "Membro anterior", next: "Próximo membro", profiles: "Perfis da equipe" },
  zh: { nav: ["模拟器", "研究证据", "研究方法", "关于"], crew: "认识团队", module: "乘员舱", hint: "选择一位成员，查看其个人简介。", previous: "上一位成员", next: "下一位成员", profiles: "团队成员简介" },
  hi: { nav: ["सिम्युलेटर", "साक्ष्य", "विधियाँ", "परिचय"], crew: "टीम से मिलें", module: "चालक दल का केबिन", hint: "परिचय देखने के लिए दल के किसी सदस्य को चुनें।", previous: "पिछले सदस्य", next: "अगले सदस्य", profiles: "टीम के परिचय" },
  ta: { nav: ["உருவகப்படுத்தி", "ஆதாரங்கள்", "முறைகள்", "அறிமுகம்"], crew: "குழுவைச் சந்திக்கவும்", module: "குழுவினர் அறை", hint: "சுயவிவரத்தைக் காண ஒரு குழு உறுப்பினரைத் தேர்ந்தெடுக்கவும்.", previous: "முந்தைய உறுப்பினர்", next: "அடுத்த உறுப்பினர்", profiles: "குழு உறுப்பினர் சுயவிவரங்கள்" },
};

export const LanguageContext = createContext<Language>("en");

export function useLanguage() {
  const language = useContext(LanguageContext);
  return { language, copy: COPY[language] };
}

export function navigationLabels(language: Language) {
  return COPY[language].nav;
}
