/**
 * Alternatives and comparison targets from the 2026 keyword plan. The plan proposed /alternatives/{x} and
 * /compare/{a}-vs-{b}; those URLs permanently redirect to our existing canonical pages
 * (/software/{slug}/alternatives and the alphabetical /compare pair), so there is one page per intent.
 */

/** Keyword-plan names that differ from catalog slugs. */
export const SLUG_ALIASES: Record<string, string> = {
  "lindy-ai": "lindy",
  "make-com": "make",
  "manus-ai": "manus",
  "meshy-ai": "meshy",
  "scenario-ai": "scenario",
  "tripo-ai": "tripo",
  "rosebud-ai": "rosebud",
  veo: "google-veo",
  godot: "godot-engine",
};

export const resolveSlug = (slug: string) => SLUG_ALIASES[slug] ?? slug;

/** Products whose "X alternatives" page is a keyword target, with the /best lists that match their use-case variants. */
export const ALTERNATIVE_TARGETS: Record<string, string[]> = {
  aider: ["open-source-ai-coding-agents", "local-ai-coding-tools"],
  "amazon-q-developer": ["ai-coding-assistants", "vscode-ai-extensions"],
  astrocade: ["ai-game-makers", "ai-tools-for-3d-games", "ai-tools-for-mobile-game-development"],
  base44: ["ai-app-builders", "ai-mobile-app-generators", "ai-app-builders-with-databases"],
  bitmagic: ["prompt-to-game-ai-tools", "free-ai-game-generators"],
  "bolt-new": ["ai-app-builders", "ai-app-builders-with-backend", "ai-app-builders-for-beginners"],
  bubble: ["no-code-ai-app-builders", "open-source-ai-app-builders"],
  buildbox: ["no-code-game-makers", "free-no-code-game-development-platforms"],
  "claude-code": ["agentic-coding-tools", "vscode-ai-extensions", "open-source-ai-coding-agents"],
  cline: ["open-source-ai-coding-agents", "vscode-ai-extensions"],
  continue: ["open-source-ai-coding-agents", "local-ai-coding-tools"],
  "create-xyz": ["ai-app-builders", "prompt-to-app-tools"],
  crewai: ["ai-agent-orchestration-frameworks", "open-source-ai-agent-frameworks"],
  cursor: ["free-cursor-alternatives", "ai-code-editors", "ai-development-tools-for-game-developers"],
  dify: ["no-code-ai-agent-builders", "self-hosted-ai-agent-tools"],
  dyad: ["open-source-ai-app-builders", "self-hosted-ai-app-builders"],
  elevenlabs: ["ai-tools-for-game-sound-effects"],
  "firebase-studio": ["ai-app-builders", "ai-app-builders-with-code-export", "migrate-from-firebase-studio"],
  flowise: ["self-hosted-ai-agent-tools", "open-source-ai-agent-frameworks"],
  flutterflow: ["ai-mobile-app-generators", "no-code-ai-app-builders"],
  gdevelop: ["no-code-game-makers", "ai-game-creators-for-browser-games", "ai-tools-for-mobile-game-development"],
  genspark: ["ai-research-agents"],
  "github-copilot": ["ai-coding-assistants", "free-cursor-alternatives", "vscode-ai-extensions"],
  glide: ["no-code-ai-app-builders", "ai-tools-for-building-internal-tools"],
  "google-ai-studio": ["free-vibe-coding-tools", "ai-app-builders"],
  "google-flow": ["ai-video-generators", "text-to-video-ai-tools"],
  "google-playground": ["prompt-to-game-ai-tools", "ai-game-creators-for-browser-games", "ai-tools-for-3d-games"],
  "hostinger-horizons": ["ai-app-builders", "ai-coding-platforms-with-hosting"],
  "kling-ai": ["ai-video-generators", "text-to-video-ai-tools"],
  langflow: ["open-source-ai-agent-frameworks", "self-hosted-ai-agent-tools"],
  "leonardo-ai": ["ai-image-generators-for-games", "ai-game-asset-generators"],
  lindy: ["no-code-ai-agent-builders", "ai-agents-for-small-business"],
  lovable: ["ai-app-builders", "ai-app-builders-for-beginners", "free-vibe-coding-tools"],
  "ludo-ai": ["ai-game-asset-generators", "ai-game-idea-generators"],
  make: ["ai-workflow-automation-tools", "self-hosted-ai-agent-tools"],
  "makko-ai": ["ai-tools-for-2d-games", "ai-tools-for-game-characters"],
  manus: ["ai-browser-automation-agents", "ai-research-agents"],
  meshy: ["ai-3d-model-generators", "ai-image-to-3d-tools"],
  midjourney: ["ai-image-generators-for-games"],
  n8n: ["ai-workflow-automation-tools", "ai-agents-for-small-business", "no-code-ai-agent-builders"],
  pika: ["ai-video-generators", "ai-animation-generators"],
  playdrop: ["prompt-to-game-ai-tools", "ai-game-creators-for-browser-games"],
  replit: ["ai-coding-platforms-with-hosting", "ai-game-creators-for-browser-games", "ai-tools-for-3d-games"],
  "roblox-studio": ["ai-game-maker-with-multiplayer", "free-no-code-game-development-platforms"],
  "roo-code": ["open-source-ai-coding-agents", "vscode-ai-extensions"],
  rork: ["ai-mobile-app-generators"],
  rosebud: ["prompt-to-game-ai-tools", "ai-game-maker-with-multiplayer", "ai-tools-for-mobile-game-development"],
  runway: ["ai-video-generators", "ai-animation-generators"],
  scenario: ["ai-game-asset-generators", "ai-image-generators-for-games"],
  "seele-ai": ["prompt-to-game-ai-tools", "ai-tools-for-3d-games"],
  softr: ["no-code-ai-app-builders", "ai-tools-for-building-internal-tools"],
  sora: ["ai-video-generators", "text-to-video-ai-tools"],
  "summer-engine": ["ai-game-makers", "ai-games-maker-with-source-code"],
  suno: ["ai-music-generators"],
  tabnine: ["ai-coding-assistants", "local-ai-coding-tools"],
  tripo: ["ai-3d-model-generators", "ai-image-to-3d-tools"],
  udio: ["ai-music-generators"],
  unity: ["ai-tools-for-unity-game-development", "ai-games-maker-with-source-code"],
  v0: ["ai-tools-for-nextjs-apps", "ai-app-builders-with-backend"],
  websim: ["prompt-to-game-ai-tools", "ai-game-making-websites"],
  windsurf: ["ai-code-editors", "free-cursor-alternatives", "vscode-ai-extensions"],
  zapier: ["ai-workflow-automation-tools", "ai-agents-for-small-business", "self-hosted-ai-agent-tools"],
};

