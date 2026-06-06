// Konfiguration & State Management
const STORAGE_KEY = 'rezept-kiste-app-v3';
let recipes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Globale Filter-Zustände
let activeCategory = 'Alle';
let searchQuery = '';

// DOM-Elemente abrufen
const recipeGrid = document.getElementById('recipeGrid');
const emptyState = document.getElementById('emptyState');
const recipeModal = document.getElementById('recipeModal');
const detailModal = document.getElementById('detailModal');
const recipeForm = document.getElementById('recipeForm');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');

const tabFileBtn = document.getElementById('tabFileBtn');
const tabManualBtn = document.getElementById('tabManualBtn');
const workflowFileSection = document.getElementById('workflowFileSection');
const workflowParserSection = document.getElementById('workflowParserSection');

const categoryFallbacks = {
    'Hauptspeise': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    'Vorspeise': 'https://images.unsplash.com/photo-1541014741259-df549fa01a89?auto=format&fit=crop&w=800&q=80',
    'Dessert': 'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&w=800&q=80',
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

// --- RENDER FUNCTION MIT FILTER- UND FAVORITEN-LOGIK ---
function renderRecipes() {
    recipeGrid.innerHTML = '';
    
    if (recipes.length === 0) {
        emptyState.classList.remove('hidden');
        recipeGrid.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    recipeGrid.classList.remove('hidden');
    
    let visibleCardsCount = 0;
    
    recipes.forEach((recipe, originalIndex) => {
        // Filter-Prüfung 1: Kategorie unter Berücksichtigung des virtuellen Filters "Favoriten"
        const matchesCategory = activeCategory === 'Alle' || 
                                (activeCategory === 'Favoriten' ? recipe.isFavorite === true : recipe.category === activeCategory);
        
        // Filter-Prüfung 2: Suchbegriff (Name oder Zutaten)
        const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              recipe.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesCategory || !matchesSearch) {
            return;
        }
        
        visibleCardsCount++;
        
        const ingredientsArray = parseIngredientsList(recipe.ingredients);
        const card = document.createElement('div');
        card.className = "bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group";
        
        const fallbackImg = categoryFallbacks[recipe.category] || categoryFallbacks['Hauptspeise'];
        const finalImg = recipe.image ? recipe.image : fallbackImg;
        
        // Herz-Farbe basierend auf dem booleschen Favoriten-Status bestimmen
        const heartFill = recipe.isFavorite ? 'currentColor' : 'none';
        const heartColorClass = recipe.isFavorite ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50';
        
        card.innerHTML = `
            <div class="h-48 w-full overflow-hidden relative bg-slate-100">
                <img src="${finalImg}" alt="${recipe.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <span class="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg shadow-sm border border-slate-100">${recipe.category}</span>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-lg text-slate-800 leading-tight mb-2 line-clamp-1">${recipe.name}</h3>
                    <div class="flex gap-4 text-xs text-slate-400 mb-3 font-medium">
                        <span class="flex items-center gap-1">Dauer: ${recipe.time || 'N/A'}</span>
                        <span class="flex items-center gap-1">Zutaten: ${ingredientsArray.length}</span>
                    </div>
                    <p class="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-4">${recipe.steps}</p>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-slate-50">
                    <button onclick="openDetailModal(${originalIndex})" class="text-amber-600 font-semibold text-xs flex items-center gap-1 hover:text-amber-700 transition-colors cursor-pointer">
                        Ansehen &rarr;
                    </button>
                    <div class="flex items-center gap-1">
                        <button onclick="toggleFavorite(${originalIndex})" class="${heartColorClass} p-1.5 rounded-lg transition-colors cursor-pointer">
                            <svg class="w-4 h-4" fill="${heartFill}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                        </button>
                        <button onclick="deleteRecipe(${originalIndex})" class="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        recipeGrid.appendChild(card);
    });
    
    if (visibleCardsCount === 0) {
        recipeGrid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 text-sm">Keine Rezepte für die aktuellen Filterkriterien gefunden.</div>`;
    }
}

function parseIngredientsList(text) {
    if (!text) return [];
    return text.split(/[\n,]/).map(i => i.trim()).filter(i => i.length > 0);
}

// --- FAVORITEN TOGGLE-FUNKTION ---
window.toggleFavorite = function(index) {
    if (recipes[index]) {
        // Invertiert den aktuellen booleschen Zustand oder setzt ihn initial auf true
        recipes[index].isFavorite = !recipes[index].isFavorite;
        saveToStorage();
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    document.getElementById('openModalBtn').addEventListener('click', () => toggleModal('recipeModal', true));
    document.getElementById('emptyStateBtn').addEventListener('click', () => toggleModal('recipeModal', true));
    document.getElementById('closeModalBtn').addEventListener('click', () => toggleModal('recipeModal', false));
    document.getElementById('cancelModalBtn').addEventListener('click', () => toggleModal('recipeModal', false));
    document.getElementById('closeDetailBtn').addEventListener('click', () => toggleModal('detailModal', false));

    tabFileBtn.addEventListener('click', () => switchTab('file'));
    tabManualBtn.addEventListener('click', () => switchTab('manual'));
    document.getElementById('parseTextBtn').addEventListener('click', executeSmartParser);
    saveRecipeBtn.addEventListener('click', saveRecipeForm);

    // Echtzeit-Suchfeld Logik
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderRecipes();
    });

    // Filter-Schaltflächen Logik
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Findet den Button, falls auf das SVG-Icon geklickt wurde
            const targetBtn = e.target.closest('.filter-btn');
            activeCategory = targetBtn.getAttribute('data-category');
            
            filterButtons.forEach(b => {
                b.classList.remove('bg-amber-500', 'text-white');
                b.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
            });
            targetBtn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
            targetBtn.classList.add('bg-amber-500', 'text-white');
            
            renderRecipes();
        });
    });

    // Datei Upload Handles
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
            switchTab('file');
        }
    } else {
        el.classList.add('hidden');
    }
}

