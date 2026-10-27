/**
 * Curated "best X" landing pages from the 2026 keyword plan (/best/{slug}).
 * Lists name catalog slugs; unpublished or missing products are skipped at render time, and a page with fewer
 * than MIN_BEST_ITEMS visible products is noindex and left out of the sitemap (no thin pages).
 * Membership reflects what each product publicly offers; descriptions on the cards come from the catalog.
 */
export interface BestPage {
  slug: string;
  /** Keyword-shaped title without the year, e.g. "Best AI game makers". */
  title: string;
  /** One or two sentences specific to this page. */
  intro: string;
  /** What qualified a product for this list. */
  criteria: string;
  apps: string[];
  group: BestGroup;
  related?: string[];
}

export type BestGroup = "games" | "apps" | "coding" | "agents" | "creative";

export const MIN_BEST_ITEMS = 3;

export const GROUP_LABELS: Record<BestGroup, string> = {
  games: "AI game development",
  apps: "AI app builders",
  coding: "AI coding",
  agents: "AI agents and automation",
  creative: "AI creative tools",
};

const PROMPT_TO_GAME = ["astrocade", "rosebud-ai", "google-playground", "websim", "bitmagic", "playdrop", "seele-ai", "summer-engine"];
const ENGINES = ["unity", "godot-engine", "unreal-engine", "gamemaker", "gdevelop", "defold", "construct-3", "phaser", "roblox-studio", "buildbox"];
const GAME_ASSETS = ["ludo-ai", "scenario", "layer-ai", "pixellab", "retro-diffusion", "leonardo-ai", "meshy", "tripo", "sloyd", "rodin-hyper3d", "kaedim"];
const PROMPT_TO_APP = ["lovable", "bolt-new", "v0", "replit", "base44", "create-xyz", "dyad", "firebase-studio", "hostinger-horizons", "tempo", "same", "softgen", "emergent", "google-ai-studio"];
const MOBILE_APP = ["rork", "a0-dev", "flutterflow", "thunkable", "draftbit", "adalo", "glide", "replit"];
const NO_CODE_APP = ["bubble", "glide", "softr", "adalo", "flutterflow", "thunkable", "base44", "hostinger-horizons", "lovable"];
const INTERNAL_TOOLS = ["retool", "appsmith", "budibase", "superblocks", "softr", "glide"];
const AI_EDITORS = ["cursor", "windsurf", "zed", "trae", "kiro", "vscode"];
const ASSISTANTS = ["github-copilot", "cursor", "windsurf", "claude-code", "openai-codex", "gemini-code-assist", "amazon-q-developer", "tabnine", "augment-code", "sourcegraph-cody", "jetbrains-ai-assistant"];
const OSS_CODING = ["cline", "roo-code", "kilo-code", "aider", "continue", "openhands", "gemini-cli", "tabby"];
const AGENTIC_CODING = ["claude-code", "openai-codex", "cursor", "windsurf", "devin", "openhands", "amp", "cline", "roo-code", "kilo-code", "gemini-cli", "kiro", "aider"];
const AUTOMATION = ["n8n", "zapier", "make", "activepieces", "pipedream", "gumloop", "bardeen", "node-red"];
const AGENT_BUILDERS = ["lindy", "relevance-ai", "gumloop", "dify", "flowise", "langflow", "n8n", "stack-ai", "vellum", "botpress"];
const AGENT_FRAMEWORKS = ["langgraph", "crewai", "autogen", "langchain", "dify", "flowise", "langflow"];
const VIDEO = ["runway", "google-veo", "sora", "kling-ai", "pika", "luma-ai", "hailuo-ai", "google-flow", "pixverse", "vidu", "ltx-studio", "higgsfield"];
const MUSIC = ["suno", "udio", "aiva", "soundraw", "stable-audio", "mubert", "beatoven-ai", "boomy"];
const THREE_D = ["meshy", "tripo", "rodin-hyper3d", "sloyd", "kaedim", "spline", "promethean-ai"];

const games = (slug: string, title: string, intro: string, criteria: string, apps: string[], related?: string[]): BestPage =>
  ({ slug, title, intro, criteria, apps, group: "games", related });
const appsP = (slug: string, title: string, intro: string, criteria: string, apps: string[], related?: string[]): BestPage =>
  ({ slug, title, intro, criteria, apps, group: "apps", related });
const coding = (slug: string, title: string, intro: string, criteria: string, apps: string[], related?: string[]): BestPage =>
  ({ slug, title, intro, criteria, apps, group: "coding", related });
