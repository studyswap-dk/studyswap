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

export const BACHELOR_PROGRAMMES = [
  "Antropologi",
  "Arabisk- og islamstudier",
  "Arkæologi",
  "Biologi",
  "Bioteknologi (Bachelor - Civilingeniør)",
  "Bioteknologi (Diplomingeniør)",
  "Brasilianske studier",
  "Byggeri (Bachelor - Civilingeniør)",
  "Bygning (Diplomingeniør)",
  "Bygningsdesign (Diplomingeniør)",
  "Cognitive Science (Kognitionsvidenskab)",
  "Computer Science",
  "Computerteknologi (Bachelor - Civilingeniør)",
  "Data Science",
  "Datalogi",
  "Datavidenskab",
  "Digital design",
  "Dramaturgi",
  "Dyrevidenskab",
  "Economics and Business Administration, BSc",
  "Economics and Business Administration, BSc (Herning)",
  "Elektrisk energiteknologi (Diplomingeniør)",
  "Elektrisk energiteknologi (Diplomingeniør) (Herning)",
  "Elektronik (Diplomingeniør)",
  "Elektroteknologi (Bachelor - Civilingeniør)",
  "Engelsk",
  "Erhvervsøkonomi med tilvalg",
  "Erhvervsøkonomi og erhvervsret, HA(jur.)",
  "Erhvervsøkonomi, HA",
  "Erhvervsøkonomi, HA (Herning)",
  "Filosofi",
  "Folkesundhedsvidenskab",
  "Forretningsudvikling (Business Development), BDE (Diplomingeniør)",
  "Fransk sprog, litteratur og kultur",
  "Fysik",
  "Fødevareteknologi (Diplomingeniør)",
  "Geoscience (Geologi)",
  "Global ledelse og design af produktionsnetværk, GMM (Diplomingeniør)",
  "Globale Studier",
  "Historie",
  "Idéhistorie",
  "Idrætsvidenskab",
  "Indien- og sydasienstudier",
  "Informationsvidenskab",
  "International virksomhedskommunikation i engelsk",
  "International virksomhedskommunikation i fransk",
  "International virksomhedskommunikation i spansk",
  "International virksomhedskommunikation i tysk",
  "IT Product Development",
  "IT-Produktudvikling",
  "Japanstudier",
  "Jura",
  "Kemi",
  "Kemiteknologi (Bachelor - Civilingeniør)",
  "Kemiteknologi (Diplomingeniør)",
  "Kinastudier",
  "Klassisk arkæologi",
  "Klassisk filologi",
  "Klinisk tandteknik",
  "Kunsthistorie",
  "Lingvistik",
  "Litteraturhistorie",
  "Maskinteknik (Diplomingeniør)",
  "Matematik",
  "Matematik-økonomi",
  "Medicin (lægevidenskab)",
  "Medicinalkemi",
  "Medievidenskab",
  "Mekanik og Teknologi (Bachelor - Civilingeniør)",
  "Molekylærbiologi og molekylærmedicin",
  "Musikvidenskab",
  "Nanoscience",
  "Nordisk sprog og litteratur (Dansk)",
  "Odontologi (tandlæge)",
  "Plante- og fødevarevidenskab",
  "Politik og økonomi",
  "Psykologi",
  "Religionsvidenskab",
  "Ruslandstudier",
  "Samfundsfag",
  "Softwareteknologi (Diplomingeniør)",
  "Spansk og spanskamerikansk sprog, litteratur og kultur",
  "Statskundskab",
  "Sundhedsteknologi (Diplomingeniør)",
  "Tandpleje",
  "Teologi",
  "Tysk sprog, litteratur og kultur",
  "Uddannelsesvidenskab",
  "Veterinærmedicin (dyrlæge)",
  "Æstetik og kultur",
  "Økonomi",
] as const;

