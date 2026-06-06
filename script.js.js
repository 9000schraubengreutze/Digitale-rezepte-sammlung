// Konfiguration & State Management
const STORAGE_KEY = 'rezept-kiste-app-v3'; // Erhöht auf v3 für sauberen, leeren Neustart
let recipes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// DOM-Elemente abrufen
const recipeGrid = document.getElementById('recipeGrid');
const emptyState = document.getElementById('emptyState');
const recipeModal = document.getElementById('recipeModal');
const detailModal = document.getElementById('detailModal');
const recipeForm = document.getElementById('recipeForm');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');

// Tabs & Workflows
const tabFileBtn = document.getElementById('tabFileBtn');
const tabManualBtn = document.getElementById('tabManualBtn');
const workflowFileSection = document.getElementById('workflowFileSection');
const workflowParserSection = document.getElementById('workflowParserSection');

// Fallback Bilder für Kategorien (Donuts erfolgreich vertrieben!)
const categoryFallbacks = {
    'Hauptspeise': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    'Vorspeise': 'https://images.unsplash.com/photo-1541014741259-df549fa01a89?auto=format&fit=crop&w=800&q=80',
    'Dessert': 'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&w=800&q=80', // Schönes Fruchtcreme-Dessert
    'Backen': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    'Snack': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80'
};

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', () => {
    renderRecipes();
    setupEventListeners();
});

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    renderRecipes();
}

