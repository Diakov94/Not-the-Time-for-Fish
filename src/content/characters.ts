// ADR 0011: the roster of characters, the concept as data, in GAME.md's order (Characters). A character
// differs from the others of its side in looks and emotes only; a player's look is an index into its
// side's list. `id` is ASCII, the name of the character's file under src/art/characters; `name` and
// `signature` (its one signature detail) are shown to players; `palette` names the palette's slots its
// fur, its belly (a dog's muzzle) and its accent are drawn in; `emotes` names its one to four emotes, the
// `n` of an emote indexing it.
export type Character = {
  id: string;
  side: 'cat' | 'dog';
  name: string;
  palette: { fur: string; belly: string; accent: string };
  signature: string;
  emotes: string[];
};

export const CHARACTERS: Character[] = [
  {
    id: 'proffesor',
    side: 'cat',
    name: 'Проффесор',
    palette: { fur: 'tabbyGrey', belly: 'cream', accent: 'gold' },
    signature: 'чорна академічна шапочка із золотою китицею',
    emotes: ['lecture', 'cap', 'doze'],
  },
  {
    id: 'zolotyi-baton',
    side: 'cat',
    name: 'Золотий Батон',
    palette: { fur: 'loafGold', belly: 'cream', accent: 'crust' },
    signature: 'складений, як батон, з надрізами скоринки на спині',
    emotes: ['rise', 'roll', 'glisten'],
  },
  {
    id: 'straus',
    side: 'cat',
    name: 'Страус з Межигір’я',
    palette: { fur: 'plumeBlack', belly: 'cream', accent: 'legPink' },
    signature: 'довга кремова шия на тонких рожевих ногах і віяло пір’я замість хвоста',
    emotes: ['bury', 'strut', 'fan'],
  },
  {
    id: 'yaitse',
    side: 'cat',
    name: 'Яйце',
    palette: { fur: 'shellWhite', belly: 'cream', accent: 'yolk' },
    signature: 'біле й кругле, як яйце, з тріщиною довкола маківки',
    emotes: ['topple', 'wobble', 'peek'],
  },
  {
    id: 'lyonya-kosmos',
    side: 'cat',
    name: 'Льоня Космос',
    palette: { fur: 'ginger', belly: 'white', accent: 'tracksuitBlue' },
    signature: 'танцює в спортивному костюмі з лампасами й пов’язці на голові',
    emotes: ['dance', 'spin', 'bow'],
  },
  {
    id: 'kosa',
    side: 'cat',
    name: 'Коса',
    palette: { fur: 'smokeGrey', belly: 'white', accent: 'wheat' },
    signature: 'пшенична коса, укладена короною довкола голови',
    emotes: ['flick', 'curtsy', 'stare'],
  },
  {
    id: 'hav-bu',
    side: 'dog',
    name: 'ГАВ-БУ',
    palette: { fur: 'black', belly: 'tan', accent: 'ink' },
    signature: 'два високі гострі вуха й темні окуляри',
    emotes: ['glasses', 'salute', 'sniff'],
  },
  {
    id: 'nabu-hav',
    side: 'dog',
    name: 'НАБУ-ГАВ',
    palette: { fur: 'terrierWhite', belly: 'terrierWhite', accent: 'earBrown' },
    signature: 'білий тер’єр із брунатними вислими вухами й великою лупою',
    emotes: ['inspect', 'note', 'point'],
  },
  {
    id: 'dbr',
    side: 'dog',
    name: 'ДБР-р-р',
    palette: { fur: 'brindle', belly: 'fawn', accent: 'collarRed' },
    signature: 'тигровий бульдог без вух, з висунутою щелепою й нашийником у шипах',
    emotes: ['growl', 'sit', 'roll'],
  },
  {
    id: 'dsns',
    side: 'dog',
    name: 'ДСНС-ик',
    palette: { fur: 'liver', belly: 'white', accent: 'rescueOrange' },
    signature: 'маленький спанієль-сапер у помаранчевому жилеті й касці',
    emotes: ['sapper', 'helmet', 'wag'],
  },
  {
    id: 'hur',
    side: 'dog',
    name: 'ГУР-р',
    palette: { fur: 'houndGrey', belly: 'paleGrey', accent: 'hoodDark' },
    signature: 'сухорлявий сірий хорт у темному каптурі',
    emotes: ['vanish', 'scope', 'nod'],
  },
  {
    id: 'dpsu',
    side: 'dog',
    name: 'ДПСУ-шка',
    palette: { fur: 'fawn', belly: 'cream', accent: 'borderGreen' },
    signature: 'зелений кашкет і смугастий шлагбаум на спині',
    emotes: ['barrier', 'papers', 'salute'],
  },
];

// A side's characters in the roster's order: a look indexes it, and its length bounds the looks.
export const ofSide = (side: 'cat' | 'dog'): Character[] => CHARACTERS.filter((c) => c.side === side);
