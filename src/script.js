// VARIABLES GLOBALES PARA FAVORITOS
let favorites = new Set(JSON.parse(localStorage.getItem('ff_favorites')) || []);
let showOnlyFavorites = false;

// Fetch data from multiple JSON files concurrently using Promise.all
Promise.all([
  fetch("assets/cdn.json").then((res) => res.json()),
  fetch(
    "https://raw.githubusercontent.com/0xme/ff-resources/refs/heads/main/pngs/300x300/list.json",
  ).then((res) => res.json()),
  fetch("assets/itemData.json").then((res) => res.json()),
])
  .then(([cdnData, pngsData, itemDatar]) => {
    // Assign the fetched data to global variables for further use
    cdn_img_json = cdnData.reduce((map, obj) => Object.assign(map, obj), {});
    pngs_json_list = pngsData;
    itemData = itemDatar;

    handleDisplayBasedOnURL();
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });

// FUNCIÓN PARA GUARDAR FAVORITOS
function toggleFavorite(id, btnElement) {
    const strId = String(id);
    
    if (favorites.has(strId)) {
        favorites.delete(strId);
        btnElement.innerHTML = '🤍';
    } else {
        favorites.add(strId);
        btnElement.innerHTML = '❤️';
    }
    
    localStorage.setItem('ff_favorites', JSON.stringify([...favorites]));
    
    // Si estamos en modo "Solo favoritos", refrescar la página actual para remover el item
    if (showOnlyFavorites) {
         // Usamos el valor actual del input de búsqueda
         const currentSearch = document.getElementById("search-input").value;
         displayPage(1, currentSearch, current_data);
    }
}

async function displayPage(pageNumber, searchTerm, webps) {
  current_data = webps;
  
  // --- FILTRADO POR FAVORITOS ---
  let displaySource = webps;
  if (showOnlyFavorites) {
      displaySource = webps.filter(item => favorites.has(String(item.itemID)));
  }
  // ------------------------------

  let filteredItems;
  if (!searchTerm.trim()) {
    filteredItems = displaySource;
  } else {
    filteredItems = filterItemsBySearch(displaySource, searchTerm);
  }
  
  const startIdx = (pageNumber - 1) * itemID.config.perPageLimitItem;
  const endIdx = Math.min(
    startIdx + itemID.config.perPageLimitItem,
    filteredItems.length,
  );
  
  const webpGallery = document.getElementById("webpGallery");
  const fragment = document.createDocumentFragment(); 
  webpGallery.innerHTML = ""; 

  // Mensaje si no hay favoritos
  if(showOnlyFavorites && filteredItems.length === 0) {
      webpGallery.innerHTML = "<p class='ibm-plex-mono-regular' style='color:var(--secondary); width:100%; text-align:center; padding: 20px;'>No favorites added yet!</p>";
  }

  for (let i = startIdx; i < endIdx; i++) {
    const item = filteredItems[i];

    let imgSrc = `https://raw.githubusercontent.com/0xme/ff-resources/refs/heads/main/pngs/300x300/UI_EPFP_unknown.png`;
    if (pngs_json_list?.includes(item.icon + ".png")) {
      imgSrc = `https://raw.githubusercontent.com/0xme/ff-resources/refs/heads/main/pngs/300x300/${item.icon}.png`;
    } else {
      const value = cdn_img_json[item.itemID.toString()] ?? null;
      if (value) {
        imgSrc = value;
      }
    }
    
    const figure = document.createElement("figure");
    // Agregamos 'figure-container' para el CSS
    figure.className =
      "figure-container bg-center bg-no-repeat [background-size:120%] image p-3 bounce-click border border-[var(--border-color)]";
    figure.setAttribute(
      "aria-label",
      `${item.description}, ${item.Rare} ${item.itemType}`,
    );
    const fileName = bgMap[item.Rare] || "UI_GachaLimit_QualitySlotBg2_01.png";
    figure.style.backgroundImage = `url('https://raw.githubusercontent.com/0xme/ff-resources/main/pngs/300x300/${fileName}')`;

    // --- BOTÓN DE CORAZÓN ---
    const heartBtn = document.createElement("button");
    heartBtn.className = "fav-btn";
    heartBtn.innerHTML = favorites.has(String(item.itemID)) ? '❤️' : '🤍';
    heartBtn.onclick = (e) => {
        e.stopPropagation(); // Evita abrir el modal al dar like
        toggleFavorite(item.itemID, heartBtn);
    };
    figure.appendChild(heartBtn);
    // ------------------------

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = imgSrc;
    img.setAttribute("crossorigin", "anonymous");

    figure.addEventListener("click", () => {
      displayItemInfo(item, imgSrc, img, (isTrashMode = false));
    });

    figure.appendChild(img);
    fragment.appendChild(figure);
  }

  webpGallery.appendChild(fragment); 
  let totalPages = Math.ceil(
    filteredItems.length / itemID.config.perPageLimitItem,
  );
  
  // Importante: pasar filteredItems a la paginación para que coincida con lo que se ve
  renderPagination(searchTerm, filteredItems, (isTrashMode = false), totalPages); 
  updateUrl(); 
}