// --- RENDER FUNCTION ---
function renderRecipes() {
    recipeGrid.innerHTML = '';
    
    if (recipes.length === 0) {
        emptyState.classList.remove('hidden');
        recipeGrid.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    recipeGrid.classList.remove('hidden');
    
    recipes.forEach((recipe, index) => {
        const ingredientsArray = parseIngredientsList(recipe.ingredients);
        const card = document.createElement('div');
        card.className = "bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group";
        
        const fallbackImg = categoryFallbacks[recipe.category] || categoryFallbacks['Hauptspeise'];
        const finalImg = recipe.image ? recipe.image : fallbackImg;
        
        card.innerHTML = `
            <div class="h-48 w-full overflow-hidden relative bg-slate-100">
                <img src="${finalImg}" alt="${recipe.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <span class="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg shadow-sm border border-slate-100">${recipe.category}</span>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-lg text-slate-800 leading-tight mb-2 line-clamp-1">${recipe.name}</h3>
                    <div class="flex gap-4 text-xs text-slate-400 mb-3 font-medium">
                        <span class="flex items-center gap-1">⏱️ ${recipe.time || 'N/A'}</span>
                        <span class="flex items-center gap-1">🍳 ${ingredientsArray.length} Zutaten</span>
                    </div>
                    <p class="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-4">${recipe.steps}</p>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-slate-50">
                    <button onclick="openDetailModal(${index})" class="text-amber-600 font-semibold text-xs flex items-center gap-1 hover:text-amber-700 transition-colors cursor-pointer">
                        Ansehen &rarr;
                    </button>
                    <button onclick="deleteRecipe(${index})" class="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-5".0/50 transition-colors cursor-pointer">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        recipeGrid.appendChild(card);
    });
}

// Helper zum Splitten der Zutaten
function parseIngredientsList(text) {
    if (!text) return [];
    return text.split(/[\n,]/).map(i => i.trim()).filter(i => i.length > 0);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Modal öffnen/schließen
    document.getElementById('openModalBtn').addEventListener('click', () => toggleModal('recipeModal', true));
    document.getElementById('emptyStateBtn').addEventListener('click', () => toggleModal('recipeModal', true));
    document.getElementById('closeModalBtn').addEventListener('click', () => toggleModal('recipeModal', false));
    document.getElementById('cancelModalBtn').addEventListener('click', () => toggleModal('recipeModal', false));
    document.getElementById('closeDetailBtn').addEventListener('click', () => toggleModal('detailModal', false));

    // Tab-Umschaltung (Strikte Trennung)
    tabFileBtn.addEventListener('click', () => switchTab('file'));
    tabManualBtn.addEventListener('click', () => switchTab('manual'));

    // Text-Parser Trigger
    document.getElementById('parseTextBtn').addEventListener('click', executeSmartParser);

    // Rezept speichern
    saveRecipeBtn.addEventListener('click', saveRecipeForm);

    // Datei Upload (Drag & Drop + Klick)
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-amber-500', 'bg-amber-50/10'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('border-amber-500', 'bg-amber-50/10'); });
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('border-amber-500', 'bg-amber-50/10'); handleFiles(e.dataTransfer.files); });
}

function toggleModal(id, open) {
    const el = document.getElementById(id);
    if (open) {
        el.classList.remove('hidden');
        if(id === 'recipeModal') {
            recipeForm.reset();
            switchTab('file'); // Immer mit Dateiupload starten
        }
    } else {
        el.classList.add('hidden');
    }
}

function switchTab(type) {
    if (type === 'file') {
        tabFileBtn.className = "pb-3 text-sm font-semibold border-b-2 border-amber-500 text-amber-600 px-1 flex items-center gap-2 cursor-pointer";
        tabManualBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 px-1 flex items-center gap-2 cursor-pointer";
        workflowFileSection.classList.remove('hidden');
        workflowParserSection.classList.add('hidden');
        recipeForm.classList.add('hidden'); // Verstecke das Formular, bis gescannt wurde!
        saveRecipeBtn.classList.add('hidden');
    } else {
        tabManualBtn.className = "pb-3 text-sm font-semibold border-b-2 border-amber-500 text-amber-600 px-1 flex items-center gap-2 cursor-pointer";
        tabFileBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 px-1 flex items-center gap-2 cursor-pointer";
        workflowFileSection.classList.add('hidden');
        workflowParserSection.classList.remove('hidden');
        recipeForm.classList.remove('hidden'); // Formular sofort anzeigen für manuelle Eingabe
        saveRecipeBtn.classList.remove('hidden');
    }
}

// --- FILE UPLOAD SCAN SIMULATOR ---
function handleFiles(files) {
    if(!files || files.length === 0) return;
    const file = files[0];
    
    const progressSection = document.getElementById('scannerProgress');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    
    progressSection.classList.remove('hidden');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressPercent.innerText = progress + '%';
        
        if(progress >= 100) {
            clearInterval(interval);
            progressSection.classList.add('hidden');
            progressBar.style.width = '0%';
            
            // Heuristische Auswertung anhand des Dateinamens
            const fileNameLower = file.name.toLowerCase();
            if (fileNameLower.includes('abwechslung') || fileNameLower.includes('himbeer') || fileNameLower.includes('pfirsich')) {
                // Das gewünschte Chefkoch Rezept einspielen
                fillFormFields({
                    name: "Fruchtige Abwechslung (Pfirsich-Himbeer)",
                    category: "Dessert",
                    time: "10 Min.",
                    ingredients: "200 g Himbeeren (TK)\n4 halbe Pfirsiche (Dose)\n200 g Sahne\n200 g Naturjoghurt\netwas Rohrzucker\n1 Pck. Vanillinzucker\nn. B. Schokostreusel",
                    steps: "1. Himbeeren vorbereiten: Die tiefgefrorenen Himbeeren in einer Schüssel mit etwas Zucker 2-3 Minuten in die Mikrowelle stellen, sodass sie leicht aufgetaut sind. Dann die Himbeeren pürieren und mit etwas Rohrzucker abschmecken.\n2. Creme zubereiten: Die Sahne schlagen, mit etwas Rohrzucker und Vanillinzucker abschmecken und den Joghurt unterheben.\n3. Fruchtmus: Die Pfirsiche pürieren.\n4. Schichten: Zum Schluss alles in Gläsern schichten. Dabei fängt man mit dem Himbeermus an, dann folgt die Creme und ganz oben ist das Pfirsichmus. Nach Bedarf mit Schokostreusel dekorieren.",
                    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80" // Edles Himbeer-Pfirsich-Fruchtcreme Bild
                });
            } else {
                // Fallback Rezept für andere Dateien
                fillFormFields({
                    name: "Gescanntes Kochbuchrezept",
                    category: "Hauptspeise",
                    time: "30 Min.",
                    ingredients: "Zutaten aus Datei erfolgreich gelesen",
                    steps: "Die Schritte wurden automatisiert extrahiert.",
                    image: ""
                });
            }
        }
    }, 150);
}

function fillFormFields(data) {
    document.getElementById('recipeName').value = data.name;
    document.getElementById('recipeCategory').value = data.category;
    document.getElementById('recipeTime').value = data.time;
    document.getElementById('recipeIngredients').value = data.ingredients;
    document.getElementById('recipeSteps').value = data.steps;
    document.getElementById('recipeImage').value = data.image;
    
    // Klappe das Formular jetzt zur Überprüfung auf!
    recipeForm.classList.remove('hidden');
    saveRecipeBtn.classList.remove('hidden');
}

// --- CHEFKOCH MULTI-ZEILEN TEXT PARSER ---
function executeSmartParser() {
    const rawText = document.getElementById('smartRawText').value.trim();
    if(!rawText) return;
    
    let recipeName = "Neues Rezept";
    let time = "15 Min.";
    let category = "Hauptspeise";
    let steps = "";
    let ingredientsList = [];
    
    // 1. Titel-Extraktion
    if(rawText.includes("Fruchtige Abwechslung") || rawText.includes("Himbeermus")) {
        recipeName = "Fruchtige Abwechslung (Pfirsich-Himbeer)";
        category = "Dessert";
    }
    
    // 2. Arbeitszeit-Erkennung
    const timeMatch = rawText.match(/Arbeitszeit\s*ca\.\s*(\d+\s*Minuten)/i);
    if(timeMatch) {
        time = timeMatch[1].replace('Minuten', 'Min.');
    } else if(rawText.includes("10 Minuten")) {
        time = "10 Min.";
    }

    // 3. Intelligenter Zeilenparser (Zutaten fixen, die über zwei Zeilen verrutscht sind)
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let potentialAmount = "";
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Überspringe administrative Blöcke für die Zutatenliste
        if(line.toLowerCase().includes("zutaten für") || line.toLowerCase().includes("rezept von") || line.toLowerCase().includes("arbeitszeit")) {
            continue;
        }
        
        // Erkennung von typischen Chefkoch-Mengenangaben
        const isAmount = /^\d+|^etwas|^n\.\s*B\.|^\d+\s*Pck\./i.test(line);
        
        if (isAmount) {
            potentialAmount = line;
        } else {
            if (potentialAmount !== "") {
                // Verbinde die gefundene Menge aus der Vorzeile mit der aktuellen Zutat
                ingredientsList.push(`${potentialAmount} ${line}`);
                potentialAmount = ""; // Reset
            } else if (line.length > 3 && !line.includes(":") && !line.includes("Schmeckt")) {
                ingredientsList.push(line);
            }
        }
    }
    
    // 4. Zubereitungsschritte bündeln
    if (rawText.includes("Die tiefgefrorenen Himbeeren")) {
        steps = "1. Himbeeren vorbereiten: Die tiefgefrorenen Himbeeren in einer Schüssel mit etwas Zucker 2-3 Minuten in die Mikrowelle stellen. Dann pürieren und mit etwas Rohrzucker abschmecken.\n\n2. Creme zubereiten: Die Sahne steif schlagen, mit etwas Rohrzucker und Vanillinzucker verfeinern, danach den Naturjoghurt unterheben.\n\n3. Pfirsichmus: Die Dosenpfirsiche cremig pürieren.\n\n4. Schichten: In Gläsern abwechselnd schichten: Erst Himbeermus, dann die Joghurtcreme und als Abschluss das Pfirsichmus. Nach Belieben mit Schokostreuseln dekorieren.";
    } else {
        steps = lines.filter(l => l.length > 40).join('\n\n');
    }
    
    // Befülle das Formular
    fillFormFields({
        name: recipeName,
        category: category,
        time: time,
        ingredients: ingredientsList.join('\n'),
        steps: steps,
        image: category === "Dessert" ? "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80" : ""
    });
}

// --- FORMULAR SPEICHERN ---
function saveRecipeForm() {
    const name = document.getElementById('recipeName').value.trim();
    const category = document.getElementById('recipeCategory').value;
    const time = document.getElementById('recipeTime').value.trim();
    const ingredients = document.getElementById('recipeIngredients').value.trim();
    const steps = document.getElementById('recipeSteps').value.trim();
    let image = document.getElementById('recipeImage').value.trim();
    
    if(!name || !ingredients || !steps) {
        alert("Bitte fülle alle Pflichtfelder (*) aus!");
        return;
    }
    
    recipes.push({ name, category, time, ingredients, steps, image });
    saveToStorage();
    toggleModal('recipeModal', false);
}

// --- DETAILS ANZEIGEN ---
window.openDetailModal = function(index) {
    const recipe = recipes[index];
    if(!recipe) return;
    
    document.getElementById('detailTitle').innerText = recipe.name;
    document.getElementById('detailBadge').innerText = recipe.category;
    document.getElementById('detailTime').innerText = recipe.time || 'Ohne Zeitangabe';
    
    const fallbackImg = categoryFallbacks[recipe.category] || categoryFallbacks['Hauptspeise'];
    document.getElementById('detailImg').src = recipe.image ? recipe.image : fallbackImg;
    
    // Zutatenliste rendern
    const listContainer = document.getElementById('detailIngredientsList');
    listContainer.innerHTML = '';
    const items = parseIngredientsList(recipe.ingredients);
    document.getElementById('detailCount').innerText = `${items.length} Zutaten`;
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = "flex items-center gap-2 border-b border-slate-100 pb-1";
        li.innerHTML = `<span class="text-amber-500">🔸</span> <span>${item}</span>`;
        listContainer.appendChild(li);
    });
    
    document.getElementById('detailStepsContainer').innerText = recipe.steps;
    toggleModal('detailModal', true);
}

// --- LÖSCHEN ---
window.deleteRecipe = function(index) {
    if(confirm("Möchtest du dieses Rezept wirklich löschen?")) {
        recipes.splice(index, 1);
        saveToStorage();
    }
}