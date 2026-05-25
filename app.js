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

  actions.append(openButton, favoriteButton);
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
  elements.scanPreview.textContent = "Noch kein neuer Scan ausgewaehlt.";

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
  recipes = recipes.filter((recipe) => recipe.id !== id);
  persistRecipes();
  render();
  closeRecipeDialog();
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

  if (file.type === "application/pdf") {
    currentScan = {
      scanData: "",
      scanType: file.type,
      scanName: file.name
    };
    renderScanPreview(currentScan);
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
  });
  reader.readAsDataURL(file);
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
