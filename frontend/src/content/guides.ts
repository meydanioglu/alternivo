/**
 * How-to guides from the 2026 keyword plan (/guides/{slug}). Written to be tool-neutral: steps describe the
 * process, and product mentions link to their catalog pages or to the matching /best list.
 */
export interface GuideSection {
  heading: string;
  body: string[];
  steps?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: GuideSection[];
  /** /best slugs or /software slugs shown as next steps. */
  bestLinks: string[];
  tools?: string[];
  updated: string;
}

const UPDATED = "2026-10-25";

export const GUIDES: Guide[] = [
  {
    slug: "build-a-browser-game-ai",
    title: "How to build a browser game using AI",
    description: "A practical path from idea to a playable browser game with AI: choose a tool, prompt the core loop, add art and sound, test and publish.",
    intro: "Browser games are the quickest way to get a game in front of players: no install, just a link. AI can now write most of the code and generate the art, so the hard part is deciding what makes your game fun.",
    sections: [
      { heading: "1. Pick the right kind of tool", body: [
        "Prompt-to-game platforms build and host the game for you; you describe it and iterate in chat. HTML5 engines with AI coding help give you more control and let you host the game anywhere.",
        "If you have never coded, start with a prompt-to-game platform. If you want to own the code, use an HTML5 engine such as Phaser or GDevelop together with an AI coding assistant.",
      ] },
      { heading: "2. Describe the core loop first", body: ["Ask for the smallest playable version: the player, one goal, one obstacle and a win or lose condition. Add features only after that version is fun."],
        steps: ["Write one sentence for the goal and one for each control.", "Ask the tool to build only that loop.", "Play it, then ask for one change at a time."] },
      { heading: "3. Add art and sound", body: ["Generate sprites, backgrounds and sound effects with dedicated asset tools, then keep one consistent style. Check that each tool's licence allows how you plan to use the assets."] },
      { heading: "4. Test on real devices", body: ["Open the game on a phone and a laptop. Check touch controls, screen sizes and loading time; browser players leave quickly if a game is slow to start."] },
      { heading: "5. Publish and share", body: ["Hosted platforms give you a share link. For exported HTML5 builds, upload to your own site or a game portal and add a short description and screenshots."] },
    ],
    bestLinks: ["ai-game-creators-for-browser-games", "ai-tools-for-html5-games", "prompt-to-game-ai-tools", "ai-game-asset-generators"],
    tools: ["rosebud", "astrocade", "gdevelop", "phaser"],
    updated: UPDATED,
  },
  {
    slug: "build-a-mobile-app-ai-without-coding",
    title: "How to build a mobile app with AI without coding",
    description: "Steps to plan, generate, test and publish an iOS or Android app using no-code and AI app builders.",
    intro: "AI mobile app builders can generate screens, navigation and data from a description. You still need a clear plan and careful testing before you publish to the app stores.",
    sections: [
      { heading: "1. Write a one-page spec", body: ["List the screens, what each one shows, who the users are and which data you store. A short spec gives the AI far better results than a vague prompt."] },
      { heading: "2. Choose a builder", body: ["Some tools generate native apps from prompts; others use visual editors with AI assistance. Check whether the builder publishes to the App Store and Google Play, and whether you can export the code later."] },
      { heading: "3. Generate and refine", body: ["Generate the first version, then change one screen at a time. Connect real data early so you notice problems with lists, forms and sign-in."],
        steps: ["Generate the app from your spec.", "Add authentication if users need accounts.", "Connect the database and test with real records."] },
      { heading: "4. Test on devices", body: ["Install test builds on both iOS and Android devices if you target both. Check offline behaviour, permissions and small screens."] },
      { heading: "5. Publish", body: ["You need developer accounts for the App Store and Google Play, store screenshots, a privacy policy and an app description. Review each store's guidelines before submitting."] },
    ],
    bestLinks: ["ai-mobile-app-generators", "no-code-ai-app-builders", "ai-tools-for-mobile-app-development"],
    tools: ["rork", "a0-dev", "flutterflow", "thunkable"],
    updated: UPDATED,
  },
  {
    slug: "build-a-saas-ai",
    title: "How to build a SaaS with AI",
    description: "Use AI app builders and coding agents to go from idea to a paid SaaS: MVP scope, stack, auth, payments, launch.",
    intro: "AI makes the first version of a SaaS product dramatically cheaper. The work that remains is choosing what to build, keeping the codebase maintainable and getting customers.",
    sections: [
      { heading: "1. Scope a narrow MVP", body: ["Pick one painful job for one type of customer. Your MVP needs sign-in, the core workflow, and a way to pay — nothing else."] },
      { heading: "2. Generate the first version", body: ["Use an AI app builder to scaffold the app with authentication and a database. Prefer tools that let you export code or sync to GitHub so you are not locked in."] },
      { heading: "3. Move to a codebase you control", body: ["Once the idea is validated, continue in a repository with an AI coding agent. Add tests for the core workflow before adding features."],
        steps: ["Export or sync the code to GitHub.", "Set up a staging environment.", "Add automated tests for sign-up and the core flow."] },
      { heading: "4. Add payments and legal pages", body: ["Integrate a payment provider, and publish terms and a privacy policy. Make pricing simple to start."] },
      { heading: "5. Launch and listen", body: ["List the product in directories, write about the problem you solve and talk to every early user. Their feedback decides what you build next."] },
    ],
    bestLinks: ["ai-app-builders-for-saas", "ai-app-builders-with-code-export", "agentic-coding-tools"],
    updated: UPDATED,
  },
  {
    slug: "choose-an-ai-app-builder",
    title: "How to choose an AI app builder",
    description: "A checklist for comparing AI app builders: what you are building, backend and auth, code ownership, pricing and limits.",
    intro: "AI app builders look similar in demos, but they differ in what they generate, where it runs and who owns the code. Use this checklist before committing.",
    sections: [
      { heading: "What are you building?", body: ["Prototypes, internal tools, SaaS products and mobile apps each favour different builders. Write down the platform (web, iOS, Android) and the users before comparing."] },
      { heading: "Backend, database and sign-in", body: ["Check whether the builder creates a backend, a database and authentication, or only the user interface."] },
      { heading: "Code ownership and export", body: ["Can you export the code or sync to GitHub? Can you self-host? If not, factor in the cost of staying on the platform long term."] },
      { heading: "Pricing and limits", body: ["Most builders charge by messages, credits or usage. Estimate how many changes you make per day and compare real monthly costs, not just entry prices."] },
      { heading: "Try two with the same prompt", body: ["Give two shortlisted builders the same spec and compare the results for an hour each. The better fit is usually obvious."] },
    ],
    bestLinks: ["ai-app-builders", "ai-app-builders-with-code-export", "ai-app-builders-for-beginners"],
    updated: UPDATED,
  },
  {
    slug: "choose-an-ai-game-engine",
    title: "How to choose an AI game engine",
    description: "Compare game engines and AI game makers by game type, platforms, coding needs, export and licensing.",
    intro: "Choosing an engine is a long-term decision. AI helps with code and assets in almost any engine, so start from your game and your skills, not the hype.",
    sections: [
      { heading: "2D or 3D?", body: ["2D-focused engines are simpler and faster to learn. Full 3D engines are more powerful but have a steeper learning curve."] },
      { heading: "Target platforms", body: ["List where players will play: browser, mobile, PC or console. Not every engine exports to every platform."] },
      { heading: "How much do you want to code?", body: ["Prompt-to-game tools need no code. Visual engines use events. Code-first engines give the most control, and AI coding assistants make them far more approachable."] },
      { heading: "Export and ownership", body: ["If you want to sell the game, make sure you can export builds and own the project files."] },
      { heading: "Licence and fees", body: ["Read the engine's licence and any revenue-share or seat fees. Open-source engines avoid royalties entirely."] },
    ],
    bestLinks: ["ai-game-makers", "ai-game-builder-with-export", "ai-game-maker-for-commercial-use"],
    tools: ["godot-engine", "unity", "gdevelop", "gamemaker"],
    updated: UPDATED,
  },
  {
    slug: "compare-ai-app-builder-costs",
    title: "How to compare AI app builder costs",
    description: "Understand credit, message and usage pricing in AI app builders and estimate what an app will really cost per month.",
    intro: "AI app builders price in credits, messages or tokens, which makes headline prices hard to compare. Estimate your real usage instead.",
    sections: [
      { heading: "Know the billing unit", body: ["Some tools count messages, some count credits per action, and some pass through model usage. Find out what one change costs."] },
      { heading: "Estimate your volume", body: ["Count how many prompts you send in a typical build session and multiply by working days. Add a buffer for fixing mistakes."] },
      { heading: "Add hosting and extras", body: ["Hosting, databases, custom domains and team seats are often billed separately."] },
      { heading: "Consider exit costs", body: ["If you cannot export code, switching later means rebuilding. Builders with code export reduce that risk."] },
      { heading: "Use free tiers to measure", body: ["Build the same small feature on each free tier and note how many credits it used. That gives you a fair comparison."] },
    ],
    bestLinks: ["ai-app-builders", "free-vibe-coding-tools", "ai-coding-platforms-with-hosting"],
    updated: UPDATED,
  },
  {
    slug: "create-a-2d-game-ai",
    title: "How to create a 2D game with AI",
    description: "Plan, build and polish a 2D game using AI for code, sprites and sound.",
    intro: "2D games are the best place to start with AI: the art is easier to generate consistently and the engines are approachable.",
    sections: [
      { heading: "1. Choose a 2D engine or a prompt-to-game tool", body: ["2D engines such as GDevelop, GameMaker or Godot give you full control; prompt-to-game tools are faster for prototypes."] },
      { heading: "2. Build the mechanic", body: ["Get movement, collisions and one goal working before adding content."] },
      { heading: "3. Generate sprites in one style", body: ["Use a pixel-art or sprite generator and keep the same palette and resolution for every asset. Clean up frames in a sprite editor if needed."] },
      { heading: "4. Add levels and sound", body: ["Design a few short levels that teach the mechanic, then add sound effects and music."] },
      { heading: "5. Playtest", body: ["Watch someone else play without helping. Fix what confuses them before adding features."] },
    ],
    bestLinks: ["ai-tools-for-2d-games", "ai-tools-for-pixel-art", "ai-tools-to-make-platformer-games"],
    updated: UPDATED,
  },
  {
    slug: "create-a-3d-game-ai",
    title: "How to create a 3D game with AI",
    description: "Use AI 3D generators and coding assistants with a 3D engine to build a small 3D game.",
    intro: "3D games involve more moving parts: models, materials, lighting and cameras. AI helps most with code and with first-draft 3D models.",
    sections: [
      { heading: "1. Pick a 3D engine", body: ["Unity, Unreal Engine and Godot all support 3D. Choose one with good tutorials for your type of game."] },
      { heading: "2. Block out the level", body: ["Use simple shapes to test movement, camera and scale before generating detailed models."] },
      { heading: "3. Generate and clean up models", body: ["Generate props and characters with an AI 3D tool, then check polygon count, UVs and scale before importing."] },
      { heading: "4. Script gameplay with an AI assistant", body: ["Ask an AI coding assistant for one behaviour at a time and read the code it produces."] },
      { heading: "5. Optimise", body: ["Check frame rate on your lowest target device and reduce model and texture sizes where needed."] },
    ],
    bestLinks: ["ai-tools-for-3d-games", "ai-3d-model-generators", "ai-tools-to-create-3d-worlds"],
    updated: UPDATED,
  },
  {
    slug: "create-game-assets-ai",
    title: "How to create game assets with AI",
    description: "Generate consistent sprites, textures, 3D models and sounds with AI, and check licensing before shipping.",
    intro: "AI asset generators can fill a game with art quickly. Consistency and licensing are what separate usable assets from a pile of images.",
    sections: [
      { heading: "Define a style guide", body: ["Fix the palette, resolution, perspective and line style before generating anything, and reuse the same reference images or style settings."] },
      { heading: "Use the right generator for each asset", body: ["Use sprite tools for 2D, 3D generators for models and audio tools for effects and music."] },
      { heading: "Edit, don't just generate", body: ["Clean up edges, fix animation frames and normalise sizes. A short editing pass makes assets look intentional."] },
      { heading: "Check licences", body: ["Read each tool's terms for commercial use and keep a record of where every asset came from."] },
    ],
    bestLinks: ["ai-game-asset-generators", "ai-image-generators-for-games", "ai-tools-for-game-sound-effects"],
    updated: UPDATED,
  },
  {
    slug: "export-code-from-an-ai-app-builder",
    title: "How to export code from an AI app builder",
    description: "Get your app's code out of an AI builder via download or GitHub sync, then run and deploy it yourself.",
    intro: "Exporting code lets you keep developing in your own repository, hire developers and host wherever you want.",
    sections: [
      { heading: "1. Check what export means for your tool", body: ["Some builders sync to GitHub continuously, some offer a ZIP download, and some only export on paid plans."] },
      { heading: "2. Export and run locally", body: ["Clone or unzip the project, install dependencies and start it locally. Follow the README if one is generated."] },
      { heading: "3. Replace platform-specific services", body: ["Note any hosted database, auth or storage the builder provided. Either keep using them with your own keys or migrate to services you control."] },
      { heading: "4. Deploy", body: ["Choose a host that supports your framework, set environment variables and deploy a staging copy first."] },
    ],
    bestLinks: ["ai-app-builders-with-code-export", "ai-app-builders-with-github-integration"],
    updated: UPDATED,
  },
  {
    slug: "export-code-from-an-ai-game-maker",
    title: "How to export code from an AI game maker",
    description: "Options for getting builds or source files out of AI game makers so you can publish anywhere.",
    intro: "Many AI game platforms host your game for you. If you want to sell it or keep developing elsewhere, check export options early.",
    sections: [
      { heading: "Builds versus source", body: ["A build is a playable package (for example HTML5); source is the editable project. You usually want both."] },
      { heading: "Check the platform's export options", body: ["Look for HTML5 export, download project or GitHub options in the tool's settings or plan comparison."] },
      { heading: "Move to an engine if needed", body: ["If a prompt-to-game tool cannot export, use it for prototyping and rebuild the final game in an engine that exports to your target platforms."] },
    ],
    bestLinks: ["ai-game-builder-with-export", "ai-games-maker-with-source-code"],
    updated: UPDATED,
  },
  {
    slug: "make-a-game-ai-without-coding",
    title: "How to make a game with AI without coding",
    description: "Make a playable game without code using prompt-to-game tools and no-code engines.",
    intro: "You do not need to program to make a game in 2026. Prompt-to-game tools and no-code engines handle the logic while you focus on design.",
    sections: [
      { heading: "1. Start with a tiny idea", body: ["One mechanic, one screen, one goal. Small ideas are finished; big ones are abandoned."] },
      { heading: "2. Describe it to a prompt-to-game tool", body: ["Explain the player, the controls and how you win or lose. Then ask for one change at a time."] },
      { heading: "3. Graduate to a no-code engine", body: ["When you want more control, recreate the game in a no-code engine with events and behaviours."] },
      { heading: "4. Share it", body: ["Publish a link, ask friends to play and collect feedback."] },
    ],
    bestLinks: ["no-code-game-makers", "prompt-to-game-ai-tools", "ai-game-builders-for-beginners"],
    updated: UPDATED,
  },
  {
    slug: "make-a-mobile-game-ai",
    title: "How to make a mobile game with AI",
    description: "Design for touch, pick an engine with mobile export, and use AI for code and art to ship a mobile game.",
    intro: "Mobile games need touch controls, short sessions and good performance on modest phones.",
    sections: [
      { heading: "Design for touch and short sessions", body: ["Use large touch targets and sessions of a few minutes."] },
      { heading: "Choose an engine with mobile export", body: ["Make sure the engine exports to iOS and Android and that you understand the build process."] },
      { heading: "Use AI for code and assets", body: ["An AI coding assistant can write input handling and UI; asset generators provide sprites and icons."] },
      { heading: "Test and publish", body: ["Test on older devices, then prepare store listings, screenshots and a privacy policy for each store."] },
    ],
    bestLinks: ["ai-tools-for-mobile-game-development", "ai-game-builder-with-export"],
    updated: UPDATED,
  },
  {
    slug: "make-a-multiplayer-game-ai",
    title: "How to make a multiplayer game with AI",
    description: "Plan networking, choose a platform with multiplayer features, and use AI to build and test a multiplayer game.",
    intro: "Multiplayer multiplies complexity: networking, cheating, matchmaking and moderation. Start small and lean on a platform that handles the hard parts.",
    sections: [
      { heading: "Pick the multiplayer model", body: ["Turn-based games are much easier than real-time ones. Decide early which you are building."] },
      { heading: "Use built-in networking", body: ["Platforms and engines with built-in multiplayer save months of work."] },
      { heading: "Let AI write, you review", body: ["AI assistants can write networking code, but review security-sensitive parts carefully: never trust the client with scores or currency."] },
      { heading: "Test with real players", body: ["Run small playtests with friends on different networks before opening it up."] },
    ],
    bestLinks: ["ai-game-maker-with-multiplayer"],
    updated: UPDATED,
  },
  {
    slug: "migrate-from-firebase-studio",
    title: "How to migrate from Firebase Studio",
    description: "Move a Firebase Studio project to another AI app builder or your own setup: export, inventory services, rebuild and redeploy.",
    intro: "Whether you are moving for features, pricing or availability, a calm migration starts with getting your code and data out and listing what the project depends on.",
    sections: [
      { heading: "1. Export your code", body: ["Make sure the project is in a Git repository you control, and clone it locally."] },
      { heading: "2. Inventory services", body: ["List the Firebase services you use — authentication, Firestore, storage, hosting, functions — and the environment variables the app needs."] },
      { heading: "3. Pick the destination", body: ["You can continue the same codebase in an AI code editor, or rebuild in another AI app builder using the existing app as the spec."] },
      { heading: "4. Move data and redeploy", body: ["Export data if you change databases, set up hosting and test sign-in, data access and payments in staging before switching users over."] },
    ],
    bestLinks: ["ai-app-builders", "ai-app-builders-with-code-export"],
    tools: ["firebase-studio"],
    updated: UPDATED,
  },
  {
    slug: "publish-an-ai-generated-game",
    title: "How to publish an AI-generated game",
    description: "Prepare, license-check and publish an AI-made game on the web, app stores or PC storefronts.",
    intro: "Publishing is where many AI-made games stall. Prepare the build, check rights, and pick the right store.",
    sections: [
      { heading: "Check rights and disclosures", body: ["Confirm the licences of the engine and every AI-generated asset. Some storefronts ask you to disclose AI-generated content — read their current rules."] },
      { heading: "Prepare store assets", body: ["You need a capsule or icon, screenshots, a short trailer or GIF and a clear description."] },
      { heading: "Choose where to publish", body: ["Web portals are quickest; app stores and PC storefronts need developer accounts and review."] },
      { heading: "Plan updates", body: ["Fix the first bugs players report quickly and keep a simple changelog."] },
    ],
    bestLinks: ["ai-game-maker-for-commercial-use", "ai-game-builder-with-export"],
    updated: UPDATED,
  },
];

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug);