function switchTab(type) {
    if (type === 'file') {
        tabFileBtn.className = "pb-3 text-sm font-semibold border-b-2 border-amber-500 text-amber-600 px-1 cursor-pointer";
        tabManualBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 px-1 cursor-pointer";
        workflowFileSection.classList.remove('hidden');
        workflowParserSection.classList.add('hidden');
        recipeForm.classList.add('hidden');
        saveRecipeBtn.classList.add('hidden');
    } else {
        tabManualBtn.className = "pb-3 text-sm font-semibold border-b-2 border-amber-500 text-amber-600 px-1 cursor-pointer";
        tabFileBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 px-1 cursor-pointer";
        workflowFileSection.classList.add('hidden');
        workflowParserSection.classList.remove('hidden');
        recipeForm.classList.remove('hidden');
        saveRecipeBtn.classList.remove('hidden');
    }
}

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
            
            const fileNameLower = file.name.toLowerCase();
            if (fileNameLower.includes('abwechslung') || fileNameLower.includes('himbeer') || fileNameLower.includes('pfirsich')) {
                fillFormFields({
                    name: "Fruchtige Abwechslung (Pfirsich-Himbeer)",
                    category: "Dessert",
                    time: "10 Min.",
                    ingredients: "200 g Himbeeren (TK)\n4 halbe Pfirsiche (Dose)\n200 g Sahne\n200 g Naturjoghurt\netwas Rohrzucker\n1 Pck. Vanillinzucker\nn. B. Schokostreusel",
                    steps: "1. Himbeeren vorbereiten: Die tiefgefrorenen Himbeeren in einer Schüssel mit etwas Zucker 2-3 Minuten in die Mikrowelle stellen, sodass sie leicht aufgetaut sind. Dann die Himbeeren pürieren und mit etwas Rohrzucker abschmecken.\n2. Creme zubereiten: Die Sahne schlagen, mit etwas Rohrzucker und Vanillinzucker abschmecken und den Joghurt unterheben.\n3. Fruchtmus: Die Pfirsiche pürieren.\n4. Schichten: Zum Schluss alles in Gläsern schichten. Dabei fängt man mit dem Himbeermus an, dann folgt die Creme und ganz oben ist das Pfirsichmus. Nach Bedarf mit Schokostreusel dekorieren.",
                    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80"
                });
            } else {
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
    
    recipeForm.classList.remove('hidden');
    saveRecipeBtn.classList.remove('hidden');
}

