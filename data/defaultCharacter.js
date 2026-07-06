const characterData = {
  meta: {
    profileName: "Novo personagem",
    updatedAt: ""
  },
  main: {
    name: "",
    affiliation: "",
    background: "",
    path: "",
    level: 1,
    proficiency: 2,
    hitDie: "d8",
    speed: 9,
    spellcasting: "",
    spellcastingMod: 0,
    hpCurrent: 0,
    hpMax: 0,
    hpTemp: 0,
    mpCurrent: 0,
    mpMax: 0,
    armorClass: 10,
    initiative: 0,
    drc: 0,
    divineFavorCurrent: 2,
    divineFavorMax: 5
  },
  attributes: {
    strength: { label: "Forca", value: 10, saveProficient: false },
    dexterity: { label: "Destreza", value: 10, saveProficient: false },
    constitution: { label: "Constituicao", value: 10, saveProficient: false },
    intelligence: { label: "Inteligencia", value: 10, saveProficient: false },
    wisdom: { label: "Sabedoria", value: 10, saveProficient: false },
    charisma: { label: "Carisma", value: 10, saveProficient: false }
  },
  skills: [
    { name: "Atletismo", attribute: "strength", proficient: false, expertise: false },
    { name: "Acrobacia", attribute: "dexterity", proficient: false, expertise: false },
    { name: "Furtividade", attribute: "dexterity", proficient: false, expertise: false },
    { name: "Prestidigitacao", attribute: "dexterity", proficient: false, expertise: false },
    { name: "Arcanismo", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Historia", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Investigacao", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Natureza", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Religiao", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Mitologia", attribute: "intelligence", proficient: false, expertise: false },
    { name: "Lidar com Animais", attribute: "wisdom", proficient: false, expertise: false },
    { name: "Intuicao", attribute: "wisdom", proficient: false, expertise: false },
    { name: "Medicina", attribute: "wisdom", proficient: false, expertise: false },
    { name: "Percepcao", attribute: "wisdom", proficient: false, expertise: false },
    { name: "Sobrevivencia", attribute: "wisdom", proficient: false, expertise: false },
    { name: "Atuacao", attribute: "charisma", proficient: false, expertise: false },
    { name: "Enganacao", attribute: "charisma", proficient: false, expertise: false },
    { name: "Intimidacao", attribute: "charisma", proficient: false, expertise: false },
    { name: "Persuasao", attribute: "charisma", proficient: false, expertise: false }
  ],
  narrative: {
    trait: "",
    ideal: "",
    bond: "",
    flaw: "",
    appearance: "",
    story: "",
    notes: ""
  },
  backgroundInfo: {
    name: "",
    trait: "",
    bond: ""
  },
  tables: {
    weapons: [],
    talents: [],
    affiliationAbilities: [],
    pathAbilities: [],
    equipment: [],
    relics: []
  }
};

window.characterData = characterData;
