const STORAGE_KEY = "digitale-rezeptsammlung";

const starterRecipes = [
  {
    id: crypto.randomUUID(),
    title: "Apfelkuchen vom Blech",
    category: "Kuchen",
    time: "55 Min.",
    ingredients: "Äpfel, Mehl, Butter, Eier, Zucker, Zimt",
    notes: "Saftiger Blechkuchen mit Zimt. Gut vorzubereiten fuer Kaffee, Geburtstag oder Besuch.",
    favorite: true,
    scanName: "Beispielscan Apfelkuchen",
    scanData: "",
    scanType: ""
  },
  {
    id: crypto.randomUUID(),
    title: "Kartoffelsuppe",
    category: "Abendessen",
    time: "35 Min.",
    ingredients: "Kartoffeln, Moehren, Lauch, Bruehe, Sahne",
    notes: "Cremige Suppe fuer kalte Tage. Optional mit Wuerstchen oder geroestetem Brot servieren.",
    favorite: false,
    scanName: "Beispielscan Kartoffelsuppe",
    scanData: "",
    scanType: ""
  },
  {
    id: crypto.randomUUID(),
    title: "Quarkpfannkuchen",
    category: "Suessspeise",
    time: "25 Min.",
    ingredients: "Quark, Eier, Mehl, Milch, Vanillezucker",
    notes: "Schnelles Rezept fuer Fruehstueck oder Dessert. Passt zu Beeren, Apfelmus oder Zimt.",
    favorite: false,
    scanName: "Beispielscan Quarkpfannkuchen",
    scanData: "",
    scanType: ""
  }
];

let recipes = loadRecipes();
let activeView = "recipes";
let currentScan = null;
let currentScanFile = null;
let ocrBusy = false;

const elements = {
  recipeCount: document.querySelector("#recipeCount"),
  favoriteCount: document.querySelector("#favoriteCount"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  recipeGrid: document.querySelector("#recipeGrid"),
  favoriteGrid: document.querySelector("#favoriteGrid"),
  assistantGrid: document.querySelector("#assistantGrid"),
  emptyRecipes: document.querySelector("#emptyRecipes"),
  emptyFavorites: document.querySelector("#emptyFavorites"),
  dialog: document.querySelector("#recipeDialog"),
  form: document.querySelector("#recipeForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  deleteButton: document.querySelector("#deleteRecipeButton"),
  scanPreview: document.querySelector("#scanPreview"),
  ocrButton: document.querySelector("#ocrButton"),
  ocrStatus: document.querySelector("#ocrStatus"),
  chatLog: document.querySelector("#chatLog"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput")
};

const fields = {
  id: document.querySelector("#recipeId"),
  title: document.querySelector("#titleInput"),
  category: document.querySelector("#categoryInput"),
  time: document.querySelector("#timeInput"),
  ingredients: document.querySelector("#ingredientsInput"),
  notes: document.querySelector("#notesInput"),
  scan: document.querySelector("#scanInput")
};

document.querySelector("#newRecipeButton").addEventListener("click", () => openRecipeDialog());
document.querySelector("#closeDialog").addEventListener("click", closeRecipeDialog);
document.querySelector("#cancelRecipeButton").addEventListener("click", closeRecipeDialog);
document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

elements.searchInput.addEventListener("input", render);
elements.categoryFilter.addEventListener("change", render);
elements.form.addEventListener("submit", saveRecipe);
elements.deleteButton.addEventListener("click", deleteRecipe);
elements.chatForm.addEventListener("submit", handleAssistantSearch);
fields.scan.addEventListener("change", handleScanUpload);
elements.ocrButton.addEventListener("click", runOcrForCurrentScan);

render();
addAssistantMessage("assistant", "Ich kann deine gespeicherten Rezepte nach Zutaten, Kategorie, Anlass oder Dauer durchsuchen.");

function loadRecipes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return starterRecipes;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : starterRecipes;
  } catch {
    return starterRecipes;
  }
}

function persistRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function render() {
  elements.recipeCount.textContent = recipes.length;
  elements.favoriteCount.textContent = recipes.filter((recipe) => recipe.favorite).length;
  renderCategoryOptions();

  const allMatches = getVisibleRecipes(recipes);
  const favoriteMatches = getVisibleRecipes(recipes.filter((recipe) => recipe.favorite));

  renderRecipeGrid(elements.recipeGrid, allMatches);
  renderRecipeGrid(elements.favoriteGrid, favoriteMatches);

  elements.emptyRecipes.classList.toggle("hidden", allMatches.length > 0);
  elements.emptyFavorites.classList.toggle("hidden", favoriteMatches.length > 0);
}

function renderCategoryOptions() {
  const currentValue = elements.categoryFilter.value;
  const categories = [...new Set(recipes.map((recipe) => recipe.category).filter(Boolean))].sort();
  elements.categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.append(option);
  });

  elements.categoryFilter.value = categories.includes(currentValue) ? currentValue : "";
}

