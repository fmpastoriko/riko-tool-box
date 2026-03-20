export function summarizeFile(filePath: string, content: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext))
    return summarizeJS(content);
  if (ext === "css" || ext === "scss") return summarizeCSS(content);
  if (ext === "vue") return summarizeVue(content);
  if (ext === "py") return summarizePython(content);
  if (ext === "sql") return summarizeSQL(content);
  if (ext === "json") return summarizeJSON(filePath, content);
  return content.split("\n").slice(0, 8).join("\n");
}

function stripSignature(line: string): string {
  const trimmed = line.trim();
  const funcMatch = trimmed.match(
    /^(export\s+)?(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  );
  if (funcMatch)
    return `${funcMatch[1] ?? ""}${funcMatch[2] ?? ""}function ${funcMatch[3]}`;
  const arrowConstMatch = trimmed.match(
    /^(export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=:(<]/,
  );
  if (arrowConstMatch)
    return `${arrowConstMatch[1] ?? ""}const ${arrowConstMatch[2]}`;
  const letVarMatch = trimmed.match(
    /^(export\s+)?(let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=:(<]/,
  );
  if (letVarMatch)
    return `${letVarMatch[1] ?? ""}${letVarMatch[2]} ${letVarMatch[3]}`;
  const typeMatch = trimmed.match(
    /^(export\s+)?type\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  );
  if (typeMatch) return `${typeMatch[1] ?? ""}type ${typeMatch[2]}`;
  const interfaceMatch = trimmed.match(
    /^(export\s+)?interface\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  );
  if (interfaceMatch)
    return `${interfaceMatch[1] ?? ""}interface ${interfaceMatch[2]}`;
  const classMatch = trimmed.match(
    /^(export\s+)?(abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  );
  if (classMatch)
    return `${classMatch[1] ?? ""}${classMatch[2] ?? ""}class ${classMatch[3]}`;
  return line;
}

function summarizeJS(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isSig =
      /^(export\s+)?(async\s+)?function\s+/.test(trimmed) ||
      /^(export\s+)?const\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?(let|var)\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?type\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?interface\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?(abstract\s+)?class\s+[A-Za-z_$]/.test(trimmed) ||
      /^import\s/.test(trimmed);
    if (isSig)
      result.push(/^import\s/.test(trimmed) ? line : stripSignature(line));
  }
  return result.join("\n");
}

function summarizeCSS(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    ) {
      if (trimmed.endsWith("{") || trimmed.startsWith("@")) result.push(line);
    }
  }
  return result.join("\n");
}

function summarizeVue(content: string): string {
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const templateFirstLine = content.match(
    /<template[^>]*>\s*\n?\s*(<[^\n>]+>)/,
  );
  const result: string[] = [];
  if (templateFirstLine) result.push(`<template> ${templateFirstLine[1]}`);
  if (scriptMatch) {
    for (const line of scriptMatch[1].split("\n")) {
      const trimmed = line.trim();
      const isSig =
        /^(export\s+)?(async\s+)?function\s+/.test(trimmed) ||
        /^(export\s+)?const\s+[A-Za-z_$]/.test(trimmed) ||
        /^(export\s+)?type\s+[A-Za-z_$]/.test(trimmed) ||
        /^import\s/.test(trimmed);
      if (isSig)
        result.push(/^import\s/.test(trimmed) ? line : stripSignature(line));
    }
  }
  return result.join("\n");
}

function summarizePython(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isSig =
      trimmed.startsWith("def ") ||
      trimmed.startsWith("async def ") ||
      trimmed.startsWith("class ") ||
      trimmed.startsWith("import ") ||
      trimmed.startsWith("from ");
    if (isSig)
      result.push(trimmed.replace(/\(.*/, "").replace(/:$/, "").trim());
  }
  return result.join("\n");
}

function summarizeSQL(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    if (
      trimmed.startsWith("CREATE ") ||
      trimmed.startsWith("ALTER ") ||
      trimmed.startsWith("DROP ") ||
      trimmed.startsWith("INSERT ") ||
      trimmed.startsWith("SELECT ") ||
      trimmed.startsWith("UPDATE ") ||
      trimmed.startsWith("DELETE ")
    ) {
      result.push(line);
    }
  }
  return result.join("\n");
}

function summarizeJSON(filePath: string, content: string): string {
  try {
    const obj = JSON.parse(content);
    const topKeys = Object.keys(obj).slice(0, 20);
    const name = filePath.split("/").pop() ?? "";
    if (name === "package.json") {
      const scripts = obj.scripts ? Object.keys(obj.scripts) : [];
      const deps = [
        ...Object.keys(obj.dependencies ?? {}),
        ...Object.keys(obj.devDependencies ?? {}),
      ].slice(0, 20);
      return `package.json scripts: ${scripts.join(", ")}\ndeps: ${deps.join(", ")}`;
    }
    return `JSON keys: ${topKeys.join(", ")}`;
  } catch {
    return content.split("\n").slice(0, 5).join("\n");
  }
}
