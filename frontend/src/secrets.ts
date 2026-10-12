// Hidden Yale fun facts. Each one is a glowing key somewhere on the site; clicking reveals it.
// Facts are kept to well-documented history (legends are labelled as legends).

export interface YaleSecret {
  id: string;
  title: string;
  fact: string;
  hint: string; // where it is hidden, shown in the Grimoire until found
}

export const SECRETS: YaleSecret[] = [
  { id: "handsome-dan", title: "The First Mascot", fact: "Handsome Dan I, a bulldog bought in 1889, is often called the first live mascot in American college sports.", hint: "Beside Handsome Dan's portrait on the homepage" },
  { id: "lux", title: "Light and Truth", fact: "Yale's motto, Lux et Veritas, means “Light and Truth.” The Hebrew on the shield, Urim and Thummim, is often translated the same way.", hint: "In the motto above the homepage title" },
  { id: "founded", title: "Before It Was Yale", fact: "Yale began in 1701 as the Collegiate School in Saybrook, moved to New Haven in 1716, and was renamed for benefactor Elihu Yale in 1718.", hint: "Near the shop's address on the homepage" },
  { id: "boola", title: "Boola Boola", fact: "Yale's fight song “Boola Boola” was written in 1900 by Allan M. Hirsh, Class of 1901.", hint: "Within the About Us letter" },
  { id: "game", title: "The Game", fact: "Yale and Harvard first met on the football field in 1875. Ever since, it has simply been called The Game.", hint: "Within the About Us letter" },
  { id: "beinecke", title: "Walls of Light", fact: "The Beinecke Library's walls are thin panels of marble that glow with soft light while protecting its rare books, among them a Gutenberg Bible.", hint: "Beside the title of the Collection" },
  { id: "sterling", title: "A Cathedral of Books", fact: "Sterling Memorial Library was built to resemble a Gothic cathedral, complete with a nave and an altar-like circulation desk.", hint: "Within the Head's welcome letter" },
  { id: "colleges", title: "The Fourteen", fact: "Yale's residential colleges opened in 1933. Today there are fourteen, each with its own courtyard, dining hall, and traditions.", hint: "Beside \"The Fourteen\" on the homepage" },
  { id: "harkness", title: "The Bells of Harkness", fact: "Harkness Tower rises over Branford College. Its carillon of 54 bells is played by students in the Yale Guild of Carillonneurs.", hint: "Within the Head's welcome letter" },
  { id: "whiffs", title: "The Whiffenpoofs", fact: "Founded in 1909, the Whiffenpoofs are the oldest collegiate a cappella group in the United States.", hint: "At the door marked Log In" },
  { id: "bowl", title: "The Original Bowl", fact: "The Yale Bowl opened in 1914 as the country's first bowl-shaped stadium, and it inspired the name of college football's “bowl” games.", hint: "On every product's page" },
  { id: "frisbee", title: "A Flying Legend", fact: "Legend has it the Frisbee began with Yale students tossing empty pie tins from the Frisbie Pie Company of Bridgeport.", hint: "Inside Handsome Dan's chat" },
  { id: "burger", title: "The First Burger?", fact: "Louis' Lunch, a few blocks from campus, claims to have served America's first hamburger sandwich around 1900.", hint: "At the foot of every page" },
  { id: "societies", title: "The Tombs", fact: "Yale's senior secret societies date to 1832, when Skull and Bones was founded. Their windowless halls are known as “tombs.”", hint: "Within the About Us letter" },
  { id: "new-colleges", title: "Newest Courtyards", fact: "Pauli Murray and Benjamin Franklin Colleges opened in 2017, the first new residential colleges in more than half a century.", hint: "At the door marked Create Account" },
  { id: "apizza", title: "Apizza", fact: "New Haven's “apizza” tradition dates to 1925, when Frank Pepe opened his pizzeria on Wooster Street.", hint: "At the foot of every page" },
];

export const SECRET_BY_ID = Object.fromEntries(SECRETS.map((s) => [s.id, s]));
