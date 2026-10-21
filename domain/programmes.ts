// F1: the programmes a student can choose for their profile: the bachelor's and
// master's programmes at Aarhus University, named as on bachelor.au.dk/bacheloruddannelser
// and kandidat.au.dk/kandidatuddannelser, both revised 16 October 2026. AU's own markers
// such as "(EN)", "(tidl. ...)" and notes about admission are left out. Industrial
// master's variants (erhvervskandidat) are merged with their programme, because the
// subject is the same.
//
// A fixed list, so the same programme is always written the same way and can be
// searched and filtered later. Students choose it themselves, because the student
// email does not say what they study (F24 is a Won't have). AU publishes no API with
// its programmes, so the list is copied by hand and must be updated when AU changes
// its programmes.
//
// profile.programme stores the key, not the name, so a name can be corrected or shown
// in another language without changing what is stored. A key is written here once and
// never changed or reused: if AU renames a programme, only its name changes. If AU
// closes a programme, it stays on the list, because students may still be on it.

export type ProgrammeLevel = "bachelor" | "master" | "other";

export type Programme = {
  readonly key: string;
  readonly level: ProgrammeLevel;
  readonly name: string;
};

export const OTHER_PROGRAMME_KEY = "other";

export const PROGRAMMES: readonly Programme[] = [
  { key: "bachelor-antropologi", level: "bachelor", name: "Antropologi" },
  { key: "bachelor-arabisk-og-islamstudier", level: "bachelor", name: "Arabisk- og islamstudier" },
  { key: "bachelor-arkaeologi", level: "bachelor", name: "Arkæologi" },
  { key: "bachelor-biologi", level: "bachelor", name: "Biologi" },
  {
    key: "bachelor-bioteknologi-bachelor-civilingenioer",
    level: "bachelor",
    name: "Bioteknologi (Bachelor - Civilingeniør)",
  },
  {
    key: "bachelor-bioteknologi-diplomingenioer",
    level: "bachelor",
    name: "Bioteknologi (Diplomingeniør)",
  },
  { key: "bachelor-brasilianske-studier", level: "bachelor", name: "Brasilianske studier" },
  {
    key: "bachelor-byggeri-bachelor-civilingenioer",
    level: "bachelor",
    name: "Byggeri (Bachelor - Civilingeniør)",
  },
  { key: "bachelor-bygning-diplomingenioer", level: "bachelor", name: "Bygning (Diplomingeniør)" },
  {
    key: "bachelor-bygningsdesign-diplomingenioer",
    level: "bachelor",
    name: "Bygningsdesign (Diplomingeniør)",
  },
  {
    key: "bachelor-cognitive-science-kognitionsvidenskab",
    level: "bachelor",
    name: "Cognitive Science (Kognitionsvidenskab)",
  },
  { key: "bachelor-computer-science", level: "bachelor", name: "Computer Science" },
  {
    key: "bachelor-computerteknologi-bachelor-civilingenioer",
    level: "bachelor",
    name: "Computerteknologi (Bachelor - Civilingeniør)",
  },
  { key: "bachelor-data-science", level: "bachelor", name: "Data Science" },
  { key: "bachelor-datalogi", level: "bachelor", name: "Datalogi" },
  { key: "bachelor-datavidenskab", level: "bachelor", name: "Datavidenskab" },
  { key: "bachelor-digital-design", level: "bachelor", name: "Digital design" },
  { key: "bachelor-dramaturgi", level: "bachelor", name: "Dramaturgi" },
  { key: "bachelor-dyrevidenskab", level: "bachelor", name: "Dyrevidenskab" },
  {
    key: "bachelor-economics-and-business-administration-bsc",
    level: "bachelor",
    name: "Economics and Business Administration, BSc",
  },
  {
    key: "bachelor-economics-and-business-administration-bsc-herning",
    level: "bachelor",
    name: "Economics and Business Administration, BSc (Herning)",
  },
  {
    key: "bachelor-elektrisk-energiteknologi-diplomingenioer",
    level: "bachelor",
    name: "Elektrisk energiteknologi (Diplomingeniør)",
  },
  {
    key: "bachelor-elektrisk-energiteknologi-diplomingenioer-herning",
    level: "bachelor",
    name: "Elektrisk energiteknologi (Diplomingeniør) (Herning)",
  },
  {
    key: "bachelor-elektronik-diplomingenioer",
    level: "bachelor",
    name: "Elektronik (Diplomingeniør)",
  },
  {
    key: "bachelor-elektroteknologi-bachelor-civilingenioer",
    level: "bachelor",
    name: "Elektroteknologi (Bachelor - Civilingeniør)",
  },
  { key: "bachelor-engelsk", level: "bachelor", name: "Engelsk" },
  {
    key: "bachelor-erhvervsoekonomi-med-tilvalg",
    level: "bachelor",
    name: "Erhvervsøkonomi med tilvalg",
  },
  {
    key: "bachelor-erhvervsoekonomi-og-erhvervsret-ha-jur",
    level: "bachelor",
    name: "Erhvervsøkonomi og erhvervsret, HA(jur.)",
  },
  { key: "bachelor-erhvervsoekonomi-ha", level: "bachelor", name: "Erhvervsøkonomi, HA" },
  {
    key: "bachelor-erhvervsoekonomi-ha-herning",
    level: "bachelor",
    name: "Erhvervsøkonomi, HA (Herning)",
  },
  { key: "bachelor-filosofi", level: "bachelor", name: "Filosofi" },
  { key: "bachelor-folkesundhedsvidenskab", level: "bachelor", name: "Folkesundhedsvidenskab" },
  {
    key: "bachelor-forretningsudvikling-business-development-bde-diplomingenioer",
    level: "bachelor",
    name: "Forretningsudvikling (Business Development), BDE (Diplomingeniør)",
  },
  {
    key: "bachelor-fransk-sprog-litteratur-og-kultur",
    level: "bachelor",
    name: "Fransk sprog, litteratur og kultur",
  },
  { key: "bachelor-fysik", level: "bachelor", name: "Fysik" },
  {
    key: "bachelor-foedevareteknologi-diplomingenioer",
    level: "bachelor",
    name: "Fødevareteknologi (Diplomingeniør)",
  },
  { key: "bachelor-geoscience-geologi", level: "bachelor", name: "Geoscience (Geologi)" },
  {
    key: "bachelor-global-ledelse-og-design-af-produktionsnetvaerk-gmm-diplomingenioer",
    level: "bachelor",
    name: "Global ledelse og design af produktionsnetværk, GMM (Diplomingeniør)",
  },
  { key: "bachelor-globale-studier", level: "bachelor", name: "Globale Studier" },
  { key: "bachelor-historie", level: "bachelor", name: "Historie" },
  { key: "bachelor-idehistorie", level: "bachelor", name: "Idéhistorie" },
  { key: "bachelor-idraetsvidenskab", level: "bachelor", name: "Idrætsvidenskab" },
  {
    key: "bachelor-indien-og-sydasienstudier",
    level: "bachelor",
    name: "Indien- og sydasienstudier",
  },
  { key: "bachelor-informationsvidenskab", level: "bachelor", name: "Informationsvidenskab" },
  {
    key: "bachelor-international-virksomhedskommunikation-i-engelsk",
    level: "bachelor",
    name: "International virksomhedskommunikation i engelsk",
  },
  {
    key: "bachelor-international-virksomhedskommunikation-i-fransk",
    level: "bachelor",
    name: "International virksomhedskommunikation i fransk",
  },
  {
    key: "bachelor-international-virksomhedskommunikation-i-spansk",
    level: "bachelor",
    name: "International virksomhedskommunikation i spansk",
  },
  {
    key: "bachelor-international-virksomhedskommunikation-i-tysk",
    level: "bachelor",
    name: "International virksomhedskommunikation i tysk",
  },
  { key: "bachelor-it-product-development", level: "bachelor", name: "IT Product Development" },
  { key: "bachelor-it-produktudvikling", level: "bachelor", name: "IT-Produktudvikling" },
  { key: "bachelor-japanstudier", level: "bachelor", name: "Japanstudier" },
  { key: "bachelor-jura", level: "bachelor", name: "Jura" },
  { key: "bachelor-kemi", level: "bachelor", name: "Kemi" },
  {
    key: "bachelor-kemiteknologi-bachelor-civilingenioer",
    level: "bachelor",
    name: "Kemiteknologi (Bachelor - Civilingeniør)",
  },
  {
    key: "bachelor-kemiteknologi-diplomingenioer",
    level: "bachelor",
    name: "Kemiteknologi (Diplomingeniør)",
  },
  { key: "bachelor-kinastudier", level: "bachelor", name: "Kinastudier" },
  { key: "bachelor-klassisk-arkaeologi", level: "bachelor", name: "Klassisk arkæologi" },
  { key: "bachelor-klassisk-filologi", level: "bachelor", name: "Klassisk filologi" },
  { key: "bachelor-klinisk-tandteknik", level: "bachelor", name: "Klinisk tandteknik" },
  { key: "bachelor-kunsthistorie", level: "bachelor", name: "Kunsthistorie" },
  { key: "bachelor-lingvistik", level: "bachelor", name: "Lingvistik" },
  { key: "bachelor-litteraturhistorie", level: "bachelor", name: "Litteraturhistorie" },
  {
    key: "bachelor-maskinteknik-diplomingenioer",
    level: "bachelor",
    name: "Maskinteknik (Diplomingeniør)",
  },
  { key: "bachelor-matematik", level: "bachelor", name: "Matematik" },
  { key: "bachelor-matematik-oekonomi", level: "bachelor", name: "Matematik-økonomi" },
  { key: "bachelor-medicin-laegevidenskab", level: "bachelor", name: "Medicin (lægevidenskab)" },
  { key: "bachelor-medicinalkemi", level: "bachelor", name: "Medicinalkemi" },
  { key: "bachelor-medievidenskab", level: "bachelor", name: "Medievidenskab" },
  {
    key: "bachelor-mekanik-og-teknologi-bachelor-civilingenioer",
    level: "bachelor",
    name: "Mekanik og Teknologi (Bachelor - Civilingeniør)",
  },
  {
    key: "bachelor-molekylaerbiologi-og-molekylaermedicin",
    level: "bachelor",
    name: "Molekylærbiologi og molekylærmedicin",
  },
  { key: "bachelor-musikvidenskab", level: "bachelor", name: "Musikvidenskab" },
  { key: "bachelor-nanoscience", level: "bachelor", name: "Nanoscience" },
  {
    key: "bachelor-nordisk-sprog-og-litteratur-dansk",
    level: "bachelor",
    name: "Nordisk sprog og litteratur (Dansk)",
  },
  { key: "bachelor-odontologi-tandlaege", level: "bachelor", name: "Odontologi (tandlæge)" },
  {
    key: "bachelor-plante-og-foedevarevidenskab",
    level: "bachelor",
    name: "Plante- og fødevarevidenskab",
  },
  { key: "bachelor-politik-og-oekonomi", level: "bachelor", name: "Politik og økonomi" },
  { key: "bachelor-psykologi", level: "bachelor", name: "Psykologi" },
  { key: "bachelor-religionsvidenskab", level: "bachelor", name: "Religionsvidenskab" },
  { key: "bachelor-ruslandstudier", level: "bachelor", name: "Ruslandstudier" },
  { key: "bachelor-samfundsfag", level: "bachelor", name: "Samfundsfag" },
  {
    key: "bachelor-softwareteknologi-diplomingenioer",
    level: "bachelor",
    name: "Softwareteknologi (Diplomingeniør)",
  },
  {
    key: "bachelor-spansk-og-spanskamerikansk-sprog-litteratur-og-kultur",
    level: "bachelor",
    name: "Spansk og spanskamerikansk sprog, litteratur og kultur",
  },
  { key: "bachelor-statskundskab", level: "bachelor", name: "Statskundskab" },
  {
    key: "bachelor-sundhedsteknologi-diplomingenioer",
    level: "bachelor",
    name: "Sundhedsteknologi (Diplomingeniør)",
  },
  { key: "bachelor-tandpleje", level: "bachelor", name: "Tandpleje" },
  { key: "bachelor-teologi", level: "bachelor", name: "Teologi" },
  {
    key: "bachelor-tysk-sprog-litteratur-og-kultur",
    level: "bachelor",
    name: "Tysk sprog, litteratur og kultur",
  },
  { key: "bachelor-uddannelsesvidenskab", level: "bachelor", name: "Uddannelsesvidenskab" },
  {
    key: "bachelor-veterinaermedicin-dyrlaege",
    level: "bachelor",
    name: "Veterinærmedicin (dyrlæge)",
  },
  { key: "bachelor-aestetik-og-kultur", level: "bachelor", name: "Æstetik og kultur" },
  { key: "bachelor-oekonomi", level: "bachelor", name: "Økonomi" },
  { key: "master-agrobiologi", level: "master", name: "Agrobiologi" },
  {
    key: "master-animal-science-dyrevidenskab",
    level: "master",
    name: "Animal Science (Dyrevidenskab)",
  },
  { key: "master-antropologi", level: "master", name: "Antropologi" },
  {
    key: "master-applied-computer-science-anvendt-datalogi",
    level: "master",
    name: "Applied Computer Science (Anvendt datalogi)",
  },
  {
    key: "master-applied-data-analytics-anvendt-dataanalyse",
    level: "master",
    name: "Applied Data Analytics (Anvendt dataanalyse)",
  },
  { key: "master-arabisk-og-islamstudier", level: "master", name: "Arabisk- og islamstudier" },
  { key: "master-arkaeologi", level: "master", name: "Arkæologi" },
  {
    key: "master-bioinformatics-bioinformatik",
    level: "master",
    name: "Bioinformatics (Bioinformatik)",
  },
  { key: "master-biology-biologi", level: "master", name: "Biology (Biologi)" },
  {
    key: "master-biomedicinsk-teknologi-civilingenioer",
    level: "master",
    name: "Biomedicinsk teknologi (civilingeniør)",
  },
  { key: "master-byggeri-civilingenioer", level: "master", name: "Byggeri (civilingeniør)" },
  { key: "master-chemistry-kemi", level: "master", name: "Chemistry (Kemi)" },
  {
    key: "master-children-s-literature-media-and-cultural-entrepreneurship",
    level: "master",
    name: "Children's Literature, Media and Cultural Entrepreneurship",
  },
  {
    key: "master-cognitive-science-kognitionsvidenskab",
    level: "master",
    name: "Cognitive Science (Kognitionsvidenskab)",
  },
  { key: "master-computer-science-datalogi", level: "master", name: "Computer Science (Datalogi)" },
  {
    key: "master-computerteknologi-civilingenioer",
    level: "master",
    name: "Computerteknologi (civilingeniør)",
  },
  {
    key: "master-data-science-datavidenskab",
    level: "master",
    name: "Data Science (Datavidenskab)",
  },
  { key: "master-didaktik-dansk", level: "master", name: "Didaktik (Dansk)" },
  { key: "master-didaktik-matematik", level: "master", name: "Didaktik (Matematik)" },
  { key: "master-didaktik-materiel-kultur", level: "master", name: "Didaktik (Materiel kultur)" },
  { key: "master-didaktik-musikpaedagogik", level: "master", name: "Didaktik (Musikpædagogik)" },
  { key: "master-didaktik-aestetik", level: "master", name: "Didaktik (Æstetik)" },
  { key: "master-digital-design", level: "master", name: "Digital design" },
  { key: "master-dramaturgi", level: "master", name: "Dramaturgi" },
  {
    key: "master-elektroteknologi-civilingenioer",
    level: "master",
    name: "Elektroteknologi (civilingeniør)",
  },
  { key: "master-engelsk", level: "master", name: "Engelsk" },
  {
    key: "master-erhvervssprog-og-international-erhvervskommunikation-cand-ling-merc-engelsk",
    level: "master",
    name: "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - engelsk",
  },
  {
    key: "master-erhvervssprog-og-international-erhvervskommunikation-cand-ling-merc-fransk",
    level: "master",
    name: "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - fransk",
  },
  {
    key: "master-erhvervssprog-og-international-erhvervskommunikation-cand-ling-merc-spansk",
    level: "master",
    name: "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - spansk",
  },
  {
    key: "master-erhvervssprog-og-international-erhvervskommunikation-cand-ling-merc-tysk",
    level: "master",
    name: "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - tysk",
  },
  {
    key: "master-erhvervsoekonomi-cand-merc",
    level: "master",
    name: "Erhvervsøkonomi, cand.merc.",
  },
  { key: "master-erhvervsoekonomi-cand-soc", level: "master", name: "Erhvervsøkonomi, cand.soc." },
  {
    key: "master-erhvervsoekonomi-erhvervsret-cand-merc-jur",
    level: "master",
    name: "Erhvervsøkonomi-erhvervsret, cand.merc.(jur.)",
  },
  { key: "master-europastudier", level: "master", name: "Europastudier" },
  { key: "master-filosofi", level: "master", name: "Filosofi" },
  { key: "master-folkesundhedsvidenskab", level: "master", name: "Folkesundhedsvidenskab" },
  {
    key: "master-fransk-sprog-litteratur-og-kultur",
    level: "master",
    name: "Fransk sprog, litteratur og kultur",
  },
  { key: "master-generel-paedagogik", level: "master", name: "Generel pædagogik" },
  { key: "master-geoscience-geovidenskab", level: "master", name: "Geoscience (Geovidenskab)" },
  { key: "master-globale-omraadestudier", level: "master", name: "Globale områdestudier" },
  { key: "master-historie", level: "master", name: "Historie" },
  { key: "master-human-security", level: "master", name: "Human Security" },
  { key: "master-idehistorie", level: "master", name: "Idéhistorie" },
  { key: "master-idraetsvidenskab", level: "master", name: "Idrætsvidenskab" },
  {
    key: "master-informationsteknologi-it-kommunikation-og-organisation-itko-herning",
    level: "master",
    name: "Informationsteknologi - it, kommunikation og organisation (ITKO) (Herning)",
  },
  { key: "master-informationsvidenskab", level: "master", name: "Informationsvidenskab" },
  { key: "master-interkulturelle-studier", level: "master", name: "Interkulturelle studier" },
  {
    key: "master-international-foedevarekvalitet-og-sundhed",
    level: "master",
    name: "International fødevarekvalitet og sundhed",
  },
  { key: "master-internationale-studier", level: "master", name: "Internationale studier" },
  {
    key: "master-it-product-development-it-produktudvikling",
    level: "master",
    name: "IT Product Development (It-produktudvikling)",
  },
  { key: "master-it-didaktisk-design", level: "master", name: "It-didaktisk design" },
  {
    key: "master-journalism-media-and-globalisation-erasmus-mundus",
    level: "master",
    name: "Journalism, Media and Globalisation (Erasmus Mundus)",
  },
  { key: "master-journalistik-cand-public", level: "master", name: "Journalistik (cand.public)" },
  { key: "master-jura", level: "master", name: "Jura" },
  {
    key: "master-kemi-og-bioteknologi-civilingenioer",
    level: "master",
    name: "Kemi og bioteknologi (civilingeniør)",
  },
  { key: "master-klassisk-filologi", level: "master", name: "Klassisk filologi" },
  { key: "master-kunsthistorie", level: "master", name: "Kunsthistorie" },
  { key: "master-lingvistik", level: "master", name: "Lingvistik" },
  { key: "master-litteraturhistorie", level: "master", name: "Litteraturhistorie" },
  {
    key: "master-mathematics-economics-matematik-oekonomi",
    level: "master",
    name: "Mathematics-Economics (Matematik-økonomi)",
  },
  { key: "master-mathematics-matematik", level: "master", name: "Mathematics (Matematik)" },
  { key: "master-medicin-laegevidenskab", level: "master", name: "Medicin (lægevidenskab)" },
  {
    key: "master-medicinal-chemistry-medicinalkemi",
    level: "master",
    name: "Medicinal Chemistry (Medicinalkemi)",
  },
  { key: "master-medievidenskab", level: "master", name: "Medievidenskab" },
  {
    key: "master-mekanik-og-teknologi-civilingenioer",
    level: "master",
    name: "Mekanik og Teknologi (civilingeniør)",
  },
  { key: "master-miljoe-og-konfliktanalyse", level: "master", name: "Miljø- og konfliktanalyse" },
  {
    key: "master-molecular-biology-molekylaerbiologi",
    level: "master",
    name: "Molecular Biology (Molekylærbiologi)",
  },
  {
    key: "master-molekylaer-ernaering-og-foedevareteknologi",
    level: "master",
    name: "Molekylær ernæring og fødevareteknologi",
  },
  { key: "master-molekylaer-medicin", level: "master", name: "Molekylær medicin" },
  { key: "master-musikvidenskab", level: "master", name: "Musikvidenskab" },
  { key: "master-nanoscience", level: "master", name: "Nanoscience" },
  {
    key: "master-nature-and-landscape-management-natur-og-landskabsforvaltning",
    level: "master",
    name: "Nature and Landscape Management (Natur- og landskabsforvaltning)",
  },
  {
    key: "master-neuroscience-and-neuroimaging",
    level: "master",
    name: "Neuroscience and Neuroimaging",
  },
  {
    key: "master-nordisk-sprog-og-litteratur-dansk",
    level: "master",
    name: "Nordisk sprog og litteratur (Dansk)",
  },
  { key: "master-odontologi", level: "master", name: "Odontologi" },
  { key: "master-oplevelsesoekonomi", level: "master", name: "Oplevelsesøkonomi" },
  { key: "master-optometri-og-synsvidenskab", level: "master", name: "Optometri og synsvidenskab" },
  { key: "master-physics-fysik", level: "master", name: "Physics (Fysik)" },
  {
    key: "master-plant-and-soil-science-plante-og-jordvidenskab",
    level: "master",
    name: "Plant and Soil Science (Plante- og jordvidenskab)",
  },
  { key: "master-psykologi", level: "master", name: "Psykologi" },
  { key: "master-paedagogisk-antropologi", level: "master", name: "Pædagogisk antropologi" },
  { key: "master-paedagogisk-filosofi", level: "master", name: "Pædagogisk filosofi" },
  { key: "master-paedagogisk-psykologi", level: "master", name: "Pædagogisk psykologi" },
  { key: "master-paedagogisk-sociologi", level: "master", name: "Pædagogisk sociologi" },
  { key: "master-quantitative-economics", level: "master", name: "Quantitative Economics" },
  {
    key: "master-quantum-technologies-and-engineering-erasmus-mundus",
    level: "master",
    name: "Quantum Technologies and Engineering (Erasmus Mundus)",
  },
  { key: "master-religionsvidenskab", level: "master", name: "Religionsvidenskab" },
  { key: "master-retorik", level: "master", name: "Retorik" },
  { key: "master-revision-cand-merc-aud", level: "master", name: "Revision, cand.merc.aud." },
  { key: "master-samfundsfag", level: "master", name: "Samfundsfag" },
  {
    key: "master-science-communication-videnskabskommunikation",
    level: "master",
    name: "Science Communication (Videnskabskommunikation)",
  },
  { key: "master-soils-and-global-change", level: "master", name: "Soils and Global Change" },
  {
    key: "master-spansk-og-spanskamerikansk-sprog-litteratur-og-kultur",
    level: "master",
    name: "Spansk og spanskamerikansk sprog, litteratur og kultur",
  },
  { key: "master-statistics-statistik", level: "master", name: "Statistics (Statistik)" },
  { key: "master-statskundskab", level: "master", name: "Statskundskab" },
  {
    key: "master-sundhedsfaglig-kandidatuddannelse",
    level: "master",
    name: "Sundhedsfaglig kandidatuddannelse",
  },
  {
    key: "master-sustainable-heritage-management",
    level: "master",
    name: "Sustainable Heritage Management",
  },
  { key: "master-sygepleje", level: "master", name: "Sygepleje" },
  {
    key: "master-teknologibaseret-forretningsudvikling-civilingenioer-herning",
    level: "master",
    name: "Teknologibaseret forretningsudvikling (civilingeniør) (Herning)",
  },
  { key: "master-teologi", level: "master", name: "Teologi" },
  {
    key: "master-tysk-sprog-litteratur-og-kultur",
    level: "master",
    name: "Tysk sprog, litteratur og kultur",
  },
  {
    key: "master-uddannelsesantropologi-og-globalisering",
    level: "master",
    name: "Uddannelsesantropologi og globalisering",
  },
  { key: "master-uddannelsesvidenskab", level: "master", name: "Uddannelsesvidenskab" },
  { key: "master-aestetik-og-kultur", level: "master", name: "Æstetik og kultur" },
  { key: "master-oekonomi", level: "master", name: "Økonomi" },
  // The way out for a student whose programme is not on the list, for example an
  // exchange or PhD student, or a programme added after the list was copied. Without
  // it, the forced profile setup would lock them out of the app.
  { key: OTHER_PROGRAMME_KEY, level: "other", name: "Another programme at AU" },
];

const programmesByKey = new Map(PROGRAMMES.map((programme) => [programme.key, programme]));

export function isProgramme(key: unknown): key is string {
  return typeof key === "string" && programmesByKey.has(key);
}

export function findProgramme(key: string | null): Programme | null {
  return key === null ? null : (programmesByKey.get(key) ?? null);
}

// Many programmes exist at both levels with the same name, so the label shown to the
// student includes the level, for example "Filosofi (bachelor)" and
// "Filosofi (master's)".
const LEVEL_SUFFIX: Record<ProgrammeLevel, string> = {
  bachelor: " (bachelor)",
  master: " (master's)",
  other: "",
};

export function programmeLabel(programme: Programme): string {
  return programme.name + LEVEL_SUFFIX[programme.level];
}

// F1: whether a programme is shown while the student searches. The search ignores case
// and matches anywhere in the label. The way out is always shown, so a student whose
// programme is not on the list always sees it.
export function matchesProgrammeSearch(programme: Programme, query: string): boolean {
  if (programme.key === OTHER_PROGRAMME_KEY) return true;
  const search = query.trim().toLocaleLowerCase("da-DK");
  return programmeLabel(programme).toLocaleLowerCase("da-DK").includes(search);
}