const agents = (slug: string, title: string, intro: string, criteria: string, apps: string[], related?: string[]): BestPage =>
  ({ slug, title, intro, criteria, apps, group: "agents", related });
const creative = (slug: string, title: string, intro: string, criteria: string, apps: string[], related?: string[]): BestPage =>
  ({ slug, title, intro, criteria, apps, group: "creative", related });

const ALL_PAGES: BestPage[] = [
  // ---------- AI game development ----------
  games("ai-game-makers", "Best AI game makers",
    "AI game makers turn a written idea into a playable game, or speed up building one in a full engine. This list mixes prompt-to-game platforms with engines that ship AI assistance.",
    "Lets you create and run a game, with AI generating code, logic or content as a core part of the workflow.",
    [...PROMPT_TO_GAME, "gdevelop", "buildbox", "makko-ai", "roblox-studio"], ["prompt-to-game-ai-tools", "free-ai-game-generators", "ai-game-builders-for-beginners"]),
  games("free-ai-game-generators", "Best free AI game generators",
    "You can prototype a game with AI without paying. These tools offer a free tier or are free to use, so you can test an idea before committing.",
    "Has a free plan or is free to use for creating games with AI help (paid upgrades may exist).",
    ["evonx", "astrocade", "rosebud-ai", "websim", "gdevelop", "playdrop", "bitmagic", "godot-engine", "google-playground"], ["ai-game-makers", "free-no-code-game-development-platforms"]),
  games("prompt-to-game-ai-tools", "Best prompt-to-game AI tools",
    "Prompt-to-game tools build a playable game from a text description and let you refine it by chatting. They are the fastest way from idea to something you can share.",
    "Generates a playable game primarily from natural-language prompts.",
    PROMPT_TO_GAME, ["text-to-game-generators", "ai-game-making-websites"]),
  games("text-to-game-generators", "Best text-to-game generators",
    "Text-to-game generators take a description of characters, rules and goals and produce a game you can play in the browser.",
    "Creates games from written descriptions without manual coding.",
    PROMPT_TO_GAME, ["prompt-to-game-ai-tools", "ai-game-makers"]),
  games("ai-game-making-websites", "Best AI game making websites",
    "These run entirely in the browser: describe a game, play it, and share a link without installing an engine.",
    "Browser-based, with AI-assisted game creation and online sharing.",
    ["astrocade", "rosebud-ai", "websim", "google-playground", "playdrop", "bitmagic", "gdevelop"], ["ai-game-creators-for-browser-games"]),
  games("ai-game-builders-for-beginners", "Best AI game builders for beginners",
    "If you have never made a game, start with tools that hide the code and let you describe what you want. These have gentle learning curves and quick results.",
    "Usable without programming experience, with AI or visual tools doing the heavy lifting.",
    ["astrocade", "rosebud-ai", "google-playground", "gdevelop", "buildbox", "websim", "playdrop", "roblox-studio"], ["ai-game-makers-for-kids", "make-a-game-ai-without-coding"]),
  games("ai-game-makers-for-kids", "Best AI game makers for kids",
    "Young creators can learn game design by describing ideas and tweaking the result. Always check each platform's age requirements and parental controls before signing up.",
    "Simple, visual or prompt-based creation that suits younger users; check each service's minimum age.",
    ["roblox-studio", "gdevelop", "astrocade", "rosebud-ai", "buildbox"], ["ai-game-builders-for-beginners"]),
  games("ai-game-creators-for-browser-games", "Best AI game creators for browser games",
    "Browser games are the easiest to share. These tools either run in the browser or export HTML5 builds you can host anywhere.",
    "Creates games that play in a web browser, either hosted by the tool or exported as HTML5.",
    ["astrocade", "rosebud-ai", "websim", "playdrop", "gdevelop", "phaser", "construct-3", "google-playground"], ["ai-tools-for-html5-games", "build-a-browser-game-ai"]),
  games("ai-tools-for-html5-games", "Best AI tools for HTML5 games",
    "HTML5 games run on any device with a browser. Pair an HTML5-friendly engine with an AI coding assistant to move quickly.",
    "An HTML5/web-capable engine or an AI tool commonly used to write web game code.",
    ["phaser", "gdevelop", "construct-3", "rosebud-ai", "websim", "cursor", "github-copilot", "claude-code"], ["ai-game-creators-for-browser-games"]),
  games("ai-game-maker-with-multiplayer", "Best AI game makers with multiplayer",
    "Multiplayer adds networking, accounts and moderation. These platforms and engines provide multiplayer features you can build on.",
    "Offers built-in multiplayer or networking features.",
    ["roblox-studio", "unity", "unreal-engine", "godot-engine", "gdevelop", "rosebud-ai"], ["make-a-multiplayer-game-ai"]),
  games("ai-game-builder-with-export", "Best AI game builders with export",
    "Exporting lets you publish to app stores, Steam or your own site instead of staying on one platform.",
    "Lets you export or download a build or the project files.",
    ["gdevelop", "godot-engine", "unity", "gamemaker", "construct-3", "buildbox", "defold", "rosebud-ai"], ["ai-games-maker-with-source-code", "export-code-from-an-ai-game-maker"]),
  games("ai-games-maker-with-source-code", "Best AI game makers with source code",
    "Owning the source means you can keep developing outside the tool. These give you access to project code, and several engines are open source themselves.",
    "Provides the game's source or project files; open-source engines are marked by their license.",
    ["godot-engine", "gdevelop", "phaser", "defold", "rosebud-ai", "unity", "summer-engine"], ["ai-game-builder-with-export"]),
  games("ai-game-maker-for-commercial-use", "Best AI game makers for commercial use",
    "Selling a game means checking licences for the engine and for every AI-generated asset. These are established tools with published commercial terms.",
    "Published terms that allow commercial release (always review the current licence and revenue-share terms).",
    ["unity", "unreal-engine", "godot-engine", "gamemaker", "gdevelop", "construct-3", "defold", "buildbox"], ["publish-an-ai-generated-game"]),
  games("ai-game-maker-for-indie-developers", "Best AI game makers for indie developers",
    "Indie teams need speed without giving up control. Combine an engine you can grow with and AI tools for code and art.",
    "Suits small teams: affordable, flexible, and helps ship faster with AI.",
    ["godot-engine", "unity", "gamemaker", "gdevelop", "rosebud-ai", "ludo-ai", "scenario", "cursor"], ["ai-development-tools-for-game-developers"]),
  games("ai-development-tools-for-game-developers", "Best AI development tools for game developers",
    "From code to concept art to sound, AI can remove busywork across game production. These cover the main parts of the pipeline.",
    "Used in game production for code, art, 3D, audio or design work.",
    ["cursor", "github-copilot", "claude-code", "ludo-ai", "scenario", "meshy", "inworld-ai", "elevenlabs", "promethean-ai"], ["ai-tools-for-unity-game-development", "ai-tools-for-godot"]),
  games("ai-tools-for-unity-game-development", "Best AI tools for Unity game development",
    "Unity projects benefit from AI coding help in C# and from asset generators that export standard formats Unity can import.",
    "Works with Unity projects: C# coding help or assets in Unity-compatible formats.",
    ["unity", "cursor", "github-copilot", "claude-code", "meshy", "tripo", "scenario", "inworld-ai", "layer-ai"], ["ai-tools-for-3d-games"]),
  games("ai-tools-for-godot", "Best AI tools for Godot",
    "Godot is free and open source. AI coding assistants help with GDScript and C#, while asset generators provide sprites and models you can import.",
    "Helps with Godot scripts or produces assets Godot can import.",
    ["godot-engine", "cursor", "github-copilot", "claude-code", "pixellab", "retro-diffusion", "ludo-ai", "meshy"], ["ai-tools-for-2d-games"]),
  games("ai-tools-for-2d-games", "Best AI tools for 2D games",
    "2D games need sprites, tiles, animation and simple physics. These engines and generators cover both building and art.",
    "A 2D-focused engine or a generator for 2D sprites and art.",
    ["gdevelop", "gamemaker", "construct-3", "godot-engine", "pixellab", "retro-diffusion", "ludo-ai", "makko-ai", "aseprite"], ["ai-tools-for-pixel-art", "create-a-2d-game-ai"]),
  games("ai-tools-for-3d-games", "Best AI tools for 3D games",
    "3D games need models, textures and a capable engine. AI 3D generators can produce starting meshes that artists refine.",
    "A 3D-capable engine or an AI tool that generates 3D assets.",
    ["unity", "unreal-engine", "godot-engine", "meshy", "tripo", "rodin-hyper3d", "sloyd", "kaedim", "promethean-ai"], ["ai-3d-model-generators", "create-a-3d-game-ai"]),
  games("ai-tools-to-create-3d-worlds", "Best AI tools to create 3D worlds",
    "Building environments is slow by hand. These tools help generate or populate 3D scenes and objects.",
    "Generates 3D environments, props or scenes, or helps assemble them.",
    ["promethean-ai", "unreal-engine", "unity", "meshy", "sloyd", "tripo", "rodin-hyper3d", "spline"], ["ai-tools-for-3d-games"]),
  games("ai-tools-for-mobile-game-development", "Best AI tools for mobile game development",
    "Mobile games must export to iOS and Android. These engines support mobile builds, and the AI tools speed up code and art.",
    "Supports iOS/Android export, or is an AI tool commonly used in mobile game workflows.",
    ["unity", "godot-engine", "gamemaker", "buildbox", "gdevelop", "defold", "construct-3", "ludo-ai"], ["make-a-mobile-game-ai"]),
  games("ai-tools-for-game-prototyping", "Best AI tools for game prototyping",
    "Prototypes answer one question: is this fun? Prompt-to-game tools and quick engines let you test mechanics in hours instead of weeks.",
    "Gets a playable prototype running quickly.",
    ["rosebud-ai", "astrocade", "websim", "google-playground", "gdevelop", "ludo-ai", "summer-engine", "cursor"], ["ai-game-idea-generators"]),
  games("ai-game-idea-generators", "Best AI game idea generators",
    "Stuck on a concept? These tools help brainstorm mechanics, themes and pitches, and some turn ideas straight into prototypes.",
    "Helps generate or develop game concepts.",
    ["ludo-ai", "chatgpt", "claude", "gemini", "rosebud-ai", "astrocade"], ["ai-tools-for-game-design-documents"]),
  games("ai-tools-for-game-design-documents", "Best AI tools for game design documents",
    "A game design document keeps a team aligned. AI assistants can draft structure, mechanics and balancing notes for you to edit.",
    "Assists with writing and organising design documentation.",
    ["chatgpt", "claude", "gemini", "notion", "ludo-ai"], ["ai-game-idea-generators"]),
  games("ai-game-asset-generators", "Best AI game asset generators",
    "Asset generators produce sprites, textures, icons, 3D models and more. Check each tool's licence before using output in a commercial game.",
    "Generates game-ready art, 3D or audio assets.",
    GAME_ASSETS, ["create-game-assets-ai", "ai-image-generators-for-games"]),
  games("ai-image-generators-for-games", "Best AI image generators for games",
    "For concept art, textures and marketing images, general image models work well; game-specific tools add style consistency.",
    "Produces images suited to game art, ideally with style control.",
    ["scenario", "leonardo-ai", "layer-ai", "midjourney", "ludo-ai", "pixellab", "retro-diffusion", "adobe-firefly"], ["ai-game-asset-generators"]),
  games("ai-tools-for-pixel-art", "Best AI tools for pixel art",
    "Pixel art needs crisp, consistent sprites. Specialised generators beat general image models here, and a sprite editor helps clean up.",
    "Creates or edits pixel-art sprites and animations.",
    ["pixellab", "retro-diffusion", "ludo-ai", "aseprite", "scenario"], ["ai-tools-for-2d-games"]),
  games("ai-tools-for-game-characters", "Best AI tools for game characters",
    "Characters need a look, animation and sometimes a personality. These cover character art, 3D models and AI-driven dialogue.",
    "Creates character art, models, animation or conversational NPCs.",
    ["inworld-ai", "scenario", "ludo-ai", "meshy", "pixellab", "makko-ai", "leonardo-ai", "elevenlabs"], ["ai-game-asset-generators"]),
  games("ai-tools-for-game-sound-effects", "Best AI tools for game sound effects",
    "Sound effects and music make a game feel finished. These generate effects, voices or background tracks from text.",
    "Generates sound effects, voices or game music.",
    ["elevenlabs", "stable-audio", "ludo-ai", "suno", "udio", "soundraw", "aiva"], ["ai-music-generators"]),
  games("ai-tools-to-make-platformer-games", "Best AI tools to make platformer games",
    "Platformers need tight controls and level design. 2D engines with platformer templates plus AI art tools are a strong combination.",
    "A 2D engine suited to platformers or a prompt-to-game tool that can build one.",
    ["gdevelop", "gamemaker", "construct-3", "godot-engine", "rosebud-ai", "astrocade", "pixellab"], ["ai-tools-for-2d-games"]),
  games("ai-tools-to-create-puzzle-games", "Best AI tools to create puzzle games",
    "Puzzle games are well suited to AI prototyping because the rules are easy to describe.",
    "Builds puzzle games from prompts or offers simple logic tools for them.",
    ["astrocade", "rosebud-ai", "websim", "gdevelop", "construct-3", "google-playground"], ["prompt-to-game-ai-tools"]),
  games("no-code-game-makers", "Best no-code game makers",
    "No-code game makers use events, visual logic or prompts instead of programming.",
    "Builds complete games without writing code.",
    ["gdevelop", "buildbox", "construct-3", "astrocade", "rosebud-ai", "google-playground", "roblox-studio", "playdrop"], ["free-no-code-game-development-platforms"]),
  games("free-no-code-game-development-platforms", "Best free no-code game development platforms",
    "Free no-code platforms let you learn and ship without upfront cost.",
    "No-code creation with a free plan or free to use.",
    ["gdevelop", "astrocade", "rosebud-ai", "roblox-studio", "websim", "playdrop"], ["no-code-game-makers"]),

  // ---------- AI app builders ----------
  appsP("ai-app-builders", "Best AI app builders",
    "AI app builders generate a working app from a prompt and let you keep editing in chat or in code.",
    "Builds a working web or mobile app from natural-language prompts.",
    PROMPT_TO_APP, ["prompt-to-app-tools", "free-vibe-coding-tools", "choose-an-ai-app-builder"]),
  appsP("prompt-to-app-tools", "Best prompt-to-app tools",
    "Describe the app, review the result, iterate. These tools produce full apps, not just snippets.",
    "Turns a prompt into a running app with UI and logic.",
    PROMPT_TO_APP, ["ai-app-builders"]),
  appsP("no-code-ai-app-builders", "Best no-code AI app builders",
    "No-code AI builders let non-developers create apps with prompts and visual editors.",
    "Creates apps without writing code, with AI generation or assistance.",
    NO_CODE_APP, ["ai-app-builders-for-beginners", "build-a-mobile-app-ai-without-coding"]),
  appsP("ai-app-builders-for-beginners", "Best AI app builders for beginners",
    "Start with tools that handle hosting, databases and deployment for you.",
    "Beginner-friendly, with hosting and setup handled for you.",
    ["lovable", "base44", "bolt-new", "hostinger-horizons", "create-xyz", "glide", "softr", "replit"], ["no-code-ai-app-builders"]),
  appsP("ai-app-builders-for-startups", "Best AI app builders for startups",
    "Startups need an MVP fast and a path to a real codebase. These builders generate production-style code you can keep developing.",
    "Fast MVPs with code you can own and extend.",
    ["lovable", "bolt-new", "v0", "replit", "base44", "cursor", "firebase-studio", "dyad"], ["ai-app-builders-for-saas", "build-a-saas-ai"]),
  appsP("ai-app-builders-for-saas", "Best AI app builders for SaaS",
    "SaaS products need accounts, a database and payments. These builders can scaffold that stack.",
    "Can produce apps with authentication, a database and integrations typical for SaaS.",
    ["lovable", "bolt-new", "base44", "replit", "v0", "create-xyz", "firebase-studio"], ["ai-app-builders-with-authentication", "ai-app-builders-with-databases"]),
  appsP("ai-app-builders-for-ecommerce", "Best AI app builders for ecommerce",
    "For a store, you need a catalogue and checkout. Website builders with commerce features and app builders with payment integrations both work.",
    "Can build storefronts or shopping flows, typically through payment integrations.",
    ["hostinger-horizons", "lovable", "bolt-new", "base44", "wix", "framer", "webflow"], ["ai-app-builders"]),
  appsP("ai-app-builders-with-authentication", "Best AI app builders with authentication",
    "User sign-in is one of the first things a real app needs. These builders add authentication for you.",
    "Can add user sign-up and sign-in to generated apps.",
    ["lovable", "base44", "bolt-new", "replit", "create-xyz", "firebase-studio", "softr", "glide"], ["ai-app-builders-with-backend"]),
  appsP("ai-app-builders-with-backend", "Best AI app builders with backend",
    "Front-end-only builders stop at the UI. These also generate server logic, APIs or managed backends.",
    "Generates or connects a backend (server logic, database, APIs).",
    ["lovable", "base44", "bolt-new", "replit", "create-xyz", "firebase-studio", "dyad", "emergent"], ["ai-app-builders-with-databases"]),
  appsP("ai-app-builders-with-databases", "Best AI app builders with databases",
    "Data is what makes an app useful. These create and manage database tables as part of the build.",
    "Creates or connects a database as part of the app.",
    ["lovable", "base44", "bolt-new", "replit", "create-xyz", "firebase-studio", "glide", "softr", "bubble"], ["ai-app-builders-with-backend"]),
  appsP("ai-app-builders-with-code-export", "Best AI app builders with code export",
    "Exporting code avoids lock-in: you can move the app to your own repository and hosting.",
    "Lets you download the code or sync it to a Git repository.",
    ["lovable", "bolt-new", "v0", "replit", "dyad", "firebase-studio", "flutterflow", "draftbit"], ["export-code-from-an-ai-app-builder", "ai-app-builders-with-github-integration"]),
  appsP("ai-app-builders-with-github-integration", "Best AI app builders with GitHub integration",
    "GitHub sync lets developers review, version and extend what the AI builds.",
    "Connects to GitHub to push or sync the project.",
    ["lovable", "bolt-new", "v0", "replit", "firebase-studio", "cursor"], ["ai-app-builders-with-code-export"]),
  appsP("ai-mobile-app-generators", "Best AI mobile app generators",
    "These generate native or cross-platform mobile apps for iOS and Android.",
    "Builds iOS/Android apps with AI generation or assistance.",
    MOBILE_APP, ["ai-tools-for-mobile-app-development", "build-a-mobile-app-ai-without-coding"]),
  appsP("ai-tools-for-mobile-app-development", "Best AI tools for mobile app development",
    "Whether you generate the app or code it yourself, these tools speed up mobile development.",
    "Builds mobile apps or assists developers writing them.",
    [...MOBILE_APP, "cursor", "github-copilot"], ["ai-mobile-app-generators"]),
  appsP("ai-tools-for-building-internal-tools", "Best AI tools for building internal tools",
    "Admin panels, dashboards and approval flows are ideal for low-code platforms with AI generation.",
    "Builds internal apps on company data with AI assistance.",
    INTERNAL_TOOLS, ["no-code-ai-app-builders"]),
  appsP("open-source-ai-app-builders", "Best open-source AI app builders",
    "Open-source builders can be audited, self-hosted and extended.",
    "Open-source core (check each project's licence).",
    ["dyad", "appsmith", "budibase", "openhands"], ["self-hosted-ai-app-builders"]),
  appsP("self-hosted-ai-app-builders", "Best self-hosted AI app builders",
    "Self-hosting keeps data on your own infrastructure.",
    "Can run on your own machine or servers.",
    ["dyad", "appsmith", "budibase", "openhands"], ["open-source-ai-app-builders"]),
  appsP("free-vibe-coding-tools", "Best free vibe coding tools",
    "Vibe coding means building by describing what you want. These have free plans or are free to use.",
    "Prompt-driven app building with a free plan or free to use.",
    ["dyad", "google-ai-studio", "lovable", "bolt-new", "v0", "replit", "firebase-studio", "websim"], ["ai-app-builders"]),
  appsP("ai-tools-for-nextjs-apps", "Best AI tools for Next.js apps",
    "Next.js is a common target for AI generators and assistants, so you have good options for both generating and editing.",
    "Generates Next.js/React code or assists with it.",
    ["v0", "bolt-new", "cursor", "github-copilot", "claude-code", "windsurf"], ["ai-coding-agents-for-react"]),
  appsP("ai-coding-platforms-with-hosting", "Best AI coding platforms with hosting",
    "These build the app and also host it, so you can share a live URL without setting up servers.",
    "Includes deployment/hosting for what you build.",
    ["replit", "lovable", "bolt-new", "v0", "base44", "firebase-studio", "hostinger-horizons", "create-xyz"], ["ai-app-builders"]),

  // ---------- AI coding ----------
  coding("ai-coding-assistants", "Best AI coding assistants",
    "AI coding assistants complete code, answer questions about your codebase and make edits.",
    "Assists developers inside an editor or terminal.",
    ASSISTANTS, ["ai-code-editors", "agentic-coding-tools"]),
  coding("ai-code-editors", "Best AI code editors",
    "AI-native editors build the assistant into the editor itself, including multi-file edits and agents.",
    "A code editor with built-in AI features.",
    AI_EDITORS, ["ai-coding-assistants", "vscode-ai-extensions"]),
  coding("agentic-coding-tools", "Best agentic coding tools",
    "Agentic tools plan and carry out multi-step changes: reading files, running commands and fixing tests.",
    "Can carry out multi-step coding tasks autonomously, with your review.",
    AGENTIC_CODING, ["open-source-ai-coding-agents"]),
  coding("open-source-ai-coding-agents", "Best open-source AI coding agents",
    "Open-source agents let you choose models, inspect behaviour and run locally.",
    "Open-source licence and agentic coding features.",
    OSS_CODING, ["local-ai-coding-tools", "free-cursor-alternatives"]),
  coding("local-ai-coding-tools", "Best local AI coding tools",
    "Local tools can run models on your own machine for privacy or offline work.",
    "Runs locally or supports locally hosted models.",
    ["ollama", "lm-studio", "tabby", "continue", "aider", "cline", "roo-code", "kilo-code", "zed"], ["open-source-ai-coding-agents"]),
  coding("vscode-ai-extensions", "Best VS Code AI extensions",
    "If you want to stay in VS Code, these extensions add chat, completions or agents.",
    "Available as a Visual Studio Code extension.",
    ["github-copilot", "cline", "roo-code", "kilo-code", "continue", "tabnine", "amazon-q-developer", "gemini-code-assist", "augment-code", "sourcegraph-cody"], ["ai-coding-assistants"]),
  coding("free-cursor-alternatives", "Best free Cursor alternatives",
    "Want AI-assisted coding without Cursor's subscription? These are free, open source or have free tiers.",
    "Free plan, free to use, or open source.",
    ["cline", "roo-code", "kilo-code", "continue", "aider", "vscode", "zed", "gemini-cli", "trae"], ["open-source-ai-coding-agents"]),
  coding("ai-coding-tools-for-beginners", "Best AI coding tools for beginners",
    "Beginners benefit from tools that explain code and run it for you.",
    "Explains code and lowers setup effort.",
    ["replit", "github-copilot", "cursor", "windsurf", "chatgpt", "claude", "google-ai-studio"], ["ai-app-builders-for-beginners"]),
  coding("ai-code-review-tools", "Best AI code review tools",
    "AI reviewers comment on pull requests to catch bugs and style issues before merge.",
    "Reviews pull requests or diffs automatically.",
    ["coderabbit", "qodo", "greptile", "graphite", "github-copilot"], ["ai-coding-assistants"]),
  coding("ai-coding-agents-for-python", "Best AI coding agents for Python",
    "These agents handle Python projects well, from scripts to data pipelines.",
    "General-purpose coding agents that work well with Python codebases.",
    ["claude-code", "cursor", "aider", "openai-codex", "github-copilot", "cline", "openhands", "gemini-cli"], ["agentic-coding-tools"]),
  coding("ai-coding-agents-for-react", "Best AI coding agents for React",
    "React UIs are a sweet spot for AI: components are small and patterns are well known.",
    "Generates or edits React components and apps.",
    ["v0", "cursor", "claude-code", "bolt-new", "lovable", "github-copilot", "windsurf"], ["ai-tools-for-nextjs-apps"]),

  // ---------- AI agents and automation ----------
  agents("ai-workflow-automation-tools", "Best AI workflow automation tools",
    "Connect apps and add AI steps to automate repetitive work.",
    "Automates multi-step workflows across apps with AI steps.",
    AUTOMATION, ["ai-tools-for-workflow-automation", "no-code-ai-agent-builders"]),
  agents("ai-tools-for-workflow-automation", "Best AI tools for workflow automation",
    "From simple triggers to AI agents, these tools automate work across your apps.",
    "Automates workflows across apps, with AI built in.",
    [...AUTOMATION, "lindy", "relevance-ai"], ["ai-workflow-automation-tools"]),
  agents("no-code-ai-agent-builders", "Best no-code AI agent builders",
    "Build agents that read email, update CRMs or answer customers, without code.",
    "Visual or prompt-based agent building, no code required.",
    AGENT_BUILDERS, ["ai-agent-builders-with-integrations"]),
  agents("ai-agent-builders-with-integrations", "Best AI agent builders with integrations",
    "Agents are only as useful as the systems they can reach. These ship many ready-made integrations.",
    "Many built-in integrations or a large connector library.",
    ["n8n", "zapier", "make", "lindy", "relevance-ai", "gumloop", "activepieces", "pipedream", "composio"], ["no-code-ai-agent-builders"]),
  agents("ai-agents-for-small-business", "Best AI agents for small business",
    "Small teams can delegate inbox triage, scheduling, support and data entry.",
    "Affordable, quick to set up, and handles common business tasks.",
    ["lindy", "zapier", "make", "n8n", "gumloop", "relevance-ai", "chatbase", "botpress"], ["ai-workflow-automation-tools"]),
  agents("ai-agent-orchestration-frameworks", "Best AI agent orchestration frameworks",
    "Frameworks for developers who coordinate multiple agents, tools and memory in code.",
    "A developer framework for building and coordinating agents.",
    AGENT_FRAMEWORKS, ["open-source-ai-agent-frameworks"]),
  agents("open-source-ai-agent-frameworks", "Best open-source AI agent frameworks",
    "Open-source frameworks let you self-host and customise agents.",
    "Open-source licence (check each project's terms).",
    [...AGENT_FRAMEWORKS, "n8n", "activepieces"], ["self-hosted-ai-agent-tools"]),
  agents("self-hosted-ai-agent-tools", "Best self-hosted AI agent tools",
    "Self-hosting keeps data and credentials on your own servers.",
    "Can be deployed on your own infrastructure.",
    ["n8n", "activepieces", "dify", "flowise", "langflow", "node-red", "open-webui", "browser-use", "skyvern"], ["open-source-ai-agent-frameworks"]),
  agents("ai-browser-automation-agents", "Best AI browser automation agents",
    "Browser agents click, type and read web pages for you, even on sites without an API.",
    "Automates tasks in a web browser using AI.",
    ["browser-use", "skyvern", "browserbase", "manus", "multion", "comet", "bardeen"], ["ai-research-agents"]),
  agents("ai-research-agents", "Best AI research agents",
    "Research agents search, read and summarise sources into a report.",
    "Searches and synthesises information into answers or reports.",
    ["perplexity", "genspark", "manus", "elicit", "consensus", "notebooklm", "undermind"], ["ai-browser-automation-agents"]),

  // ---------- AI creative tools ----------
  creative("ai-video-generators", "Best AI video generators",
    "Text- and image-to-video models now produce short cinematic clips.",
    "Generates video from text or images.",
    VIDEO, ["text-to-video-ai-tools", "ai-animation-generators"]),
  creative("text-to-video-ai-tools", "Best text-to-video AI tools",
    "Type a scene description and get a video clip.",
    "Generates video directly from a text prompt.",
    VIDEO, ["ai-video-generators"]),
  creative("ai-animation-generators", "Best AI animation generators",
    "Animate characters or images with AI motion.",
    "Generates or applies animation with AI.",
    ["viggle", "runway", "pika", "kling-ai", "luma-ai", "wonder-studio", "animaker", "makko-ai"], ["ai-video-generators"]),
  creative("ai-music-generators", "Best AI music generators",
    "Generate songs, instrumentals or background music from a prompt.",
    "Generates music from text or settings.",
    MUSIC, ["ai-tools-for-game-sound-effects"]),
  creative("ai-3d-model-generators", "Best AI 3D model generators",
    "Create 3D meshes from text or images as a starting point for your project.",
    "Generates 3D models from text or images.",
    THREE_D, ["ai-image-to-3d-tools", "ai-tools-for-3d-games"]),
  creative("ai-image-to-3d-tools", "Best AI image-to-3D tools",
    "Turn a reference image or sketch into a 3D model.",
    "Generates a 3D model from an input image.",
    ["meshy", "tripo", "rodin-hyper3d", "kaedim", "sloyd"], ["ai-3d-model-generators"]),
];

