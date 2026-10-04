import fs from "node:fs";
import path from "node:path";

const srcRoot = path.resolve("src");
const scanRoots = [
  path.join(srcRoot, "routes"),
  path.join(srcRoot, "components"),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
    });
}

const routeFiles = walk(path.join(srcRoot, "routes"));
const scanFiles = scanRoots.flatMap(walk);

const routePatterns = new Set();
const routeSources = new Map();
const fileRoutePattern = new Map();

for (const file of routeFiles) {
  const source = fs.readFileSync(file, "utf8");

  for (const match of source.matchAll(
    /createFileRoute\(\s*["'`]([^"'`]+)["'`]\s*,?\s*\)/g,
  )) {
    routePatterns.add(match[1]);
    routeSources.set(match[1], { file, source });
    fileRoutePattern.set(file, match[1]);
  }
}

function patternMatches(pattern, target) {
  if (pattern === target) return true;

  const escaped = pattern
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (segment.startsWith("$")) return "[^/]+";

      return segment.replace(
        /[.*+?^$()|[\]\\{}]/g,
        "\\$&",
      );
    })
    .join("/");

  return new RegExp("^" + escaped + "$").test(target);
}

function hasRoute(target) {
  const clean = target.split(/[?#]/)[0];
  return [...routePatterns].some((pattern) =>
    patternMatches(pattern, clean),
  );
}

const broken = [];
const nestedRouteErrors = [];
const inertButtons = [];
const selfLinks = [];

for (const [pattern, info] of routeSources.entries()) {
  const hasChildren = [...routePatterns].some(
    (candidate) =>
      candidate !== pattern &&
      candidate.startsWith(pattern + "/"),
  );

  if (!hasChildren) continue;

  const rendersChildren =
    info.source.includes("RouteIndexBoundary") ||
    /<Outlet\b/.test(info.source);

  if (!rendersChildren) {
    nestedRouteErrors.push({
      file: path
        .relative(process.cwd(), info.file)
        .replaceAll("\\", "/"),
      pattern,
    });
  }
}

for (const file of scanFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path
    .relative(process.cwd(), file)
    .replaceAll("\\", "/");
  const ownPattern = fileRoutePattern.get(file);

  for (const match of source.matchAll(
    /(?:\bto|\bhref|actionTo)\s*=\s*["'`]([^"'`]+)["'`]/g,
  )) {
    const target = match[1];

    if (!target.startsWith("/") || target.startsWith("//")) {
      continue;
    }

    const clean = target.split(/[?#]/)[0];

    if (!hasRoute(target)) {
      broken.push({ file: relative, target });
      continue;
    }

    if (
      ownPattern &&
      ownPattern !== "/" &&
      clean === ownPattern &&
      !target.includes("?") &&
      !target.includes("#")
    ) {
      selfLinks.push({ file: relative, target });
    }
  }

  for (const match of source.matchAll(
    /<button\b([\s\S]*?)>([\s\S]*?)<\/button>/g,
  )) {
    const attrs = match[1];

    if (
      /onClick\s*=/.test(attrs) ||
      /type\s*=\s*["']submit["']/.test(attrs)
    ) {
      continue;
    }

    const label = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    inertButtons.push({
      file: relative,
      label: label || "(sem texto)",
    });
  }
}

if (inertButtons.length) {
  console.error(
    "\n[route-audit] Botões sem onClick/submit encontrados:",
  );
  for (const item of inertButtons) {
    console.error(
      "  - " + item.file + ": " + item.label,
    );
  }
}

if (selfLinks.length) {
  console.error(
    "\n[route-audit] Links que apontam para a própria rota sem efeito adicional:",
  );
  for (const item of selfLinks) {
    console.error(
      "  - " + item.file + " -> " + item.target,
    );
  }
}

if (nestedRouteErrors.length) {
  console.error(
    "\n[route-audit] Rotas-pai com filhos sem Outlet/boundary:",
  );
  for (const item of nestedRouteErrors) {
    console.error(
      "  - " + item.file + " (" + item.pattern + ")",
    );
  }
}

if (broken.length) {
  console.error(
    "\n[route-audit] Links internos sem rota correspondente:",
  );
  for (const item of broken) {
    console.error(
      "  - " + item.file + " -> " + item.target,
    );
  }
}

if (
  broken.length ||
  nestedRouteErrors.length ||
  inertButtons.length ||
  selfLinks.length
) {
  process.exit(1);
}

console.log(
  "[route-audit] OK: " +
    routePatterns.size +
    " rotas conhecidas; sem links quebrados, auto-links inertes, botões sem acção ou hierarquias inválidas.",
);