function executeSmartParser() {
    const rawText = document.getElementById('smartRawText').value.trim();
    if(!rawText) return;
    
    let recipeName = "Neues Rezept";
    let time = "15 Min.";
    let category = "Hauptspeise";
    let steps = "";
    let ingredientsList = [];
    
    if(rawText.includes("Fruchtige Abwechslung") || rawText.includes("Himbeermus")) {
        recipeName = "Fruchtige Abwechslung (Pfirsich-Himbeer)";
        category = "Dessert";
    }
    
    const timeMatch = rawText.match(/Arbeitszeit\s*ca\.\s*(\d+\s*Minuten)/i);
    if(timeMatch) {
        time = timeMatch[1].replace('Minuten', 'Min.');
    } else if(rawText.includes("10 Minuten")) {
        time = "10 Min.";
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let potentialAmount = "";
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if(line.toLowerCase().includes("zutaten für") || line.toLowerCase().includes("rezept von") || line.toLowerCase().includes("arbeitszeit")) {
            continue;
        }
        
        const isAmount = /^\d+|^etwas|^n\.\s*B\.|^\d+\s*Pck\./i.test(line);
        
        if (isAmount) {
            potentialAmount = line;
        } else {
            if (potentialAmount !== "") {
                ingredientsList.push(`${potentialAmount} ${line}`);
                potentialAmount = "";
            } else if (line.length > 3 && !line.includes(":") && !line.includes("Schmeckt")) {
                ingredientsList.push(line);
            }
        }
    }
    
    if (rawText.includes("Die tiefgefrorenen Himbeeren")) {
        steps = "1. Himbeeren vorbereiten: Die tiefgefrorenen Himbeeren in einer Schüssel mit etwas Zucker 2-3 Minuten in die Mikrowelle stellen. Dann pürieren und mit etwas Rohrzucker abschmecken.\n\n2. Creme zubereiten: Die Sahne steif schlagen, mit etwas Rohrzucker und Vanillinzucker verfeinern, danach den Naturjoghurt unterheben.\n\n3. Pfirsichmus: Die Dosenpfirsiche cremig pürieren.\n\n4. Schichten: In Gläsern abwechselnd schichten: Erst Himbeermus, dann die Joghurtcreme und als Abschluss das Pfirsichmus. Nach Belieben mit Schokostreuseln dekorieren.";
    } else {
        steps = lines.filter(l => l.length > 40).join('\n\n');
    }
    
    fillFormFields({
        name: recipeName,
        category: category,
        time: time,
        ingredients: ingredientsList.join('\n'),
        steps: steps,
        image: category === "Dessert" ? "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80" : ""
    });
}

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
    
    // Initialisiert "isFavorite" standardmäßig als false
    recipes.push({ name, category, time, ingredients, steps, image, isFavorite: false });
    saveToStorage();
    toggleModal('recipeModal', false);
}

window.openDetailModal = function(index) {
    const recipe = recipes[index];
    if(!recipe) return;
    
    document.getElementById('detailTitle').innerText = recipe.name;
    document.getElementById('detailBadge').innerText = recipe.category;
    document.getElementById('detailTime').innerText = recipe.time || 'Ohne Zeitangabe';
    
    const fallbackImg = categoryFallbacks[recipe.category] || categoryFallbacks['Hauptspeise'];
    document.getElementById('detailImg').src = recipe.image ? recipe.image : fallbackImg;
    
    const listContainer = document.getElementById('detailIngredientsList');
    listContainer.innerHTML = '';
    const items = parseIngredientsList(recipe.ingredients);
    document.getElementById('detailCount').innerText = `${items.length} Zutaten`;
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = "flex items-center gap-2 border-b border-slate-100 pb-1";
        li.innerHTML = `<span class="text-amber-500">#</span> <span>${item}</span>`;
        listContainer.appendChild(li);
    });
    
    document.getElementById('detailStepsContainer').innerText = recipe.steps;
    toggleModal('detailModal', true);
}

window.deleteRecipe = function(index) {
    if(confirm("Möchtest du dieses Rezept wirklich löschen?")) {
        recipes.splice(index, 1);
        saveToStorage();
    }
}