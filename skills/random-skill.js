/**
 * Random Skill
 * 
 * Get random quotes, facts, jokes, and inspiration.
 */

export const skill = {
  manifest: {
    id: "random-skill",
    name: "Random",
    description: "Get random quotes, facts, jokes, and inspiration",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/quote",
      "/fact",
      "/joke",
      "tell me a fact",
      "inspire me"
    ],
    tags: ["random", "quote", "fact", "joke", "fun"]
  },

  // Curated quotes collection
  quotes: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
    { text: "In order to be irreplaceable, one must always be different.", author: "Coco Chanel" },
    { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
    { text: "The most damaging phrase in the language is 'We've always done it this way'.", author: "Grace Hopper" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
    { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
    { text: "One of my most productive days was throwing away 1000 lines of code.", author: "Ken Thompson" },
    { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
    { text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", author: "Edsger Dijkstra" },
    { text: "It's not a bug – it's an undocumented feature.", author: "Anonymous" },
    { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
    { text: "Good code is its own best documentation.", author: "Steve McConnell" },
    { text: "Truth can only be found in one place: the code.", author: "Robert C. Martin" },
    { text: "Give a man a program, frustrate him for a day. Teach a man to program, frustrate him for a lifetime.", author: "Muhammad Waseem" },
    { text: "The computer was born to solve problems that did not exist before.", author: "Bill Gates" },
    { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
    { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
    { text: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
    { text: "The only thing we know about the future is that it will be different.", author: "Peter Drucker" },
    { text: "Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.", author: "Mark Zuckerberg" }
  ],

  // Curated tech/science facts
  facts: [
    "The first computer bug was an actual bug - a moth found in the Harvard Mark II computer in 1947.",
    "The QWERTY keyboard layout was designed to slow typists down to prevent typewriter jams.",
    "The average smartphone has more computing power than all of NASA had when it landed astronauts on the moon.",
    "The first 1GB hard drive was announced in 1980, weighed 550 pounds, and cost $40,000.",
    "Over 6,000 new computer viruses are created and released every month.",
    "Email existed before the World Wide Web - it was invented in 1971 by Ray Tomlinson.",
    "The first website ever made is still online at info.cern.ch.",
    "Google's first Twitter post was 'I'm feeling lucky' in binary code.",
    "The first computer mouse was made of wood and was invented by Doug Engelbart in 1964.",
    "The first domain name ever registered was Symbolics.com on March 15, 1985.",
    "WiFi doesn't stand for anything - it's just a catchy name created by a marketing firm.",
    "A jiffy is an actual unit of time - it's 1/100th of a second in computer engineering.",
    "The Apollo 11 guidance computer had only 2KB of memory and a 2MHz processor.",
    "More than 90% of the world's data has been created in the last two years.",
    "The first computer programmer was Ada Lovelace, who wrote algorithms in the 1840s.",
    "There are approximately 500 million tweets sent every day.",
    "Bitcoin's mysterious creator, Satoshi Nakamoto, has never been identified.",
    "The first video uploaded to YouTube was 'Me at the zoo' on April 23, 2005.",
    "The term 'robot' comes from the Czech word 'robota', meaning forced labor.",
    "Amazon was originally called Cadabra, but it was changed because it sounded too much like 'cadaver'.",
    "The average person spends over 2 hours a day on social media.",
    "The first text message was sent on December 3, 1992, and it said 'Merry Christmas'.",
    "A single Google search uses more computing power than the entire Apollo 11 mission.",
    "The first webcam was used at Cambridge University to monitor a coffee pot.",
    "About 95% of all NFTs are essentially worthless.",
    "The '@' symbol was almost removed from keyboards but was saved by email.",
    "The first computer virus was created in 1971 and was called 'Creeper'.",
    "More people have cell phones than have access to functioning toilets.",
    "The term 'debugging' originated when Grace Hopper removed an actual moth from a computer.",
    "The internet uses about 10% of the world's electricity."
  ],

  // Programming jokes
  jokes: [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
    "There are only 10 kinds of people in this world: those who understand binary and those who don't.",
    "Why do Java developers wear glasses? Because they can't C#.",
    "A programmer's wife tells him: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes home with 12 loaves of bread.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "Why did the developer go broke? Because he used up all his cache.",
    "What's a programmer's favorite hangout place? Foo Bar.",
    "Why do programmers always mix up Halloween and Christmas? Because Oct 31 == Dec 25.",
    "A guy walks into a bar and asks for 1.4 root beers. The bartender says 'I'll have to charge you extra, that's a root beer float'.",
    "Why did the functions stop calling each other? Because they had constant arguments.",
    "What do you call 8 hobbits? A hobbyte.",
    "How do trees access the internet? They log in.",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
    "What's the object-oriented way to become wealthy? Inheritance.",
    "What do you call a programmer from Finland? Nerdic.",
    "Why do backend developers have such good posture? They've got strong backbones (and spines).",
    "Why did the developer quit his job? Because he didn't get arrays.",
    "What's a computer's least favorite food? Spam.",
    "Why did the database administrator leave his wife? She had one-to-many relationships."
  ],

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/random",
      "/quote",
      "/fact",
      "/joke",
      "/inspire",
      "tell me a quote",
      "tell me a fact",
      "tell me a joke",
      "inspire me",
      "motivate me",
      "random quote",
      "random fact",
      "random joke",
      "give me a quote",
      "programming joke"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content?.toLowerCase() || "";
    
    let type = "quote"; // default
    
    if (content.includes("fact")) {
      type = "fact";
    } else if (content.includes("joke")) {
      type = "joke";
    } else if (content.includes("inspire") || content.includes("motivate")) {
      type = "quote";
    }

    let output;
    
    switch (type) {
      case "fact":
        const fact = this.facts[Math.floor(Math.random() * this.facts.length)];
        output = `## 💡 Random Fact\n\n${fact}`;
        break;
        
      case "joke":
        const joke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
        output = `## 😄 Programming Joke\n\n${joke}`;
        break;
        
      default:
        const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        output = `## 💬 Quote\n\n> *"${quote.text}"*\n>\n> — **${quote.author}**`;
    }

    return {
      success: true,
      content: output,
      data: { type },
      nextAction: "respond"
    };
  }
};

export default skill;