export const MASTER_PROGRAMMES = [
  "Agrobiologi",
  "Animal Science (Dyrevidenskab)",
  "Antropologi",
  "Applied Computer Science (Anvendt datalogi)",
  "Applied Data Analytics (Anvendt dataanalyse)",
  "Arabisk- og islamstudier",
  "Arkæologi",
  "Bioinformatics (Bioinformatik)",
  "Biology (Biologi)",
  "Biomedicinsk teknologi (civilingeniør)",
  "Byggeri (civilingeniør)",
  "Chemistry (Kemi)",
  "Children's Literature, Media and Cultural Entrepreneurship",
  "Cognitive Science (Kognitionsvidenskab)",
  "Computer Science (Datalogi)",
  "Computerteknologi (civilingeniør)",
  "Data Science (Datavidenskab)",
  "Didaktik (Dansk)",
  "Didaktik (Matematik)",
  "Didaktik (Materiel kultur)",
  "Didaktik (Musikpædagogik)",
  "Didaktik (Æstetik)",
  "Digital design",
  "Dramaturgi",
  "Elektroteknologi (civilingeniør)",
  "Engelsk",
  "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - engelsk",
  "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - fransk",
  "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - spansk",
  "Erhvervssprog og international erhvervskommunikation, cand.ling.merc. - tysk",
  "Erhvervsøkonomi, cand.merc.",
  "Erhvervsøkonomi, cand.soc.",
  "Erhvervsøkonomi-erhvervsret, cand.merc.(jur.)",
  "Europastudier",
  "Filosofi",
  "Folkesundhedsvidenskab",
  "Fransk sprog, litteratur og kultur",
  "Generel pædagogik",
  "Geoscience (Geovidenskab)",
  "Globale områdestudier",
  "Historie",
  "Human Security",
  "Idéhistorie",
  "Idrætsvidenskab",
  "Informationsteknologi - it, kommunikation og organisation (ITKO) (Herning)",
  "Informationsvidenskab",
  "Interkulturelle studier",
  "International fødevarekvalitet og sundhed",
  "Internationale studier",
  "IT Product Development (It-produktudvikling)",
  "It-didaktisk design",
  "Journalism, Media and Globalisation (Erasmus Mundus)",
  "Journalistik (cand.public)",
  "Jura",
  "Kemi og bioteknologi (civilingeniør)",
  "Klassisk filologi",
  "Kunsthistorie",
  "Lingvistik",
  "Litteraturhistorie",
  "Mathematics-Economics (Matematik-økonomi)",
  "Mathematics (Matematik)",
  "Medicin (lægevidenskab)",
  "Medicinal Chemistry (Medicinalkemi)",
  "Medievidenskab",
  "Mekanik og Teknologi (civilingeniør)",
  "Miljø- og konfliktanalyse",
  "Molecular Biology (Molekylærbiologi)",
  "Molekylær ernæring og fødevareteknologi",
  "Molekylær medicin",
  "Musikvidenskab",
  "Nanoscience",
  "Nature and Landscape Management (Natur- og landskabsforvaltning)",
  "Neuroscience and Neuroimaging",
  "Nordisk sprog og litteratur (Dansk)",
  "Odontologi",
  "Oplevelsesøkonomi",
  "Optometri og synsvidenskab",
  "Physics (Fysik)",
  "Plant and Soil Science (Plante- og jordvidenskab)",
  "Psykologi",
  "Pædagogisk antropologi",
  "Pædagogisk filosofi",
  "Pædagogisk psykologi",
  "Pædagogisk sociologi",
  "Quantitative Economics",
  "Quantum Technologies and Engineering (Erasmus Mundus)",
  "Religionsvidenskab",
  "Retorik",
  "Revision, cand.merc.aud.",
  "Samfundsfag",
  "Science Communication (Videnskabskommunikation)",
  "Soils and Global Change",
  "Spansk og spanskamerikansk sprog, litteratur og kultur",
  "Statistics (Statistik)",
  "Statskundskab",
  "Sundhedsfaglig kandidatuddannelse",
  "Sustainable Heritage Management",
  "Sygepleje",
  "Teknologibaseret forretningsudvikling (civilingeniør) (Herning)",
  "Teologi",
  "Tysk sprog, litteratur og kultur",
  "Uddannelsesantropologi og globalisering",
  "Uddannelsesvidenskab",
  "Æstetik og kultur",
  "Økonomi",
] as const;

// Many programmes exist at both levels with the same name, so the level is part of
// the stored text, for example "Filosofi (bachelor)" and "Filosofi (master's)".
export const BACHELOR_SUFFIX = " (bachelor)";
export const MASTER_SUFFIX = " (master's)";

// The way out for a student whose programme is not on the list, for example an
// exchange or PhD student, or a programme added after the list was copied. Without it,
// the forced profile setup would lock them out of the app.
export const OTHER_PROGRAMME = "Another programme at AU";

// The programmes in the three groups the form shows. The list that is validated
// against is built from the same groups, so the two cannot drift apart.
export const PROGRAMME_GROUPS: readonly { label: string; items: readonly string[] }[] = [
  {
    label: "Bachelor's programmes",
    items: BACHELOR_PROGRAMMES.map((name) => name + BACHELOR_SUFFIX),
  },
  {
    label: "Master's programmes",
    items: MASTER_PROGRAMMES.map((name) => name + MASTER_SUFFIX),
  },
  { label: "Not on the list", items: [OTHER_PROGRAMME] },
];

export const PROGRAMMES: readonly string[] = PROGRAMME_GROUPS.flatMap((group) => group.items);

const programmeSet = new Set(PROGRAMMES);

export function isProgramme(value: unknown): value is string {
  return typeof value === "string" && programmeSet.has(value);
}

// F1: whether a programme is shown while the student searches. The search ignores case
// and matches anywhere in the name. OTHER_PROGRAMME is always shown, so a student whose
// programme is not on the list always sees the way out.
export function matchesProgrammeSearch(programme: string, query: string): boolean {
  if (programme === OTHER_PROGRAMME) return true;
  const search = query.trim().toLocaleLowerCase("da-DK");
  return programme.toLocaleLowerCase("da-DK").includes(search);
}