/**
 * Main initialization script that runs after DOM content is fully loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  initializeInterfaceEdgeBtn();

  const searchInput = document.getElementById("search-input");
  const lensButton = document.getElementById("google-lens-btn");
  const clearButton = document.getElementById("clear_btn");
  const searchContainer = document.getElementById("input_search_bg");

  // --- LOGICA BOTÓN FAVORITOS ---
  const favBtn = document.getElementById("FavItem_btn");
  if(favBtn) {
      favBtn.addEventListener("click", () => {
          showOnlyFavorites = !showOnlyFavorites;
          
          // Estilo visual del botón activo
          if(showOnlyFavorites) {
             favBtn.style.backgroundColor = "var(--sidebar-highlight)"; 
             favBtn.style.color = "white";
          } else {
             favBtn.style.backgroundColor = ""; 
             favBtn.style.color = ""; 
          }
          
          // Recargar visualización
          displayPage(1, searchInput.value, current_data);
      });
  }
  // ------------------------------

  addEnterKeyListener(searchInput, search);

  if (lensButton) {
    lensButton.addEventListener("click", handleGoogleLensSearch);
  }

  if (clearButton) {
    searchInput.addEventListener("input", function () {
      clearButton.style.display = this.value ? "block" : "none";
    });

    clearButton.addEventListener("click", function () {
      searchInput.value = "";
      clearButton.style.display = "none";
      search(); 
    });
  }

  const autocompleteDropdown = document.createElement("div");
  autocompleteDropdown.id = "autocomplete-dropdown";
  autocompleteDropdown.className =
    "mt-3 absolute top-full left-0 right-0 bg-[var(--popup-bg)] border border-gray-600 rounded-[var(--border-radius)] max-h-72 overflow-y-auto z-50 shadow-lg hidden";

  searchContainer.classList.add("relative");
  searchContainer.appendChild(autocompleteDropdown);

  searchInput.addEventListener("input", function (e) {
    handleAutocomplete(e.target.value);
  });

  document.addEventListener("click", function (e) {
    if (!searchContainer.contains(e.target)) {
      autocompleteDropdown.classList.add("hidden");
    }
  });

  searchInput.addEventListener("keydown", function (e) {
    const dropdown = document.getElementById("autocomplete-dropdown");
    if (dropdown.classList.contains("hidden")) return;

    const suggestions = dropdown.querySelectorAll(".autocomplete-suggestion");
    let activeIndex = -1;

    suggestions.forEach((suggestion, index) => {
      if (suggestion.classList.contains("bg-[var(--button-hover)]")) {
        activeIndex = index;
      }
    });

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
        setActiveSuggestion(activeIndex);
        break;

      case "ArrowUp":
        e.preventDefault();
        activeIndex =
          (activeIndex - 1 + suggestions.length) % suggestions.length;
        setActiveSuggestion(activeIndex);
        break;

      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          suggestions[activeIndex].click();
        }
        break;

      case "Escape":
        dropdown.classList.add("hidden");
        break;
    }
  });
});

function handleGoogleLensSearch() {
  const cardImage = document.getElementById("cardimage");
  if (!cardImage || !cardImage.src) return;

  const googleLensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(cardImage.src)}`;
  window.open(googleLensUrl, "_blank");
}