/**
 * Lists that answered the same search intent with the same products were merged: the old URL redirects (308)
 * to the list that kept the content, and its products are folded into that list.
 */
export const MERGED_BEST: Record<string, string> = {
  "text-to-game-generators": "prompt-to-game-ai-tools",
  "self-hosted-ai-app-builders": "open-source-ai-app-builders",
  "text-to-video-ai-tools": "ai-video-generators",
  "prompt-to-app-tools": "ai-app-builders",
  "ai-tools-for-workflow-automation": "ai-workflow-automation-tools",
  "ai-tools-for-mobile-app-development": "ai-mobile-app-generators",
};

const resolve = (slug: string) => MERGED_BEST[slug] ?? slug;

export const BEST_PAGES: BestPage[] = ALL_PAGES.filter((p) => !(p.slug in MERGED_BEST)).map((p) => {
  const merged = ALL_PAGES.filter((m) => MERGED_BEST[m.slug] === p.slug);
  return {
    ...p,
    apps: [...new Set([...p.apps, ...merged.flatMap((m) => m.apps)])],
    related: p.related && [...new Set(p.related.map(resolve))].filter((r) => r !== p.slug),
  };
});

export const bestPage = (slug: string) => BEST_PAGES.find((p) => p.slug === resolve(slug));

/** Best-list slugs referenced elsewhere (guides, keyword targets) resolved past merges, without duplicates. */
export const resolveBestSlugs = (slugs: string[]) => [...new Set(slugs.map(resolve))];