function getVisibleRecipes(source) {
  const query = normalize(elements.searchInput.value);
  const category = elements.categoryFilter.value;

  return source.filter((recipe) => {
    const matchesCategory = !category || recipe.category === category;
    const haystack = normalize(`${recipe.title} ${recipe.category} ${recipe.time} ${recipe.ingredients} ${recipe.notes}`);
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderRecipeGrid(container, list) {
  container.innerHTML = "";
  list.forEach((recipe) => container.append(createRecipeCard(recipe)));
}

function createRecipeCard(recipe) {
  const card = document.createElement("article");
  card.className = "recipe-card";

  const thumb = document.createElement("div");
  thumb.className = `scan-thumb ${recipe.scanType === "application/pdf" ? "pdf" : ""}`;

  if (recipe.scanData && recipe.scanType?.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = recipe.scanData;
    image.alt = `Scan von ${recipe.title}`;
    thumb.append(image);
  } else {
    thumb.textContent = recipe.scanType === "application/pdf" ? "PDF-Scan" : "Rezeptscan";
  }

  const body = document.createElement("div");
  body.className = "recipe-card-body";
  body.innerHTML = `
    <h3>${escapeHtml(recipe.title)}</h3>
    <div class="card-meta">
      ${recipe.category ? `<span class="chip">${escapeHtml(recipe.category)}</span>` : ""}
      ${recipe.time ? `<span>${escapeHtml(recipe.time)}</span>` : ""}
    </div>
    <p class="card-meta">${escapeHtml(shorten(recipe.ingredients || recipe.notes || "Kein Suchtext erfasst.", 96))}</p>
  `;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "Öffnen";
  openButton.addEventListener("click", () => openRecipeDialog(recipe));

  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = "favorite";
  favoriteButton.textContent = recipe.favorite ? "★ Favorit" : "☆ Merken";
  favoriteButton.addEventListener("click", () => toggleFavorite(recipe.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-card";
  deleteButton.textContent = "LÃ¶schen";
  deleteButton.addEventListener("click", () => deleteRecipeById(recipe.id, recipe.title));

  actions.append(openButton, favoriteButton, deleteButton);
  body.append(actions);
  card.append(thumb, body);
  return card;
}

function switchView(viewName) {
  activeView = viewName;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewName}View`).classList.add("active");
}

function openRecipeDialog(recipe = null) {
  elements.form.reset();
  currentScan = null;
  currentScanFile = null;
  elements.scanPreview.textContent = "Noch kein neuer Scan ausgewaehlt.";
  updateOcrStatus("Lade ein Foto oder PDF hoch, dann kann die App die Felder automatisch vorfuellen.", false);

  if (recipe) {
    elements.dialogTitle.textContent = "Rezept bearbeiten";
    fields.id.value = recipe.id;
    fields.title.value = recipe.title;
    fields.category.value = recipe.category || "";
    fields.time.value = recipe.time || "";
    fields.ingredients.value = recipe.ingredients || "";
    fields.notes.value = recipe.notes || "";
    currentScan = {
      scanData: recipe.scanData,
      scanType: recipe.scanType,
      scanName: recipe.scanName
    };
    updateOcrStatus("OCR kann nur fuer neu ausgewaehlte Dateien gestartet werden.", false);
    renderScanPreview(currentScan);
    elements.deleteButton.classList.remove("hidden");
  } else {
    elements.dialogTitle.textContent = "Rezept hinzufügen";
    fields.id.value = "";
    elements.deleteButton.classList.add("hidden");
  }

  elements.dialog.showModal();
}

function closeRecipeDialog() {
  elements.dialog.close();
}

function saveRecipe(event) {
  event.preventDefault();

  const id = fields.id.value || crypto.randomUUID();
  const existing = recipes.find((recipe) => recipe.id === id);
  const nextRecipe = {
    id,
    title: fields.title.value.trim(),
    category: fields.category.value.trim(),
    time: fields.time.value.trim(),
    ingredients: fields.ingredients.value.trim(),
    notes: fields.notes.value.trim(),
    favorite: existing?.favorite || false,
    scanData: currentScan?.scanData || "",
    scanType: currentScan?.scanType || "",
    scanName: currentScan?.scanName || ""
  };

  if (existing) {
    recipes = recipes.map((recipe) => (recipe.id === id ? nextRecipe : recipe));
  } else {
    recipes = [nextRecipe, ...recipes];
  }

  persistRecipes();
  render();
  closeRecipeDialog();
}

function deleteRecipe() {
  const id = fields.id.value;
  if (!id) return;
  const title = fields.title.value.trim() || "dieses Rezept";
  if (!confirm(`Moechtest du "${title}" wirklich loeschen?`)) return;
  deleteRecipeById(id);
  closeRecipeDialog();
}

function deleteRecipeById(id, title = "") {
  if (title && !confirm(`Moechtest du "${title}" wirklich loeschen?`)) return;
  recipes = recipes.filter((recipe) => recipe.id !== id);
  persistRecipes();
  render();
}

function toggleFavorite(id) {
  recipes = recipes.map((recipe) => (
    recipe.id === id ? { ...recipe, favorite: !recipe.favorite } : recipe
  ));
  persistRecipes();
  render();
}

function handleScanUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  currentScanFile = file;
  updateOcrStatus("Datei geladen. Texterkennung startet gleich automatisch...", true);

  if (file.type === "application/pdf") {
    currentScan = {
      scanData: "",
      scanType: file.type,
      scanName: file.name
    };
    renderScanPreview(currentScan);
    runOcrForCurrentScan();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    currentScan = {
      scanData: reader.result,
      scanType: file.type,
      scanName: file.name
    };
    renderScanPreview(currentScan);
    runOcrForCurrentScan();
  });
  reader.readAsDataURL(file);
}

async function runOcrForCurrentScan() {
  if (!currentScanFile || ocrBusy) return;

  if (!window.Tesseract) {
    updateOcrStatus("OCR konnte nicht geladen werden. Pruefe deine Internetverbindung und lade die Seite neu.", true);
    return;
  }

  ocrBusy = true;
  elements.ocrButton.disabled = true;
  updateOcrStatus("Texterkennung laeuft. Das kann bei PDFs ein bis zwei Minuten dauern...", true);

  try {
    const text = currentScanFile.type === "application/pdf"
      ? await extractTextFromPdfScan(currentScanFile)
      : await extractTextFromImage(currentScan.scanData);

    const cleanText = cleanupOcrText(text);
    if (!cleanText) {
      updateOcrStatus("Ich konnte keinen lesbaren Text erkennen. Ein schaerferer Scan oder mehr Kontrast hilft meistens.", false);
      return;
    }

    applyOcrText(cleanText);
    updateOcrStatus("Text erkannt und Felder vorgefuellt. Bitte kurz kontrollieren, OCR kann sich bei alten Scans verlesen.", false);
  } catch (error) {
    console.error(error);
    updateOcrStatus("Texterkennung fehlgeschlagen. Du kannst die Felder weiter manuell ausfuellen oder es erneut versuchen.", false);
  } finally {
    ocrBusy = false;
    elements.ocrButton.disabled = !currentScanFile;
  }
}

async function extractTextFromImage(imageData) {
  const result = await Tesseract.recognize(imageData, "deu+eng", {
    logger: (event) => {
      if (event.status === "recognizing text") {
        updateOcrStatus(`Texterkennung Bild: ${Math.round(event.progress * 100)}%`, true);
      }
    }
  });
  return result.data.text;
}

async function extractTextFromPdfScan(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

  const documentData = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: documentData }).promise;
  const pageCount = Math.min(pdf.numPages, 3);
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    updateOcrStatus(`PDF-Seite ${pageNumber} von ${pageCount} wird vorbereitet...`, true);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.1 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const result = await Tesseract.recognize(canvas.toDataURL("image/png"), "deu+eng", {
      logger: (event) => {
        if (event.status === "recognizing text") {
          updateOcrStatus(`PDF-Seite ${pageNumber}: ${Math.round(event.progress * 100)}%`, true);
        }
      }
    });
    pageTexts.push(result.data.text);
  }

  return pageTexts.join("\n\n");
}

function applyOcrText(text) {
  const extracted = extractRecipeFields(text);

  if (!fields.title.value.trim() && extracted.title) fields.title.value = extracted.title;
  if (!fields.ingredients.value.trim() && extracted.ingredients) fields.ingredients.value = extracted.ingredients;
  if (!fields.notes.value.trim() && extracted.instructions) fields.notes.value = extracted.instructions;
  if (!fields.time.value.trim() && extracted.time) fields.time.value = extracted.time;
  if (!fields.category.value.trim() && extracted.category) fields.category.value = extracted.category;
}

function extractRecipeFields(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const title = lines.find((line) => (
    line.length >= 4 &&
    line.length <= 70 &&
    !/^zutaten|^zubereitung|^arbeitszeit|^backzeit|^kochzeit|^\d+/.test(normalize(line))
  )) || "";

  const ingredients = extractIngredientLines(lines);
  const instructions = extractInstructionLines(lines);
  const timeMatch = text.match(/(\d{1,3})\s*(min\.?|minute[n]?|std\.?|stunde[n]?)/i);
  const category = guessCategory(`${title} ${text}`);

  return {
    title,
    ingredients: ingredients.join("\n"),
    instructions: instructions.join("\n"),
    time: timeMatch ? timeMatch[0].replace(/\s+/g, " ") : "",
    category
  };
}

function extractIngredientLines(lines) {
  const ingredientStart = lines.findIndex((line) => /zutaten|einkaufsliste/i.test(line));
  const stopPattern = /zubereitung|anleitung|zubereiten|backen|kochen|arbeitszeit|naehrwerte|notizen|tipp/i;
  const amountPattern = /^(\d+|[¼½¾⅓⅔]|\d+[.,]\d+)\s*(g|kg|ml|l|el|tl|prise|stueck|stk\.?|bund|dose|packung|becher|tasse)?\b/i;

  const source = ingredientStart >= 0 ? lines.slice(ingredientStart + 1) : lines;
  const ingredients = [];

  for (const line of source) {
    if (stopPattern.test(line) && ingredients.length > 0) break;
    const cleaned = cleanupRecipeLine(line);
    if (isNoiseLine(cleaned)) continue;
    if (amountPattern.test(cleaned) || looksLikeIngredient(cleaned) || /^[*-]\s+/.test(cleaned)) {
      ingredients.push(cleaned.replace(/^[*-]\s+/, ""));
    }
    if (ingredients.length >= 18) break;
  }

  return uniqueLines(ingredients);
}

function extractInstructionLines(lines) {
  const instructionStart = lines.findIndex((line) => /zubereitung|anleitung|zubereiten|ubereitung/i.test(line));
  const ingredientStart = lines.findIndex((line) => /zutaten|einkaufsliste/i.test(line));
  const stopPattern = /naehrwerte|notizen|tipp|varianten|quelle|impressum|www\.|http/i;
  const numberedStepPattern = /^(\d+[\).:-]|\d+\s)\s*/;

  let source = lines;
  if (instructionStart >= 0) {
    source = lines.slice(instructionStart + 1);
  } else if (ingredientStart >= 0) {
    source = lines.slice(ingredientStart + 1);
  }

  const steps = [];
  for (const line of source) {
    const cleaned = cleanupRecipeLine(line);
    if (isNoiseLine(cleaned)) continue;
    if (stopPattern.test(cleaned) && steps.length > 0) break;
    if (looksLikeIngredient(cleaned)) continue;
    if (cleaned.length < 12) continue;

    const sentenceLike = /[.!?:]$/.test(cleaned) || /geben|mischen|ruehren|verruehren|schneiden|kochen|backen|braten|ziehen|wuerzen|servieren|heizen|formen|kneten|lassen/i.test(cleaned);
    if (sentenceLike || numberedStepPattern.test(cleaned)) {
      steps.push(cleaned.replace(numberedStepPattern, ""));
    }
    if (steps.length >= 10) break;
  }

  return uniqueLines(steps);
}

function looksLikeIngredient(line) {
  return /^(\d+|\d+[.,]\d+|1\/2|1\/3|2\/3|1\/4|3\/4)\s*(g|kg|mg|ml|l|el|tl|prise|prisen|stueck|stk\.?|bund|dose|dosen|packung|paeckchen|becher|tasse|tassen|scheibe|scheiben)?\b/i.test(line);
}

function cleanupRecipeLine(line) {
  return String(line || "")
    .replace(/[|_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line) {
  return !line ||
    line.length < 2 ||
    /^(seite|page)\s+\d+/i.test(line) ||
    /^(foto|bild|scan|copyright|quelle)\b/i.test(line) ||
    /www\.|https?:\/\//i.test(line);
}

function uniqueLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = normalize(line);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function guessCategory(text) {
  const value = normalize(text);
  if (/kuchen|torte|muffin|plaetzchen|dessert|suess|quark|creme/.test(value)) return "Suessspeise";
  if (/suppe|eintopf|bruehe/.test(value)) return "Suppe";
  if (/salat|vinaigrette|dressing/.test(value)) return "Salat";
  if (/pasta|nudel|spaghetti|lasagne/.test(value)) return "Pasta";
  if (/brot|broetchen|hefeteig/.test(value)) return "Backen";
  if (/kartoffel|auflauf|pfanne|reis|gemuese|fleisch|fisch/.test(value)) return "Abendessen";
  return "";
}

function cleanupOcrText(text) {
  return String(text || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function updateOcrStatus(message, isActive) {
  elements.ocrStatus.textContent = message;
  elements.ocrStatus.classList.toggle("active", isActive);
  elements.ocrButton.disabled = isActive || !currentScanFile;
}

function renderScanPreview(scan) {
  elements.scanPreview.innerHTML = "";

  if (!scan?.scanData && scan?.scanType !== "application/pdf") {
    elements.scanPreview.textContent = "Kein Scan gespeichert.";
    return;
  }

  if (scan.scanType === "application/pdf") {
    elements.scanPreview.textContent = `${scan.scanName || "PDF"} gespeichert.`;
    return;
  }

  const image = document.createElement("img");
  image.src = scan.scanData;
  image.alt = scan.scanName || "Rezeptscan";
  elements.scanPreview.append(image);
}

function handleAssistantSearch(event) {
  event.preventDefault();
  const question = elements.chatInput.value.trim();
  if (!question) return;

  addAssistantMessage("user", question);
  elements.chatInput.value = "";

  const matches = rankRecipes(question).slice(0, 4);
  renderRecipeGrid(elements.assistantGrid, matches);

  if (matches.length === 0) {
    addAssistantMessage("assistant", "Ich habe dazu kein gespeichertes Rezept gefunden. Ergaenze beim Scan Zutaten oder Rezepttext, dann kann ich besser suchen.");
    return;
  }

  const titles = matches.map((recipe) => recipe.title).join(", ");
  addAssistantMessage("assistant", `Ich wuerde diese Rezepte pruefen: ${titles}. Die Treffer basieren auf Titel, Zutaten, Kategorie, Dauer und Notizen.`);
  switchView("assistant");
}

function rankRecipes(question) {
  const terms = normalize(question)
    .split(/\s+/)
    .filter((term) => term.length > 2);

  return recipes
    .map((recipe) => {
      const title = normalize(recipe.title);
      const category = normalize(recipe.category || "");
      const fullText = normalize(`${recipe.title} ${recipe.category} ${recipe.time} ${recipe.ingredients} ${recipe.notes}`);
      const score = terms.reduce((total, term) => {
        if (title.includes(term)) return total + 5;
        if (category.includes(term)) return total + 3;
        if (fullText.includes(term)) return total + 2;
        return total;
      }, recipe.favorite ? 1 : 0);
      return { recipe, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.recipe);
}

function addAssistantMessage(role, message) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${role}`;
  bubble.innerHTML = `<p>${escapeHtml(message)}</p><small>${role === "user" ? "Du" : "Assistent"}</small>`;
  elements.chatLog.append(bubble);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shorten(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
