export function summarizeFile(
  filePath: string,
  content: string,
  mode: "full" | "semi" | "names" = "full",
): string {
  if (mode === "names") {
    const name = filePath.split("/").pop() ?? filePath;
    return name;
  }

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const isJS = ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext);

  if (mode === "semi") {
    if (isJS) return summarizeJS(content, "semi");
    if (ext === "css" || ext === "scss") return summarizeCSS(content, "semi");
    if (ext === "vue") return summarizeVue(content, "semi");
    if (ext === "py") return summarizePython(content, "semi");
    if (ext === "sql") return summarizeSQL(content, "semi");
    if (ext === "json") return summarizeJSON(filePath, content);
    return filePath.split("/").pop() ?? filePath;
  }

  if (mode === "full") {
    if (isJS) return summarizeJS(content, "full");
    if (ext === "css" || ext === "scss") return summarizeCSS(content, "full");
    if (ext === "vue") return summarizeVue(content, "full");
    if (ext === "py") return summarizePython(content, "full");
    if (ext === "sql") return summarizeSQL(content, "full");
    if (ext === "json") return summarizeJSON(filePath, content);
    return content.split("\n").slice(0, 8).join("\n");
  }

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

function isSemiSig(trimmed: string): boolean {
  return (
    /^(export\s+)?(async\s+)?function\s+/.test(trimmed) ||
    /^(export\s+)?type\s+[A-Za-z_$]/.test(trimmed) ||
    /^(export\s+)?interface\s+[A-Za-z_$]/.test(trimmed) ||
    /^(export\s+)?(abstract\s+)?class\s+[A-Za-z_$]/.test(trimmed) ||
    /^export\s+const\s+[A-Za-z_$]/.test(trimmed) ||
    /^import\s/.test(trimmed)
  );
}

function summarizeJS(content: string, mode: "full" | "semi"): string {
  const lines = content.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isFullSig =
      /^(export\s+)?(async\s+)?function\s+/.test(trimmed) ||
      /^(export\s+)?const\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?(let|var)\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?type\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?interface\s+[A-Za-z_$]/.test(trimmed) ||
      /^(export\s+)?(abstract\s+)?class\s+[A-Za-z_$]/.test(trimmed) ||
      /^import\s/.test(trimmed);

    if (mode === "full") {
      if (isFullSig)
        result.push(/^import\s/.test(trimmed) ? line : stripSignature(line));
    } else {
      if (isSemiSig(trimmed))
        result.push(/^import\s/.test(trimmed) ? line : stripSignature(line));
    }
  }
  return result.join("\n");
}

function summarizeCSS(content: string, mode: "full" | "semi"): string {
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
      if (mode === "full") {
        if (trimmed.endsWith("{") || trimmed.startsWith("@")) result.push(line);
      } else {
        if (trimmed.endsWith("{") || trimmed.startsWith("@"))
          result.push(trimmed.replace(/\s*{/, ""));
      }
    }
  }
  return result.join("\n");
}

function summarizeVue(content: string, mode: "full" | "semi"): string {
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const templateFirstLine = content.match(
    /<template[^>]*>\s*\n?\s*(<[^\n>]+>)/,
  );
  const result: string[] = [];
  if (templateFirstLine) result.push(`<template> ${templateFirstLine[1]}`);
  if (scriptMatch) {
    for (const line of scriptMatch[1].split("\n")) {
      const trimmed = line.trim();
      const check =
        mode === "semi"
          ? isSemiSig(trimmed)
          : /^(export\s+)?(async\s+)?function\s+/.test(trimmed) ||
            /^(export\s+)?const\s+[A-Za-z_$]/.test(trimmed) ||
            /^(export\s+)?type\s+[A-Za-z_$]/.test(trimmed) ||
            /^import\s/.test(trimmed);
      if (check)
        result.push(/^import\s/.test(trimmed) ? line : stripSignature(line));
    }
  }
  return result.join("\n");
}

function summarizePython(content: string, mode: "full" | "semi"): string {
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
    if (isSig) {
      if (mode === "semi") {
        result.push(trimmed.replace(/\(.*/, "").replace(/:$/, "").trim());
      } else {
        result.push(trimmed.replace(/\(.*/, "").replace(/:$/, "").trim());
      }
    }
  }
  return result.join("\n");
}

function summarizeSQL(content: string, mode: "full" | "semi"): string {
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
