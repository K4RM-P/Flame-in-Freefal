"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".

import { useEffect, useState } from "react";
import authoredCopy from "@/data/interface-copy.json";
import { isTargetLanguage } from "@/lib/languages";
import { useLanguage } from "./Language";

const catalog = new Set(authoredCopy);
const attributes = ["aria-label", "alt", "placeholder", "title"];
const excluded = "script, style, pre, code, svg, math, canvas, [contenteditable], [translate=no], [data-no-translate]";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

type Entry = { read: () => string | null; write: (text: string) => void; original: string; translated: string };

export function PageTranslation() {
  const { language } = useLanguage();
  const [failedLanguage, setFailedLanguage] = useState("");
  useEffect(() => {
    if (!isTargetLanguage(language)) return;
    setFailedLanguage("");
    const controller = new AbortController();
    const cache = new Map<string, string>();
    const requested = new Set<string>();
    const changes = new Map<Node, Map<string, Entry>>();
    const storageKey = `ea.copy.v1.${language}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]") as [string, string][];
      for (const [source, value] of saved) if (catalog.has(source) && typeof value === "string") cache.set(source, value);
    } catch { /* Storage may be unavailable. */ }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    function scan() {
      const missing = new Set<string>();
      for (const node of changes.keys()) if (!node.isConnected) changes.delete(node);

      function inspect(node: Node, attribute: string, read: Entry["read"], write: Entry["write"]) {
        const current = read();
        if (!current) return;
        let entries = changes.get(node);
        const previous = entries?.get(attribute);
        if (previous?.translated === current) return;
        entries?.delete(attribute);
        const source = normalize(current);
        if (!catalog.has(source)) return;
        const value = cache.get(source);
        if (!value) {
          if (!requested.has(source)) missing.add(source);
          return;
        }
        const translated = current.replace(/\S[\s\S]*\S|\S/, () => value);
        if (translated === current) return;
        if (!entries) changes.set(node, entries = new Map());
        entries.set(attribute, { original: current, translated, read, write });
        write(translated);
      }

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (node instanceof Element && (node.matches(excluded) || (node.hasAttribute("lang") && node.getAttribute("lang") !== "en"))) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof Text) {
          const text = node;
          inspect(text, "", () => text.data, (value) => { text.data = value; });
        } else if (node instanceof Element) {
          const element = node;
          for (const attr of attributes) if (element.hasAttribute(attr)) inspect(element, attr, () => element.getAttribute(attr), (value) => element.setAttribute(attr, value));
        }
      }

      if (running || !missing.size) return;
      const batch: string[] = [];
      let size = 0;
      for (const source of missing) {
        size += source.length + 8;
        if (batch.length >= 55 || size > 4000) break;
        batch.push(source);
        requested.add(source);
      }
      running = true;
      void fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, strings: batch }),
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error("Translation unavailable");
        const { strings } = await response.json() as { strings: string[] };
        if (controller.signal.aborted) return;
        batch.forEach((source, index) => cache.set(source, strings[index]));
        try { sessionStorage.setItem(storageKey, JSON.stringify([...cache])); } catch { /* Continue in memory. */ }
      }).catch(() => {
        if (!controller.signal.aborted) {
          setFailedLanguage(language);
          // Avoid cycling through more requests after an upstream failure.
          for (const source of catalog) requested.add(source);
        }
      }).finally(() => {
        running = false;
        if (!controller.signal.aborted) schedule();
      });
    }

    function schedule() {
      if (timer !== undefined) return;
      timer = setTimeout(() => { timer = undefined; scan(); }, 90);
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: attributes });
    schedule();
    return () => {
      observer.disconnect();
      controller.abort();
      clearTimeout(timer);
      for (const entries of changes.values()) {
        for (const entry of entries.values()) if (entry.read() === entry.translated) entry.write(entry.original);
      }
    };
  }, [language]);

  return failedLanguage === language
    ? <p className="px-4 py-2 text-sm text-mute" role="status" data-no-translate>Some translations are unavailable. English text is shown where needed.</p>
    : null;
}