/** Comparison targets (plan order; the page itself canonicalises to alphabetical order). */
export const COMPARE_TARGETS: [string, string][] = [
  ["aider", "cline"], ["astrocade", "gdevelop"], ["astrocade", "websim"], ["base44", "replit"], ["base44", "v0"],
  ["bolt-new", "base44"], ["bolt-new", "replit"], ["bubble", "flutterflow"], ["cline", "roo-code"], ["continue", "cursor"],
  ["crewai", "langflow"], ["cursor", "claude-code"], ["cursor", "github-copilot"], ["cursor", "windsurf"], ["dify", "flowise"],
  ["dyad", "lovable"], ["firebase-studio", "google-ai-studio"], ["flowise", "langflow"], ["gdevelop", "buildbox"], ["gdevelop", "godot"],
  ["glide", "softr"], ["google-ai-studio", "replit"], ["google-playground", "astrocade"], ["google-playground", "replit"],
  ["google-playground", "rosebud-ai"], ["google-playground", "websim"], ["lovable", "base44"], ["lovable", "bolt-new"],
  ["lovable", "replit"], ["lovable", "v0"], ["ludo-ai", "rosebud-ai"], ["manus-ai", "genspark"], ["meshy-ai", "tripo-ai"],
  ["midjourney", "leonardo-ai"], ["n8n", "make-com"], ["n8n", "zapier"], ["rork", "flutterflow"], ["rosebud-ai", "astrocade"],
  ["rosebud-ai", "gdevelop"], ["rosebud-ai", "replit"], ["runway", "kling-ai"], ["runway", "pika"], ["scenario-ai", "leonardo-ai"],
  ["sora", "veo"], ["suno", "udio"], ["unity", "godot"], ["v0", "bolt-new"], ["v0", "replit"], ["websim", "replit"],
  ["windsurf", "github-copilot"],
];

export const canonicalPair = (a: string, b: string) => [resolveSlug(a), resolveSlug(b)].sort().join("-vs-");
